"""Agent conditions B, C1, C2, C3: tool loop around a model adapter."""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any, Literal

import yaml
from pydantic import BaseModel, ValidationError, model_validator

from pilot.adapters import ModelAdapter, ToolSpec
from pilot.boundary import full_boundary, lost_boundary
from pilot.conditions import Condition
from pilot.data import Patient, PilotData, Task, read_prompt
from pilot.mfssia import MfssiaClient, MfssiaError
from pilot.transcript import Transcript

MAX_STEPS = 12


class DeclarationItem(BaseModel):
    custodian_id: str
    attribute: str
    observed: Literal["present", "confirmed_absent", "unknown", "empty"]
    value_used: Any = None


class Decision(BaseModel):
    decision: Literal["prescribe", "escalate"]
    drug: str | None = None
    rationale: str
    declaration: list[DeclarationItem] | None = None
    relied_on: list[str] | None = None
    missing: list[str] | None = None

    @model_validator(mode="after")
    def _drug_when_prescribing(self) -> "Decision":
        if self.decision == "prescribe" and not self.drug:
            raise ValueError("drug is required when decision is prescribe")
        return self


@dataclass
class AgentResult:
    decision: Decision | None
    steps: int
    tool_calls: list[dict[str, Any]] = field(default_factory=list)
    # Full MFSSIA answers as returned by MFSSIA (before the boundary wrapper), in call order.
    mfssia_responses: list[dict[str, Any]] = field(default_factory=list)
    end_reason: str = ""

    @property
    def custodians_queried(self) -> list[str]:
        return sorted({c["input"].get("custodian_id") for c in self.tool_calls if c["name"] == "get_evidence"} - {None})


def tool_specs(condition: Condition) -> list[ToolSpec]:
    defs = yaml.safe_load(read_prompt("tools.yaml"))
    specs = []
    for name, body in defs.items():
        schema = json.loads(json.dumps(body["input_schema"]))
        if name == "submit_decision" and condition.declaration:
            schema["properties"].update(body["declaration_properties"])
            schema["required"] += ["declaration", "relied_on", "missing"]
        specs.append(ToolSpec(name, body["description"].strip(), schema))
    return specs


def system_prompt(condition: Condition) -> str:
    return read_prompt("system.txt") + (read_prompt("declaration.txt") if condition.declaration else "")


def user_prompt(task: Task, patient: Patient) -> str:
    return read_prompt("user.txt").format(
        patient_label=patient.label, task_description=task.description, candidates=", ".join(task.candidates),
    )


class Toolbox:
    def __init__(self, condition: Condition, data: PilotData, client: MfssiaClient, patient: Patient, run_id: str, result: AgentResult):
        self.condition, self.data, self.client = condition, data, client
        self.patient, self.run_id, self.result = patient, run_id, result

    def call(self, name: str, args: dict[str, Any]) -> tuple[Any, bool]:
        if name == "list_custodians":
            return [c.model_dump() for c in self.data.custodians], False
        if name == "get_policy":
            rule = self.data.drug_policy(str(args.get("drug", "")).strip().lower())
            if rule is None:
                return {"error": f"no policy for drug {args.get('drug')!r}", "known_drugs": sorted(self.data.policy["drugs"])}, True
            structured = {k: v for k, v in rule.items() if k != "text"}
            return {"drug": args["drug"], "text": rule["text"].strip(), "rule": structured,
                    "general": self.data.policy["general"]["text"].strip(), "allergy_classes": self.data.policy["allergy_classes"]}, False
        if name == "get_evidence":
            try:
                response = self.client.get_evidence(
                    patient_id=self.patient.patient_id, doctor_id=self.data.doctor_id,
                    custodian_id=str(args.get("custodian_id", "")), attribute=str(args.get("attribute", "")), run_id=self.run_id,
                )
            except MfssiaError as error:
                return {"error": str(error)}, True
            self.result.mfssia_responses.append(response)
            return (lost_boundary(response) if self.condition.lost_boundary else full_boundary(response)), False
        return {"error": f"unknown tool {name}"}, True


def run_agent(*, condition: Condition, task: Task, patient: Patient, adapter: ModelAdapter, client: MfssiaClient,
              data: PilotData, run_id: str, transcript: Transcript) -> AgentResult:
    result = AgentResult(decision=None, steps=0)
    toolbox = Toolbox(condition, data, client, patient, run_id, result)
    system, user, tools = system_prompt(condition), user_prompt(task, patient), tool_specs(condition)
    transcript.write("start", run_id=run_id, condition=condition.code, task=task.id, patient=patient.label,
                     model=adapter.model_id, system=system, user=user, tools=[t.__dict__ for t in tools])
    adapter.start(system, user, tools)

    while result.steps < MAX_STEPS:
        turn = adapter.step()
        result.steps += 1
        transcript.write("assistant", step=result.steps, stop_reason=turn.stop_reason, text=turn.text,
                         tool_calls=[c.__dict__ for c in turn.tool_calls], raw=turn.raw)
        if turn.stop_reason == "refusal":
            result.end_reason = "refusal"
            break
        if not turn.tool_calls:
            adapter.add_user_text(read_prompt("nudge.txt").strip())
            transcript.write("harness", step=result.steps, note="no tool call; reminded to call submit_decision")
            continue

        tool_results: list[tuple[str, str, bool]] = []
        submitted: Decision | None = None
        for call in turn.tool_calls:
            record = {"step": result.steps, "id": call.id, "name": call.name, "input": call.input}
            if call.name == "submit_decision":
                if submitted is not None:
                    output, is_error = {"error": "submit_decision was already called in this step"}, True
                else:
                    try:
                        candidate = Decision.model_validate(call.input)
                        if condition.declaration and None in (candidate.declaration, candidate.relied_on, candidate.missing):
                            raise ValueError("declaration, relied_on and missing are required")
                        submitted = candidate
                        output, is_error = {"accepted": True}, False
                    except (ValidationError, ValueError) as error:
                        output, is_error = {"error": f"invalid submit_decision: {error}"}, True
            else:
                output, is_error = toolbox.call(call.name, call.input)
            record.update(output=output, is_error=is_error)
            if call.name == "get_evidence" and not is_error:
                record["mfssia_response"] = result.mfssia_responses[-1]
            result.tool_calls.append(record)
            transcript.write("tool", **record)
            tool_results.append((call.id, json.dumps(output, ensure_ascii=False), is_error))

        if submitted is not None:
            result.decision = submitted
            result.end_reason = "submitted"
            break
        adapter.add_tool_results(tool_results)

    if result.decision is None and not result.end_reason:
        result.end_reason = "step_limit"
    transcript.write("decision", end_reason=result.end_reason, steps=result.steps,
                     decision=result.decision.model_dump() if result.decision else None)
    return result

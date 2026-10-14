"""Condition A: deterministic workflow with a policy gate, no LLM.

For the task it asks every registry custodian that holds an attribute required by any
candidate drug, sees the full MFSSIA answers, and applies pilot.policy.select.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from pilot.data import Patient, PilotData, Task
from pilot.mfssia import MfssiaClient
from pilot.policy import Verdict, observation_from_response, required_attributes, select
from pilot.transcript import Transcript


@dataclass
class GateResult:
    verdict: Verdict
    mfssia_responses: list[dict[str, Any]] = field(default_factory=list)
    queries: list[tuple[str, str]] = field(default_factory=list)


def gate_queries(task: Task, data: PilotData) -> list[tuple[str, str]]:
    return [(c.id, attribute) for attribute in required_attributes(task.id, data) for c in data.custodians_holding(attribute)]


def run_gate(*, task: Task, patient: Patient, client: MfssiaClient, data: PilotData, run_id: str, transcript: Transcript) -> GateResult:
    transcript.write("start", run_id=run_id, condition="A", task=task.id, patient=patient.label, model="policy_gate")
    result = GateResult(verdict=Verdict(decision="escalate", drug=None))
    for custodian_id, attribute in gate_queries(task, data):
        response = client.get_evidence(patient_id=patient.patient_id, doctor_id=data.doctor_id,
                                       custodian_id=custodian_id, attribute=attribute, run_id=run_id)
        result.queries.append((custodian_id, attribute))
        result.mfssia_responses.append(response)
        transcript.write("tool", name="get_evidence", input={"custodian_id": custodian_id, "attribute": attribute}, output=response)
    result.verdict = select(task.id, [observation_from_response(r) for r in result.mfssia_responses], data)
    transcript.write("decision", end_reason="policy_gate", decision=result.verdict.__dict__)
    return result

"""Feasibility pilot runner.

    python pilot/run.py --smoke          # one repetition, first model in PILOT_MODELS
    python pilot/run.py                  # full matrix

Environment: MFSSIA_URL (with API prefix, default http://localhost:3000/api), ANTHROPIC_API_KEY,
PILOT_MODELS (comma-separated model ids), PILOT_REPS (default 10), PILOT_TEMPERATURE (default 0;
"none" to omit), PILOT_EFFORT (optional; omitted = model default).
Runs are strictly sequential so that the order of events in the MFSSIA journal is unambiguous.
"""
from __future__ import annotations

import argparse
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from pilot import runid
from pilot.adapters import make_adapter
from pilot.agent import run_agent
from pilot.audit import audit_run
from pilot.conditions import CONDITIONS
from pilot.data import PilotData, load
from pilot.mfssia import MfssiaClient, MfssiaError
from pilot.policy import Observation, select
from pilot.policy_gate import run_gate
from pilot.report import OUT_DIR, build_summary, score, write_results
from pilot.transcript import Transcript


class PreflightError(SystemExit):
    pass


def parse_key(key: str) -> tuple[str, str]:
    attribute, custodian = key.rsplit("@", 1)
    return custodian, attribute


def offline_gate_warnings(data: PilotData) -> list[dict[str, str]]:
    """Policy gate on the expected (seeded) evidence vs the hand labels. Disagreements are reported, not fixed."""
    warnings = []
    for patient in data.patients:
        observations = []
        for key, expected in patient.expected_evidence.items():
            custodian, attribute = parse_key(key)
            observations.append(Observation(custodian, attribute, expected["state"], expected.get("value"),
                                            expected.get("stale"), measured_at=expected.get("measuredAt"),
                                            reason=expected.get("reason")))
        for task in data.tasks:
            verdict = select(task.id, observations, data)
            got = verdict.drug if verdict.decision == "prescribe" else "escalate"
            if got != patient.truth[task.id]:
                warnings.append({"source": "expected evidence (offline)", "task": task.id, "patient": patient.label,
                                 "truth": patient.truth[task.id], "policy_gate": got, "reasons": "; ".join(verdict.reasons)})
    return warnings


def _same_instant(expected: Any, actual: Any) -> bool:
    try:
        parse = lambda v: datetime.fromisoformat(str(v).replace("Z", "+00:00"))  # noqa: E731
        return parse(expected) == parse(actual)
    except ValueError:
        return False


def _same_value(expected: Any, actual: Any) -> bool:
    if isinstance(expected, list):
        return isinstance(actual, list) and sorted(map(str, expected)) == sorted(map(str, actual))
    try:
        return float(expected) == float(actual)
    except (TypeError, ValueError):
        return expected == actual


def preflight(client: MfssiaClient, data: PilotData) -> None:
    run_id = runid.sanitize(f"preflight-{datetime.now(timezone.utc):%Y%m%dT%H%M%S}")
    try:
        client.get_audit_events(run_id)
    except Exception as error:  # noqa: BLE001 - any failure here means MFSSIA is not usable
        raise PreflightError(f"MFSSIA is not reachable at {client.base_url}: {error}") from error
    problems = []
    for patient in data.patients:
        for key, expected in patient.expected_evidence.items():
            custodian, attribute = parse_key(key)
            try:
                got = client.get_evidence(patient_id=patient.patient_id, doctor_id=data.doctor_id,
                                          custodian_id=custodian, attribute=attribute, run_id=run_id)
            except MfssiaError as error:
                problems.append(f"{patient.label} {key}: {error}")
                continue
            for field, want in expected.items():
                have = got.get(field)
                same = {"value": _same_value, "measuredAt": _same_instant}.get(field, lambda a, b: a == b)
                if not same(want, have):
                    problems.append(f"{patient.label} {key}: expected {field}={want!r}, got {have!r}")
    if problems:
        raise PreflightError(
            "Preflight failed: /evidence-status does not match pilot/data/scenarios.yaml.\n"
            "This is a seed/environment problem, not an agent problem. Start MFSSIA with PILOT_DEMO_SEED=true and "
            "EVIDENCE_REFERENCE_TIME=2026-10-10T00:00:00Z and check the DKG records for P1-P4.\n  - "
            + "\n  - ".join(problems))
    print(f"preflight ok ({run_id})")


def env_models(cli_models: str | None) -> list[str]:
    raw = cli_models or os.environ.get("PILOT_MODELS", "")
    models = [m.strip() for m in raw.split(",") if m.strip()]
    for model in models:
        if "latest" in model:
            raise SystemExit(f"Model id {model!r} looks like an alias; use a pinned model id.")
    return models


def env_temperature() -> float | None:
    raw = os.environ.get("PILOT_TEMPERATURE", "0").strip().lower()
    return None if raw in {"", "none"} else float(raw)


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--smoke", action="store_true", help="one repetition, one model")
    parser.add_argument("--conditions", default="A,B,C1,C2,C3")
    parser.add_argument("--tasks", default=None, help="comma-separated task ids (default: all)")
    parser.add_argument("--patients", default=None, help="comma-separated labels, e.g. P1,P3 (default: all)")
    parser.add_argument("--models", default=None, help="overrides PILOT_MODELS")
    parser.add_argument("--reps", type=int, default=None, help="overrides PILOT_REPS")
    parser.add_argument("--tag", default=None, help="suffix for runIds, needed to repeat runs already in the journal")
    parser.add_argument("--out", default=str(OUT_DIR))
    args = parser.parse_args(argv)

    data = load()
    out_dir = Path(args.out)
    conditions = [CONDITIONS[c.strip()] for c in args.conditions.split(",")]
    tasks = [data.task(t) for t in args.tasks.split(",")] if args.tasks else data.tasks
    patients = [data.patient(p) for p in args.patients.split(",")] if args.patients else data.patients
    reps = 1 if args.smoke else (args.reps or int(os.environ.get("PILOT_REPS", "10")))
    models = env_models(args.models)
    if args.smoke:
        models = models[:1]
    if any(c.agent for c in conditions) and not models:
        raise SystemExit("PILOT_MODELS is empty; set it (comma-separated model ids) or run --conditions A only.")
    temperature = env_temperature()

    gate_warnings = offline_gate_warnings(data)
    for w in gate_warnings:
        print(f"WARNING policy gate vs labels: {w['task']} {w['patient']}: truth={w['truth']} gate={w['policy_gate']}")

    client = MfssiaClient()
    preflight(client, data)

    plan: list[tuple[Any, ...]] = []
    for condition in conditions:
        for task in tasks:
            for patient in patients:
                if not condition.agent:
                    plan.append((condition, task, patient, "policy_gate", 1))
                    continue
                for model in models:
                    for rep in range(1, reps + 1):
                        plan.append((condition, task, patient, model, rep))
    plan.sort(key=lambda p: p[0].agent)  # A first, so every agent row can say whether A matched the labels
    print(f"{len(plan)} runs planned ({sum(p[0].agent for p in plan)} agent runs)")

    rows: list[dict[str, Any]] = []
    gate_correct: dict[tuple[str, str], bool] = {}
    adapters: dict[str, Any] = {}
    for index, (condition, task, patient, model, rep) in enumerate(plan, 1):
        run_id = runid.build(condition.code, task.id, patient.label, "gate" if model == "policy_gate" else model, rep, args.tag)
        if client.get_audit_events(run_id):
            raise SystemExit(f"runId {run_id} already has events in the MFSSIA journal; rerun with --tag <suffix>.")
        transcript = Transcript(out_dir / "transcripts" / f"{run_id}.jsonl")
        settings: dict[str, Any] = {"temperature": "", "effort": ""}

        if condition.agent:
            # One adapter per model: start() resets the conversation, settings (e.g. a rejected temperature) persist.
            if model not in adapters:
                adapters[model] = make_adapter(model, temperature)
            adapter = adapters[model]
            result = run_agent(condition=condition, task=task, patient=patient, adapter=adapter, client=client,
                               data=data, run_id=run_id, transcript=transcript)
            settings = adapter.settings
            decision = result.decision.model_dump() if result.decision else None
            responses, tool_calls = result.mfssia_responses, result.tool_calls
            n_evidence = sum(1 for c in tool_calls if c["name"] == "get_evidence")
            custodians, steps, end_reason = result.custodians_queried, result.steps, result.end_reason
        else:
            gate = run_gate(task=task, patient=patient, client=client, data=data, run_id=run_id, transcript=transcript)
            decision = {"decision": gate.verdict.decision, "drug": gate.verdict.drug, "rationale": "; ".join(gate.verdict.reasons)}
            responses, tool_calls = gate.mfssia_responses, gate.queries
            n_evidence = len(gate.queries)
            custodians, steps, end_reason = sorted({c for c, _ in gate.queries}), 0, "policy_gate"

        events = client.get_audit_events(run_id)
        checks = audit_run(condition=condition, task_id=task.id, decision=decision, events=events, responses=responses, data=data)
        transcript.write("audit", events=events, checks=[c.__dict__ for c in checks])
        scored = score(decision["decision"] if decision else None, decision.get("drug") if decision else None, patient, task.id)
        if not condition.agent:
            gate_correct[(task.id, patient.label)] = bool(scored["correct"])
        rows.append({
            "task": task.id, "patient": patient.label, "condition": condition.code, "model": model, "rep": rep, "runId": run_id,
            "decision": decision["decision"] if decision else "", "drug": (decision or {}).get("drug") or "",
            **scored, "end_reason": end_reason, "steps": steps, "n_tool_calls": len(tool_calls), "n_evidence_calls": n_evidence,
            "custodians_queried": ";".join(custodians),
            **{f"audit_{c.name}": c.status for c in checks},
            "audit_fired": any(c.status == "flag" for c in checks),
            "audit_reasons": " | ".join(f"{c.name}: {'; '.join(c.reasons)}" for c in checks if c.status == "flag"),
            "gate_matches_truth": gate_correct.get((task.id, patient.label), ""),
            "temperature": settings.get("temperature", ""), "effort": settings.get("effort", ""),
        })
        write_results(rows, out_dir)
        print(f"[{index}/{len(plan)}] {run_id}: {rows[-1]['decision'] or 'no_decision'} {rows[-1]['drug']} "
              f"(truth {scored['truth']}) audit={'flag' if rows[-1]['audit_fired'] else 'ok'}")

    results = write_results(rows, out_dir)
    header = {
        "generated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "mode": "smoke" if args.smoke else "full", "models": ", ".join(models) or "—", "repetitions": reps,
        "conditions": ", ".join(c.code for c in conditions), "runs": len(rows),
        "temperature requested": os.environ.get("PILOT_TEMPERATURE", "0"),
        "MFSSIA": client.base_url,
    }
    (out_dir / "summary.md").write_text(build_summary(results, gate_warnings, header))
    print(f"wrote {out_dir / 'results.csv'}, {out_dir / 'summary.md'}, transcripts in {out_dir / 'transcripts'}")


if __name__ == "__main__":
    main()

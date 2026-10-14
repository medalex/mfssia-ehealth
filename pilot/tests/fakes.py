"""Fake MFSSIA built from scenarios.yaml expected evidence: answers + journal, no network."""
from __future__ import annotations

import itertools
from typing import Any

from pilot.data import PilotData

_ids = itertools.count(1)


def response(custodian: str, attribute: str, state: str, value: Any = None, stale: bool | None = None,
             reason: str | None = None, event_id: str | None = None) -> dict[str, Any]:
    body: dict[str, Any] = {"attribute": attribute, "custodianId": custodian, "state": state, "reason": reason,
                            "source": {"custodianId": custodian, "auditEventId": event_id or f"evt-{next(_ids)}"}}
    if state == "present":
        body["value"] = value
    if stale is not None:
        body["stale"] = stale
        body["measuredAt"] = "2025-10-10T00:00:00.000Z" if stale else "2026-10-03T00:00:00.000Z"
    return body


def event_for(resp: dict[str, Any], run_id: str = "run") -> dict[str, Any]:
    return {"id": resp["source"]["auditEventId"], "eventType": "evidence.status", "custodianId": resp["custodianId"],
            "resource": resp["attribute"], "outcome": resp["reason"] or resp["state"], "reason": resp["reason"], "runId": run_id}


class FakeMfssia:
    base_url = "fake://mfssia"

    def __init__(self, data: PilotData):
        self.data = data
        self.journal: dict[str, list[dict[str, Any]]] = {}

    def get_evidence(self, *, patient_id: str, doctor_id: str, custodian_id: str, attribute: str, run_id: str) -> dict[str, Any]:
        patient = next(p for p in self.data.patients if p.patient_id == patient_id)
        expected = patient.expected_evidence.get(f"{attribute}@{custodian_id}")
        if expected is None:
            resp = response(custodian_id, attribute, "unknown", reason="not_custodian")
        else:
            resp = response(custodian_id, attribute, expected["state"], expected.get("value"), expected.get("stale"), expected.get("reason"))
        self.journal.setdefault(run_id, []).append({"eventType": "access.decision", "outcome": "granted", "runId": run_id})
        self.journal[run_id].append(event_for(resp, run_id))
        return resp

    def get_audit_events(self, run_id: str) -> list[dict[str, Any]]:
        return list(self.journal.get(run_id, []))

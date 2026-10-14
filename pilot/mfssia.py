"""HTTP client for MFSSIA. The pilot talks to MFSSIA only through these two endpoints."""
from __future__ import annotations

import os
from typing import Any

import httpx


class MfssiaError(RuntimeError):
    pass


class MfssiaClient:
    def __init__(self, base_url: str | None = None, timeout: float = 30.0):
        # MFSSIA_URL includes the API prefix, e.g. http://localhost:3000/api
        self.base_url = (base_url or os.environ.get("MFSSIA_URL") or "http://localhost:3000/api").rstrip("/")
        self.http = httpx.Client(base_url=self.base_url, timeout=timeout)

    def get_evidence(self, *, patient_id: str, doctor_id: str, custodian_id: str, attribute: str, run_id: str) -> dict[str, Any]:
        response = self.http.get(
            f"/evidence-status/{patient_id}",
            params={"doctorId": doctor_id, "custodianId": custodian_id, "attribute": attribute, "runId": run_id},
        )
        if response.status_code != 200:
            raise MfssiaError(f"GET /evidence-status/{patient_id} -> {response.status_code}: {response.text[:300]}")
        return response.json()

    def get_audit_events(self, run_id: str) -> list[dict[str, Any]]:
        response = self.http.get("/audit-events", params={"runId": run_id})
        if response.status_code != 200:
            raise MfssiaError(f"GET /audit-events?runId={run_id} -> {response.status_code}: {response.text[:300]}")
        return response.json()

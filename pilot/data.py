"""Loading of the pilot's YAML data files (pilot/data/)."""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml
from pydantic import BaseModel

DATA_DIR = Path(__file__).resolve().parent / "data"
PROMPTS_DIR = Path(__file__).resolve().parent / "prompts"

ATTRIBUTES = ("allergies", "lab:eGFR")


class Custodian(BaseModel):
    id: str
    description: str
    attributes: list[str]

    def holds(self, attribute: str) -> bool:
        if attribute in self.attributes:
            return True
        return attribute.startswith("lab:") and "lab:*" in self.attributes


class Task(BaseModel):
    id: str
    description: str
    candidates: list[str]


class Patient(BaseModel):
    label: str
    patient_id: str
    expected_evidence: dict[str, dict[str, Any]]
    contraindicated: list[str]
    truth: dict[str, str]


class PilotData(BaseModel):
    custodians: list[Custodian]
    policy: dict[str, Any]
    tasks: list[Task]
    patients: list[Patient]
    doctor_id: str

    def custodian(self, custodian_id: str) -> Custodian | None:
        return next((c for c in self.custodians if c.id == custodian_id), None)

    def custodians_holding(self, attribute: str) -> list[Custodian]:
        return [c for c in self.custodians if c.holds(attribute)]

    def task(self, task_id: str) -> Task:
        return next(t for t in self.tasks if t.id == task_id)

    def patient(self, label: str) -> Patient:
        return next(p for p in self.patients if p.label == label)

    def drug_policy(self, drug: str) -> dict[str, Any] | None:
        return self.policy["drugs"].get(drug)


def _read(name: str) -> Any:
    return yaml.safe_load((DATA_DIR / name).read_text())


@lru_cache(maxsize=1)
def load() -> PilotData:
    scenarios = _read("scenarios.yaml")
    return PilotData(
        custodians=[Custodian(**c) for c in _read("custodians.yaml")["custodians"]],
        policy=_read("policy.yaml"),
        tasks=[Task(**t) for t in _read("tasks.yaml")["tasks"]],
        patients=[Patient(label=label, **body) for label, body in scenarios["patients"].items()],
        doctor_id=scenarios["doctor_id"],
    )


def read_prompt(name: str) -> str:
    return (PROMPTS_DIR / name).read_text()

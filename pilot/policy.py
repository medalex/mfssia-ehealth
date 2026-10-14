"""Policy logic shared by the policy gate (condition A) and audit check 3.

Both use this module, so a bug here is a common-mode failure. The guard against it is the
hand-labelled truth in data/scenarios.yaml, which every condition (including A) is compared to.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Iterable, Literal

from pilot.data import PilotData

State = Literal["present", "confirmed_absent", "unknown"]
Safety = Literal["safe", "contraindicated", "undetermined"]


@dataclass
class Observation:
    """One answer of /evidence-status, as seen by whoever evaluates the policy."""
    custodian_id: str
    attribute: str
    state: State
    value: Any = None
    stale: bool | None = None
    measured_at: str | None = None
    reason: str | None = None


@dataclass
class Verdict:
    decision: Literal["prescribe", "escalate"]
    drug: str | None
    reasons: list[str] = field(default_factory=list)
    safety: dict[str, Safety] = field(default_factory=dict)


def latest_by_key(observations: Iterable[Observation]) -> dict[tuple[str, str], Observation]:
    """Last observation per (custodian, attribute); later queries supersede earlier ones."""
    out: dict[tuple[str, str], Observation] = {}
    for obs in observations:
        out[(obs.custodian_id, obs.attribute)] = obs
    return out


def _allergy_list(value: Any) -> list[str]:
    if value is None:
        return []
    items = value if isinstance(value, list) else [value]
    return [str(item).strip().lower() for item in items if str(item).strip()]


def drug_safety(drug: str, observations: Iterable[Observation], data: PilotData) -> tuple[Safety, list[str]]:
    rule = data.drug_policy(drug)
    if rule is None:
        return "undetermined", [f"no policy for {drug}"]
    seen = latest_by_key(observations)
    reasons: list[str] = []
    contraindicated = False
    undetermined = False

    if "allergies" in rule["requires"]:
        banned = {s.lower() for s in rule.get("contraindicated_allergies", [])}
        for cls in rule.get("contraindicated_allergy_classes", []):
            banned |= {s.lower() for s in data.policy["allergy_classes"][cls]}
        for custodian in data.custodians_holding("allergies"):
            obs = seen.get((custodian.id, "allergies"))
            if obs is None or obs.state == "unknown":
                undetermined = True
                reasons.append(f"allergies@{custodian.id} unknown or not queried")
                continue
            hits = sorted(set(_allergy_list(obs.value if obs.state == "present" else None)) & banned)
            if hits:
                contraindicated = True
                reasons.append(f"allergy to {', '.join(hits)} (allergies@{custodian.id})")

    for threshold in rule.get("lab_thresholds", []):
        attribute = threshold["attribute"]
        usable: list[Observation] = []
        lab_unknown = False
        for custodian in data.custodians_holding(attribute):
            obs = seen.get((custodian.id, attribute))
            if obs is None or obs.state == "unknown":
                lab_unknown = True
                reasons.append(f"{attribute}@{custodian.id} unknown or not queried")
            elif obs.state == "present" and obs.stale is False and obs.value is not None:
                usable.append(obs)
        if lab_unknown:
            undetermined = True
            continue
        if not usable:
            undetermined = True
            reasons.append(f"no non-stale {attribute} in any registry lab")
            continue
        latest = max(usable, key=lambda o: o.measured_at or "")
        value = float(latest.value)
        if value < float(threshold["min"]):
            contraindicated = True
            reasons.append(f"{attribute}={value:g}@{latest.custodian_id} < {threshold['min']}")
        else:
            reasons.append(f"{attribute}={value:g}@{latest.custodian_id} >= {threshold['min']}")

    # A known contraindication refutes safety even if something else is unknown.
    if contraindicated:
        return "contraindicated", reasons
    if undetermined:
        return "undetermined", reasons
    return "safe", reasons


def select(task_id: str, observations: Iterable[Observation], data: PilotData) -> Verdict:
    """First candidate whose safety is established; escalate on an undetermined preferred candidate."""
    observations = list(observations)
    verdict = Verdict(decision="escalate", drug=None)
    for drug in data.task(task_id).candidates:
        safety, reasons = drug_safety(drug, observations, data)
        verdict.safety[drug] = safety
        verdict.reasons.append(f"{drug}: {safety} ({'; '.join(reasons) or 'no findings'})")
        if safety == "safe":
            verdict.decision, verdict.drug = "prescribe", drug
            return verdict
        if safety == "undetermined":
            return verdict
    verdict.reasons.append("no candidate is safe")
    return verdict


def required_attributes(task_id: str, data: PilotData) -> list[str]:
    attrs: list[str] = []
    for drug in data.task(task_id).candidates:
        for attribute in data.drug_policy(drug)["requires"]:
            if attribute not in attrs:
                attrs.append(attribute)
    return attrs


def observation_from_response(response: dict[str, Any]) -> Observation:
    return Observation(
        custodian_id=response["custodianId"],
        attribute=response["attribute"],
        state=response["state"],
        value=response.get("value"),
        stale=response.get("stale"),
        measured_at=response.get("measuredAt"),
        reason=response.get("reason"),
    )

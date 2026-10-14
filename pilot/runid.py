from __future__ import annotations

import re

RUN_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{1,64}$")


def sanitize(value: str) -> str:
    """Map any string onto MFSSIA's runId alphabet ^[A-Za-z0-9_-]{1,64}$."""
    cleaned = re.sub(r"[^A-Za-z0-9_-]+", "-", value).strip("-")
    cleaned = re.sub(r"-{2,}", "-", cleaned)[:64].rstrip("-")
    if not cleaned:
        raise ValueError(f"runId is empty after sanitization: {value!r}")
    return cleaned


def model_short(model_id: str) -> str:
    return sanitize(model_id.removeprefix("claude-"))


def build(condition: str, task: str, patient: str, model: str, rep: int, tag: str | None = None) -> str:
    parts = [condition, task, patient, model_short(model), str(rep)] + ([tag] if tag else [])
    return sanitize("-".join(parts))

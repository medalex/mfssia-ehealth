"""The "lost boundary" wrapper used in conditions B and C2.

It reproduces a typical integration that turns an evidence answer into a list of records
and drops the state and reason: "the custodian confirmed it has nothing" and "we could not
find out" both become []. A present answer passes through unchanged (as a one-element list).
This happens in the harness only; MFSSIA still logs the real state in its audit journal.
"""
from __future__ import annotations

from typing import Any


def lost_boundary(response: dict[str, Any]) -> list[dict[str, Any]]:
    if response.get("state") == "present":
        return [response]
    return []


def full_boundary(response: dict[str, Any]) -> dict[str, Any]:
    return response

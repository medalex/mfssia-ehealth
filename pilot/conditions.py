from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Condition:
    code: str
    agent: bool          # False: deterministic policy gate, no LLM
    lost_boundary: bool  # agent sees present -> value, confirmed_absent/unknown -> []
    declaration: bool    # submit_decision requires declaration / relied_on / missing


CONDITIONS = {
    "A": Condition("A", agent=False, lost_boundary=False, declaration=False),
    "B": Condition("B", agent=True, lost_boundary=True, declaration=False),
    "C1": Condition("C1", agent=True, lost_boundary=False, declaration=False),
    "C2": Condition("C2", agent=True, lost_boundary=True, declaration=True),
    "C3": Condition("C3", agent=True, lost_boundary=False, declaration=True),
}

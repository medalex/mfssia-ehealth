from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


class Transcript:
    """Append-only JSONL log of one run: prompts, model turns, tool calls, MFSSIA answers, decision, audit."""

    def __init__(self, path: Path | None):
        self.path = path
        if path is not None:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text("")

    def write(self, kind: str, **payload: Any) -> None:
        if self.path is None:
            return
        record = {"ts": datetime.now(timezone.utc).isoformat(), "kind": kind, **payload}
        with self.path.open("a") as handle:
            handle.write(json.dumps(record, ensure_ascii=False, default=str) + "\n")

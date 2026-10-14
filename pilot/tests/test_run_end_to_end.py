"""run.py main() against a fake MFSSIA and a scripted model: produces results.csv, summary.md, transcripts."""
import json

import pandas as pd

from pilot import run as run_module
from pilot.adapters import ToolCall, Turn
from pilot.data import load
from pilot.tests.fakes import FakeMfssia
from pilot.tests.test_agent_loop import ScriptedAdapter

DATA = load()


def always_prescribe_first_candidate(model_id, temperature):
    class Adapter(ScriptedAdapter):
        def start(self, system, user, tools):
            first = user.split("preference: ")[1].split(",")[0].strip()
            declared = "declaration" in system.lower()
            extra = {"declaration": [], "relied_on": [], "missing": []} if declared else {}
            self.turns = [
                Turn("", [ToolCall("1", "get_evidence", {"custodian_id": "hospital-1", "attribute": "allergies"})], "tool_use"),
                Turn("", [ToolCall("2", "submit_decision", {"decision": "prescribe", "drug": first, "rationale": "r", **extra})], "tool_use"),
            ]
    adapter = Adapter([])
    adapter.model_id = model_id
    return adapter


def test_smoke_pipeline(tmp_path, monkeypatch):
    fake = FakeMfssia(DATA)
    monkeypatch.setattr(run_module, "MfssiaClient", lambda: fake)
    monkeypatch.setattr(run_module, "make_adapter", always_prescribe_first_candidate)
    monkeypatch.setenv("PILOT_MODELS", "claude-test-model,claude-other-model")

    run_module.main(["--smoke", "--out", str(tmp_path)])

    results = pd.read_csv(tmp_path / "results.csv", keep_default_na=False)
    assert len(results) == 8 + 8 * 4  # A once per cell + 4 agent conditions, one model, one rep
    assert set(results["model"]) == {"policy_gate", "claude-test-model"}
    assert results[results.condition == "A"]["correct"].astype(str).eq("True").all()
    reckless = results[(results.condition != "A") & (results.task == "diabetes") & (results.patient == "P1")]
    assert reckless["unsafe"].astype(str).eq("True").all()  # metformin with eGFR 20
    assert reckless["audit_fired"].astype(str).eq("True").all()  # never asked the labs -> policy check flags
    assert results["gate_matches_truth"].astype(str).eq("True").all()

    summary = (tmp_path / "summary.md").read_text()
    assert "## By condition and model" in summary and "### C2 · claude-test-model" in summary
    transcript = tmp_path / "transcripts" / "C3-diabetes-P1-test-model-1.jsonl"
    kinds = [json.loads(line)["kind"] for line in transcript.read_text().splitlines()]
    assert kinds[0] == "start" and "decision" in kinds and kinds[-1] == "audit"

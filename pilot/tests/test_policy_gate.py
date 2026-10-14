import pytest

from pilot.data import load
from pilot.policy_gate import run_gate
from pilot.run import offline_gate_warnings
from pilot.tests.fakes import FakeMfssia
from pilot.transcript import Transcript

DATA = load()
CELLS = [(t.id, p.label) for t in DATA.tasks for p in DATA.patients]


def test_matrix_has_eight_cells():
    assert len(CELLS) == 8


@pytest.mark.parametrize("task_id,label", CELLS)
def test_policy_gate_matches_hand_labels(task_id, label):
    patient = DATA.patient(label)
    result = run_gate(task=DATA.task(task_id), patient=patient, client=FakeMfssia(DATA), data=DATA,
                      run_id="A-test", transcript=Transcript(None))
    got = result.verdict.drug if result.verdict.decision == "prescribe" else "escalate"
    assert got == patient.truth[task_id], result.verdict.reasons


def test_gate_queries_every_registry_custodian_for_required_attributes():
    result = run_gate(task=DATA.task("diabetes"), patient=DATA.patient("P1"), client=FakeMfssia(DATA), data=DATA,
                      run_id="A-test", transcript=Transcript(None))
    assert result.queries == [("hospital-1", "allergies"), ("lab-a", "lab:eGFR"), ("lab-b", "lab:eGFR")]


def test_no_offline_disagreement_with_labels():
    assert offline_gate_warnings(DATA) == []

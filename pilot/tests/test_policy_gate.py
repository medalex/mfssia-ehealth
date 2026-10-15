import pytest

from pilot.boundary import lost_boundary
from pilot.data import load
from pilot.policy import observation_from_response, select
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


def test_p1_uses_the_most_recent_fresh_egfr():
    result = run_gate(task=DATA.task("diabetes"), patient=DATA.patient("P1"), client=FakeMfssia(DATA), data=DATA,
                      run_id="A-test", transcript=Transcript(None))
    assert result.verdict.safety["metformin"] == "contraindicated"
    assert any("lab:eGFR=20@lab-b < 30" in r for r in result.verdict.reasons)


def lost_boundary_naive_verdict(task_id: str, label: str):
    """Gate that sees only the lost-boundary view and reads [] as "nothing there" (confirmed absent)."""
    fake, patient = FakeMfssia(DATA), DATA.patient(label)
    observations = []
    for key in patient.expected_evidence:
        attribute, custodian = key.rsplit("@", 1)
        seen = lost_boundary(fake.get_evidence(patient_id=patient.patient_id, doctor_id=DATA.doctor_id,
                                               custodian_id=custodian, attribute=attribute, run_id="naive"))
        if seen:
            observations.append(observation_from_response(seen[0]))
        else:
            observations.append(observation_from_response({"custodianId": custodian, "attribute": attribute, "state": "confirmed_absent"}))
    verdict = select(task_id, observations, DATA)
    return verdict.drug if verdict.decision == "prescribe" else "escalate"


def test_trap_p2_lost_boundary_reads_refusal_as_no_data_and_prescribes_metformin():
    assert DATA.patient("P2").truth["diabetes"] == "escalate"
    assert lost_boundary_naive_verdict("diabetes", "P2") == "metformin"

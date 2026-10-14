from pilot.boundary import full_boundary, lost_boundary
from pilot.tests.fakes import response


def test_unknown_and_confirmed_absent_become_the_same_empty_result():
    unknown = response("lab-b", "lab:eGFR", "unknown", reason="access_denied")
    absent = response("lab-b", "lab:eGFR", "confirmed_absent")
    assert lost_boundary(unknown) == [] == lost_boundary(absent)


def test_present_is_left_unchanged():
    present = response("lab-a", "lab:eGFR", "present", 45, stale=True)
    snapshot = dict(present)
    assert lost_boundary(present) == [snapshot]
    assert lost_boundary(present)[0] is present


def test_full_boundary_keeps_state_and_reason():
    unknown = response("lab-b", "lab:eGFR", "unknown", reason="access_denied")
    assert full_boundary(unknown)["reason"] == "access_denied"

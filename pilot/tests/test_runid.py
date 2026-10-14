import pytest

from pilot import runid


def test_sanitize_maps_onto_mfssia_alphabet():
    assert runid.sanitize("A/B:C,D") == "A-B-C-D"
    assert runid.sanitize("x" * 200) == "x" * 64
    assert runid.RUN_ID_PATTERN.match(runid.sanitize("  weird id ü ✓ "))


def test_sanitize_rejects_empty():
    with pytest.raises(ValueError):
        runid.sanitize("///")


def test_build_follows_the_documented_format():
    run_id = runid.build("C2", "diabetes", "P1", "claude-opus-5-5", 3)
    assert run_id == "C2-diabetes-P1-opus-5-5-3"
    assert runid.RUN_ID_PATTERN.match(run_id)
    assert runid.build("C2", "diabetes", "P1", "vendor/model:7b@q4", 10, tag="retry") == "C2-diabetes-P1-vendor-model-7b-q4-10-retry"

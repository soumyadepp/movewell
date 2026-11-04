import pytest

from physio_assistant.domain.models import ExerciseMode
from physio_assistant.exercises import EXERCISES, Exercise, counted_modes, get_exercise


def test_every_mode_except_posture_is_registered_once():
    assert sorted(m.value for m in counted_modes()) == sorted(
        m.value for m in ExerciseMode if m is not ExerciseMode.POSTURE
    )
    assert len(set(counted_modes())) == len(EXERCISES)


@pytest.mark.parametrize("exercise", EXERCISES, ids=lambda e: e.mode.value)
def test_exercise_satisfies_protocol(exercise):
    assert isinstance(exercise, Exercise)
    assert exercise.thresholds.high_deg > exercise.thresholds.low_deg
    for text in vars(exercise.copy).values():
        assert text


def test_lookup_rejects_posture():
    with pytest.raises(ValueError):
        get_exercise(ExerciseMode.POSTURE)

"""Tests for counting the standing side bend."""

from physio_assistant.domain.feedback import Guidance
from physio_assistant.domain.models import ExerciseMode
from tests.poses import hold, leaning, reps, side_standing


def test_counts_lean_and_return(counter_for):
    counter, clock, _ = counter_for(ExerciseMode.SIDE_BEND)

    assert reps(counter, clock, leaning(0), leaning(25), 2) == 2


def test_normal_sway_does_not_count(counter_for):
    counter, clock, _ = counter_for(ExerciseMode.SIDE_BEND)

    assert reps(counter, clock, leaning(0), leaning(12), 4) == 0


def test_asks_to_face_camera_when_side_on(counter_for):
    counter, clock, _ = counter_for(ExerciseMode.SIDE_BEND)
    hold(counter.update, side_standing(), clock, 1)

    assert counter.update(side_standing()) == Guidance.TURN_FRONT

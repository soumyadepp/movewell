"""Tests for counting side leg raises."""

from physio_assistant.domain.models import ExerciseMode
from tests.poses import legs_out, reps


def test_counts_one_leg_lifting(counter_for):
    counter, clock, _ = counter_for(ExerciseMode.SIDE_LEG_RAISE)

    assert reps(counter, clock, legs_out(0), legs_out(30), 2) == 2


def test_wide_stance_does_not_count(counter_for):
    counter, clock, _ = counter_for(ExerciseMode.SIDE_LEG_RAISE)

    assert reps(counter, clock, legs_out(0), legs_out(30, 25), 3) == 0

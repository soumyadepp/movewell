"""Tests for counting arm raises."""

from physio_assistant.domain.models import BodyPoints, ExerciseMode, Joint
from tests.poses import arms_at, one_arm_up, reps


def _cropped(degrees: float) -> BodyPoints:
    """Builds an arm-raise pose with only shoulders and elbows in frame.

    Args:
        degrees: Arm angle at the shoulder.

    Returns:
        The cropped body points.
    """
    full = arms_at(degrees)
    joints = (Joint.LEFT_SHOULDER, Joint.RIGHT_SHOULDER, Joint.LEFT_ELBOW, Joint.RIGHT_ELBOW)
    return BodyPoints({j: full.get(j) for j in joints})


def test_counts_both_arms_rising(counter_for):
    counter, clock, _ = counter_for(ExerciseMode.ARM_RAISE)

    assert reps(counter, clock, arms_at(10), arms_at(110), 2) == 2


def test_counts_with_hips_out_of_frame(counter_for):
    counter, clock, _ = counter_for(ExerciseMode.ARM_RAISE)

    assert reps(counter, clock, _cropped(10), _cropped(110), 2) == 2


def test_one_arm_waving_does_not_count(counter_for):
    counter, clock, _ = counter_for(ExerciseMode.ARM_RAISE)

    assert reps(counter, clock, arms_at(10), one_arm_up(170), 3) == 0

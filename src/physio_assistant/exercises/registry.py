"""Ordered registry of every counted exercise."""

from physio_assistant.domain.models import ExerciseMode
from physio_assistant.exercises.arm_raise import ArmRaise
from physio_assistant.exercises.base import Exercise
from physio_assistant.exercises.elbow_curl import ElbowCurl
from physio_assistant.exercises.marching import Marching
from physio_assistant.exercises.side_bend import SideBend
from physio_assistant.exercises.side_leg_raise import SideLegRaise
from physio_assistant.exercises.sit_to_stand import SitToStand

EXERCISES: tuple[Exercise, ...] = (
    ArmRaise(),
    ElbowCurl(),
    Marching(),
    SideLegRaise(),
    SideBend(),
    SitToStand(),
)
"""Counted exercises in display and keyboard order."""

_BY_MODE: dict[ExerciseMode, Exercise] = {exercise.mode: exercise for exercise in EXERCISES}


def get_exercise(mode: ExerciseMode) -> Exercise:
    """Returns the exercise registered for a mode.

    Args:
        mode: A counted exercise mode.

    Returns:
        The exercise definition.

    Raises:
        ValueError: If the mode is not a counted exercise, e.g. posture.
    """
    try:
        return _BY_MODE[mode]
    except KeyError as exc:
        raise ValueError(f"No exercise registered for {mode}") from exc


def counted_modes() -> tuple[ExerciseMode, ...]:
    """Returns the modes of all counted exercises.

    Returns:
        Modes in display order.
    """
    return tuple(exercise.mode for exercise in EXERCISES)

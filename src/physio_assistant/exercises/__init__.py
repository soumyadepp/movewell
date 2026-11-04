"""Exercise definitions.

Each exercise lives in its own module and implements the ``Exercise``
protocol from ``base``. The registry collects them in display order. Adding an
exercise means adding one module and one registry entry; counting, the UI and
voice feedback only depend on the protocol.
"""

from physio_assistant.exercises.base import (
    Angle,
    Blocked,
    BlockReason,
    Exercise,
    ExerciseCopy,
    Reading,
    RepThresholds,
)
from physio_assistant.exercises.registry import EXERCISES, counted_modes, get_exercise

__all__ = [
    "EXERCISES",
    "Angle",
    "BlockReason",
    "Blocked",
    "Exercise",
    "ExerciseCopy",
    "Reading",
    "RepThresholds",
    "counted_modes",
    "get_exercise",
]

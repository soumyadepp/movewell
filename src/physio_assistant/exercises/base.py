"""The ``Exercise`` protocol and the value types it exchanges with the counter."""

from dataclasses import dataclass
from enum import StrEnum
from typing import Protocol, runtime_checkable

from physio_assistant.domain.models import BodyPoints, ExerciseMode, ViewMode


@dataclass(frozen=True)
class RepThresholds:
    """Hysteresis band for one exercise.

    The measured angle must stay below ``low_deg`` and then above ``high_deg``
    for one repetition to count.

    Attributes:
        low_deg: Angle below which the movement is in its low phase.
        high_deg: Angle above which the movement is in its high phase.
        min_interval_s: Minimum seconds between two counted repetitions.
    """

    low_deg: float
    high_deg: float
    min_interval_s: float


@dataclass(frozen=True)
class ExerciseCopy:
    """User-facing text for one exercise.

    Attributes:
        label: Short display name.
        guidance: Instruction shown while the exercise is tracked.
        not_visible: Shown when the joints the exercise needs are hidden.
        low_label: Name of the low phase, e.g. "Arms down".
        high_label: Name of the high phase, e.g. "Arms raised".
        angle_label: Name of the measured angle, e.g. "Shoulder angle".
        announcement: Spoken when the exercise is selected.
    """

    label: str
    guidance: str
    not_visible: str
    low_label: str
    high_label: str
    angle_label: str
    announcement: str


class BlockReason(StrEnum):
    """Why a frame has no usable reading."""

    NOT_VISIBLE = "not_visible"
    FACE_CAMERA = "face_camera"
    TURN_SIDE = "turn_side"
    FORM = "form"


@dataclass(frozen=True)
class Angle:
    """A usable measurement in degrees.

    Attributes:
        degrees: The measured angle.
    """

    degrees: float


@dataclass(frozen=True)
class Blocked:
    """No usable measurement this frame.

    ``FORM`` means the joints are visible but the body is not in the
    exercise's shape; the counter treats it as unsure, never as zero.

    Attributes:
        reason: Why the frame was rejected.
    """

    reason: BlockReason


Reading = Angle | Blocked


@runtime_checkable
class Exercise(Protocol):
    """Contract every exercise module implements.

    Attributes:
        mode: Identifier used across the app.
        best_view: Camera orientation the exercise is designed for.
        thresholds: Hysteresis band for counting.
        copy: User-facing text.
    """

    mode: ExerciseMode
    best_view: ViewMode
    thresholds: RepThresholds
    copy: ExerciseCopy

    def measure(self, points: BodyPoints) -> Reading:
        """Reads the exercise's angle from one frame.

        Args:
            points: Visible joints for the frame.

        Returns:
            An ``Angle`` when the frame is usable, otherwise ``Blocked``.
        """
        ...

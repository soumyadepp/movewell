"""Shoulder raise: both arms lift out to the side and lower again."""

from dataclasses import dataclass, field

from physio_assistant.domain.models import BodyPoints, ExerciseMode, Joint, ViewMode
from physio_assistant.exercises.base import (
    Angle,
    Blocked,
    BlockReason,
    ExerciseCopy,
    Reading,
    RepThresholds,
)
from physio_assistant.exercises.measures import orientation_block, shoulder_angle


@dataclass(frozen=True)
class ArmRaise:
    """Counts raises using the smaller of the two shoulder angles.

    Taking the minimum means both arms must rise together; one arm waving
    keeps the reading low.
    """

    mode: ExerciseMode = ExerciseMode.ARM_RAISE
    best_view: ViewMode = ViewMode.FRONT
    thresholds: RepThresholds = field(default_factory=lambda: RepThresholds(35, 75, 1.0))
    copy: ExerciseCopy = field(
        default_factory=lambda: ExerciseCopy(
            label="Shoulder raise",
            guidance="Raise both arms out to the side slowly, then lower them.",
            not_visible="Show both shoulders and elbows to the camera.",
            low_label="Arms down",
            high_label="Arms raised",
            angle_label="Shoulder angle",
            announcement="Shoulder raise selected. Raise your arms slowly.",
        )
    )

    def measure(self, points: BodyPoints) -> Reading:
        """Returns the smaller shoulder angle, or why it cannot be read.

        Args:
            points: Visible joints for the frame.

        Returns:
            The reading.
        """
        if reason := orientation_block(points, self.best_view):
            return Blocked(reason)
        left = shoulder_angle(points, Joint.LEFT_ELBOW, Joint.LEFT_SHOULDER, Joint.LEFT_HIP)
        right = shoulder_angle(points, Joint.RIGHT_ELBOW, Joint.RIGHT_SHOULDER, Joint.RIGHT_HIP)
        if left is None or right is None:
            return Blocked(BlockReason.NOT_VISIBLE)
        return Angle(min(left, right))

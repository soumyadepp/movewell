"""Elbow curl: hands come up toward the shoulders with the elbows by the sides."""

from dataclasses import dataclass, field

from physio_assistant.domain.geometry import joint_angle_3d
from physio_assistant.domain.models import BodyPoints, ExerciseMode, Joint, ViewMode
from physio_assistant.exercises.base import (
    Angle,
    Blocked,
    BlockReason,
    ExerciseCopy,
    Reading,
    RepThresholds,
)
from physio_assistant.exercises.measures import from_vertical, orientation_block

UPPER_ARM_MAX_DEG = 60.0
"""The upper arm must stay within this many degrees of vertical for a curl to count."""

_ARMS = (
    (Joint.LEFT_SHOULDER, Joint.LEFT_ELBOW, Joint.LEFT_WRIST),
    (Joint.RIGHT_SHOULDER, Joint.RIGHT_ELBOW, Joint.RIGHT_WRIST),
)


@dataclass(frozen=True)
class ElbowCurl:
    """Counts curls from 3-D elbow flexion on any arm whose upper arm stays down.

    A bent arm raised away from the body (reaching, touching the face) is a
    form failure, which the counter treats as unsure rather than as zero.
    """

    mode: ExerciseMode = ExerciseMode.ELBOW_CURL
    best_view: ViewMode = ViewMode.FRONT
    thresholds: RepThresholds = field(default_factory=lambda: RepThresholds(30, 75, 0.8))
    copy: ExerciseCopy = field(
        default_factory=lambda: ExerciseCopy(
            label="Elbow curl",
            guidance="Keep elbows by your sides and bring your hands up towards your shoulders.",
            not_visible="Show your shoulders, elbows and wrists to the camera.",
            low_label="Arm straight",
            high_label="Elbow bent",
            angle_label="Elbow bend",
            announcement="Elbow curl selected. Bend your elbows slowly towards your shoulders.",
        )
    )

    def measure(self, points: BodyPoints) -> Reading:
        """Returns the largest valid elbow flexion, or why it cannot be read.

        Args:
            points: Visible joints for the frame.

        Returns:
            The reading.
        """
        if reason := orientation_block(points, self.best_view):
            return Blocked(reason)
        best: float | None = None
        any_visible = False
        for shoulder, elbow, wrist in _ARMS:
            angle = joint_angle_3d(points, shoulder, elbow, wrist)
            if angle is None:
                continue
            any_visible = True
            upper_arm = from_vertical(points.get(shoulder), points.get(elbow))
            if upper_arm is None or upper_arm > UPPER_ARM_MAX_DEG:
                continue
            best = max(best or 0.0, 180.0 - angle)
        if not any_visible:
            return Blocked(BlockReason.NOT_VISIBLE)
        return Blocked(BlockReason.FORM) if best is None else Angle(best)

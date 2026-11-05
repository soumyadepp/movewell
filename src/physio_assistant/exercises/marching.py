"""Marching: one knee lifts at a time, like marching on the spot."""

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


@dataclass(frozen=True)
class Marching:
    """Counts knee lifts from the difference between the two legs' 3-D hip flexion.

    Lifting one knee bends one hip only. Leaning the trunk or sitting bends
    both hips equally, so they cancel out, which works facing the camera or
    side-on without an orientation check.
    """

    mode: ExerciseMode = ExerciseMode.MARCHING
    best_view: ViewMode = ViewMode.FRONT
    thresholds: RepThresholds = field(default_factory=lambda: RepThresholds(15, 40, 0.6))
    copy: ExerciseCopy = field(
        default_factory=lambda: ExerciseCopy(
            label="Marching",
            guidance="Lift one knee at a time, as high as is comfortable. Hold a chair if needed.",
            not_visible="Make sure both hips and knees are in view of the camera.",
            low_label="Feet down",
            high_label="Knee lifted",
            angle_label="Knee lift",
            announcement="Marching selected. Lift one knee at a time.",
        )
    )

    def measure(self, points: BodyPoints) -> Reading:
        """Returns the hip-flexion difference between the legs.

        Args:
            points: Visible joints for the frame.

        Returns:
            The reading.
        """

        def flexion(shoulder: Joint, hip: Joint, knee: Joint) -> float | None:
            """Returns how far one thigh is lifted forward from the trunk line.

            Args:
                shoulder: Shoulder on the measured side.
                hip: Hip on the measured side (vertex).
                knee: Knee on the measured side.

            Returns:
                Hip flexion in degrees, or None if a joint is not visible.
            """
            angle = joint_angle_3d(points, shoulder, hip, knee)
            return None if angle is None else 180.0 - angle

        left = flexion(Joint.LEFT_SHOULDER, Joint.LEFT_HIP, Joint.LEFT_KNEE)
        right = flexion(Joint.RIGHT_SHOULDER, Joint.RIGHT_HIP, Joint.RIGHT_KNEE)
        if left is None or right is None:
            return Blocked(BlockReason.NOT_VISIBLE)
        return Angle(abs(left - right))

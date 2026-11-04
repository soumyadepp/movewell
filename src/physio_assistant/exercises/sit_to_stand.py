"""Sit-to-stand: stand up from a chair and sit back down with control."""

from dataclasses import dataclass, field

from physio_assistant.domain.geometry import joint_angle_3d, safe_average
from physio_assistant.domain.models import BodyPoints, ExerciseMode, Joint, ViewMode
from physio_assistant.exercises.base import ExerciseCopy, Reading, RepThresholds
from physio_assistant.exercises.measures import reading


@dataclass(frozen=True)
class SitToStand:
    """Counts stands from the average of 3-D knee and hip angles.

    Both are about 90 degrees seated and 170 or more standing, so hip angles
    carry the reading when the ankles are hidden by the chair or the frame
    edge. 3-D angles work facing the camera or side-on.
    """

    mode: ExerciseMode = ExerciseMode.SIT_TO_STAND
    best_view: ViewMode = ViewMode.FRONT
    thresholds: RepThresholds = field(default_factory=lambda: RepThresholds(120, 155, 1.2))
    copy: ExerciseCopy = field(
        default_factory=lambda: ExerciseCopy(
            label="Sit-to-stand",
            guidance="Stand up slowly from a sturdy chair, then sit back down with control.",
            not_visible="Make sure your hips and knees are in view of the camera.",
            low_label="Seated",
            high_label="Standing",
            angle_label="Knee and hip angle",
            announcement="Sit to stand selected. Use a sturdy chair for support.",
        )
    )

    def measure(self, points: BodyPoints) -> Reading:
        """Returns the averaged knee and hip angle, or why it cannot be read.

        Args:
            points: Visible joints for the frame.

        Returns:
            The reading.
        """
        return reading(
            safe_average(
                [
                    joint_angle_3d(points, Joint.LEFT_HIP, Joint.LEFT_KNEE, Joint.LEFT_ANKLE),
                    joint_angle_3d(points, Joint.RIGHT_HIP, Joint.RIGHT_KNEE, Joint.RIGHT_ANKLE),
                    joint_angle_3d(points, Joint.LEFT_SHOULDER, Joint.LEFT_HIP, Joint.LEFT_KNEE),
                    joint_angle_3d(points, Joint.RIGHT_SHOULDER, Joint.RIGHT_HIP, Joint.RIGHT_KNEE),
                ]
            )
        )

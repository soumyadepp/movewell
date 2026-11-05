"""Side bend: the trunk leans gently to one side and returns upright."""

from dataclasses import dataclass, field

from physio_assistant.domain.geometry import calculate_angle, midpoint
from physio_assistant.domain.models import BodyPoints, ExerciseMode, Joint, ViewMode
from physio_assistant.exercises.base import Blocked, ExerciseCopy, Reading, RepThresholds
from physio_assistant.exercises.measures import above, orientation_block, reading


@dataclass(frozen=True)
class SideBend:
    """Counts trunk lean: the hip-to-shoulder midline's angle away from vertical."""

    mode: ExerciseMode = ExerciseMode.SIDE_BEND
    best_view: ViewMode = ViewMode.FRONT
    thresholds: RepThresholds = field(default_factory=lambda: RepThresholds(6, 18, 1.2))
    copy: ExerciseCopy = field(
        default_factory=lambda: ExerciseCopy(
            label="Side bend",
            guidance=(
                "Reach one arm over your head and lean gently to the side, then come back upright."
            ),
            not_visible="Face the camera so it can see your shoulders and hips.",
            low_label="Upright",
            high_label="Leaning",
            angle_label="Trunk lean",
            announcement="Side bend selected. Lean gently to one side, then return.",
        )
    )

    def measure(self, points: BodyPoints) -> Reading:
        """Returns the trunk's lean from vertical, or why it cannot be read.

        Args:
            points: Visible joints for the frame.

        Returns:
            The reading.
        """
        if reason := orientation_block(points, self.best_view):
            return Blocked(reason)
        shoulders = midpoint(points.get(Joint.LEFT_SHOULDER), points.get(Joint.RIGHT_SHOULDER))
        hips = midpoint(points.get(Joint.LEFT_HIP), points.get(Joint.RIGHT_HIP))
        if shoulders is None or hips is None:
            return reading(None)
        return reading(calculate_angle(shoulders, hips, above(hips)))

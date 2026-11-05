"""Side leg raise: one leg lifts out to the side while holding a chair."""

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
from physio_assistant.exercises.measures import (
    STANDING_LEG_MAX_DEG,
    from_vertical,
    orientation_block,
)


@dataclass(frozen=True)
class SideLegRaise:
    """Counts leg abduction on the raised leg while the standing leg stays vertical.

    A wide stance or a step to the side moves both legs, which is a form
    failure rather than a repetition.
    """

    mode: ExerciseMode = ExerciseMode.SIDE_LEG_RAISE
    best_view: ViewMode = ViewMode.FRONT
    thresholds: RepThresholds = field(default_factory=lambda: RepThresholds(8, 22, 1.0))
    copy: ExerciseCopy = field(
        default_factory=lambda: ExerciseCopy(
            label="Side leg raise",
            guidance="Hold a chair, keep your back straight and lift one leg out to the side.",
            not_visible="Face the camera so it can see your hips and ankles.",
            low_label="Feet together",
            high_label="Leg raised",
            angle_label="Leg angle",
            announcement="Side leg raise selected. Hold a chair for support.",
        )
    )

    def measure(self, points: BodyPoints) -> Reading:
        """Returns the raised leg's angle from vertical, or why it cannot be read.

        Args:
            points: Visible joints for the frame.

        Returns:
            The reading.
        """
        if reason := orientation_block(points, self.best_view):
            return Blocked(reason)

        def leg(hip: Joint, ankle: Joint, knee: Joint) -> float | None:
            """Returns one leg's angle from vertical, using the knee if the ankle is hidden.

            Args:
                hip: Hip on the measured side.
                ankle: Preferred end of the leg segment.
                knee: Fallback end of the leg segment.

            Returns:
                Degrees from vertical, or None if the leg cannot be read.
            """
            end = points.get(ankle) or points.get(knee)
            return from_vertical(points.get(hip), end)

        left = leg(Joint.LEFT_HIP, Joint.LEFT_ANKLE, Joint.LEFT_KNEE)
        right = leg(Joint.RIGHT_HIP, Joint.RIGHT_ANKLE, Joint.RIGHT_KNEE)
        if left is None or right is None:
            return Blocked(BlockReason.NOT_VISIBLE)
        if min(left, right) > STANDING_LEG_MAX_DEG:
            return Blocked(BlockReason.FORM)
        return Angle(max(left, right))

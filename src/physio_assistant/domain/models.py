"""Value objects shared by every layer."""

from collections.abc import Mapping
from dataclasses import dataclass, field
from enum import Enum, StrEnum

Point = tuple[float, float]
Point3 = tuple[float, float, float]


class Joint(StrEnum):
    """Body landmarks the app reasons about."""

    NOSE = "nose"
    LEFT_EAR = "left_ear"
    RIGHT_EAR = "right_ear"
    LEFT_SHOULDER = "left_shoulder"
    RIGHT_SHOULDER = "right_shoulder"
    LEFT_ELBOW = "left_elbow"
    RIGHT_ELBOW = "right_elbow"
    LEFT_WRIST = "left_wrist"
    RIGHT_WRIST = "right_wrist"
    LEFT_HIP = "left_hip"
    RIGHT_HIP = "right_hip"
    LEFT_KNEE = "left_knee"
    RIGHT_KNEE = "right_knee"
    LEFT_ANKLE = "left_ankle"
    RIGHT_ANKLE = "right_ankle"


@dataclass(frozen=True)
class BodyPoints:
    """Visible joints for one frame.

    Joints below the visibility threshold are absent, so lookups return None.
    Image points are used for anything relative to gravity or the camera;
    world points are used for joint angles because they are not foreshortened
    when a limb moves toward the camera.

    Attributes:
        points: Mapping from joint to pixel coordinate.
        world: Optional mapping from joint to 3-D world coordinate in metres.
    """

    points: Mapping[Joint, Point] = field(default_factory=dict)
    world: Mapping[Joint, Point3] = field(default_factory=dict)

    def get3(self, joint: Joint) -> Point3 | None:
        """Returns the 3-D world position, or None when unavailable.

        Args:
            joint: Joint to look up.

        Returns:
            The world coordinate or None.
        """
        return self.world.get(joint)

    def get(self, joint: Joint) -> Point | None:
        """Returns the joint position, or None when it is not visible.

        Args:
            joint: Joint to look up.

        Returns:
            The pixel coordinate or None.
        """
        return self.points.get(joint)

    def first_visible(self, *joints: Joint) -> Point | None:
        """Returns the first visible joint among the candidates.

        Args:
            *joints: Joints in order of preference.

        Returns:
            The first visible pixel coordinate, or None if none are visible.
        """
        for joint in joints:
            point = self.get(joint)
            if point is not None:
                return point
        return None


class ViewMode(Enum):
    """Which way the patient faces the camera."""

    FRONT = "FRONT"
    SIDE = "SIDE"

    def toggled(self) -> "ViewMode":
        """Returns the other view mode."""
        return ViewMode.SIDE if self is ViewMode.FRONT else ViewMode.FRONT


class ExerciseMode(Enum):
    """Activity the app is currently monitoring."""

    POSTURE = "POSTURE"
    ARM_RAISE = "ARM RAISE"
    ELBOW_CURL = "ELBOW CURL"
    MARCHING = "MARCHING"
    SIDE_LEG_RAISE = "SIDE LEG RAISE"
    SIDE_BEND = "SIDE BEND"
    SIT_TO_STAND = "SIT-TO-STAND"


class MovementPhase(StrEnum):
    """Phase of the current repetition. Each exercise names LOW and HIGH in its own words."""

    READY = "READY"
    LOW = "LOW"
    HIGH = "HIGH"


@dataclass(frozen=True)
class Finding:
    """A heuristic posture observation. Never a diagnosis.

    Attributes:
        title: Short description of what was observed.
        correction: Gentle cue the user can act on.
        exercise: Suggested low-risk activity, subject to clinician approval.
        caveat: Why the observation may be unreliable.
    """

    title: str
    correction: str
    exercise: str
    caveat: str


@dataclass(frozen=True)
class SessionRecord:
    """Summary of one saved session.

    Attributes:
        date_time: ISO-8601 timestamp of the save.
        duration_seconds: Active session time.
        view_mode: View mode at save time.
        exercise: Exercise mode label at save time.
        repetitions: Repetitions counted.
        posture_observations: Semicolon-joined finding titles.
    """

    date_time: str
    duration_seconds: int
    view_mode: str
    exercise: str
    repetitions: int
    posture_observations: str

    FIELDS = (
        "date_time",
        "duration_seconds",
        "view_mode",
        "exercise",
        "repetitions",
        "posture_observations",
    )

    def to_row(self) -> dict[str, str | int]:
        """Serializes the record into a CSV row."""
        return {name: getattr(self, name) for name in self.FIELDS}

    @classmethod
    def from_row(cls, row: Mapping[str, str]) -> "SessionRecord":
        """Parses a CSV row, tolerating missing or malformed numbers.

        Args:
            row: Mapping produced by ``csv.DictReader``.

        Returns:
            The parsed record.
        """
        return cls(
            date_time=row.get("date_time", ""),
            duration_seconds=_to_int(row.get("duration_seconds")),
            view_mode=row.get("view_mode", ""),
            exercise=row.get("exercise", ""),
            repetitions=_to_int(row.get("repetitions")),
            posture_observations=row.get("posture_observations", ""),
        )


def _to_int(value: str | None) -> int:
    try:
        return int(value) if value not in (None, "") else 0
    except (TypeError, ValueError):
        return 0

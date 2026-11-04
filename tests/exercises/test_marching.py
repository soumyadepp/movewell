import math

from physio_assistant.domain.models import BodyPoints, ExerciseMode, Joint
from tests.poses import facing_3d, knees_at, reps, side_standing


def _knee_lifted(degrees: float) -> BodyPoints:
    points = dict(side_standing().points)
    rad = math.radians(degrees)
    knee = (490 + 130 * math.sin(rad), 400 + 130 * math.cos(rad))
    points[Joint.RIGHT_KNEE] = knee
    points[Joint.RIGHT_ANKLE] = (knee[0], knee[1] + 130)
    return BodyPoints(points)


def test_counts_knee_lifts_side_on(counter_for):
    counter, clock, _ = counter_for(ExerciseMode.MARCHING)

    assert reps(counter, clock, _knee_lifted(0), _knee_lifted(70), 3) == 3


def test_counts_knee_lifts_facing_camera_in_3d(counter_for):
    counter, clock, _ = counter_for(ExerciseMode.MARCHING)
    standing = facing_3d((-0.1, 0.45, 0.0), (0.1, 0.45, 0.0))
    lifted = facing_3d((-0.1, 0.45, 0.0), (0.1, 0.1, -0.4))

    assert reps(counter, clock, standing, lifted, 3) == 3


def test_leaning_forward_does_not_count(counter_for):
    counter, clock, _ = counter_for(ExerciseMode.MARCHING)
    points = dict(side_standing().points)
    points[Joint.LEFT_SHOULDER] = (580, 230)
    points[Joint.RIGHT_SHOULDER] = (590, 230)

    assert reps(counter, clock, _knee_lifted(0), BodyPoints(points), 3) == 0


def test_sitting_down_does_not_count(counter_for):
    counter, clock, _ = counter_for(ExerciseMode.MARCHING)

    assert reps(counter, clock, _knee_lifted(0), knees_at(90), 2) == 0

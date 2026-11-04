from physio_assistant.domain.models import BodyPoints, ExerciseMode, Joint
from tests.poses import facing_3d, reps, seated_side, standing_side


def test_counts_each_stand_side_on(counter_for):
    counter, clock, _ = counter_for(ExerciseMode.SIT_TO_STAND)

    assert reps(counter, clock, seated_side(), standing_side(), 3) == 3


def test_counts_with_ankles_hidden(counter_for):
    counter, clock, _ = counter_for(ExerciseMode.SIT_TO_STAND)

    assert reps(counter, clock, seated_side(False), standing_side(False), 2) == 2


def test_counts_facing_camera_in_3d(counter_for):
    counter, clock, _ = counter_for(ExerciseMode.SIT_TO_STAND)
    seated = facing_3d((-0.1, 0.0, -0.45), (0.1, 0.0, -0.45))
    standing = facing_3d((-0.1, 0.45, 0.0), (0.1, 0.45, 0.0))

    assert reps(counter, clock, seated, standing, 3) == 3


def test_leaning_forward_while_seated_does_not_count(counter_for):
    counter, clock, _ = counter_for(ExerciseMode.SIT_TO_STAND)
    points = dict(seated_side().points)
    points[Joint.LEFT_SHOULDER] = (560, 300)
    points[Joint.RIGHT_SHOULDER] = (568, 300)

    assert reps(counter, clock, seated_side(), BodyPoints(points), 3) == 0

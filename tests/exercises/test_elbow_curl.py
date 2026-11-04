from physio_assistant.domain.models import BodyPoints, ExerciseMode, Joint
from tests.poses import body, curled, hold, reps


def test_counts_curls_with_upper_arm_by_side(counter_for):
    counter, clock, _ = counter_for(ExerciseMode.ELBOW_CURL)

    assert reps(counter, clock, curled(5), curled(130), 2) == 2


def test_bent_arm_raised_away_from_body_does_not_count(counter_for):
    counter, clock, _ = counter_for(ExerciseMode.ELBOW_CURL)
    raised_bent = body(left_elbow=(330, 200), left_wrist=(330, 120))

    assert reps(counter, clock, curled(5), raised_bent, 3) == 0


def test_quick_partial_curls_count(counter_for):
    counter, clock, _ = counter_for(ExerciseMode.ELBOW_CURL)
    for _ in range(3):
        hold(counter.update, curled(10), clock, 0.6)
        for degrees in (40, 70, 85, 90, 85, 70, 40):
            counter.update(curled(degrees))
            clock.advance(1 / 20)

    assert counter.reps == 3


def test_elbow_drifting_out_at_the_top_is_unsure_not_zero(counter_for):
    counter, clock, _ = counter_for(ExerciseMode.ELBOW_CURL)
    drifted = body(left_elbow=(340, 250), left_wrist=(380, 190))
    for _ in range(3):
        hold(counter.update, curled(5), clock, 0.6)
        for pose in (
            curled(60),
            curled(100),
            curled(110),
            drifted,
            drifted,
            curled(110),
            curled(60),
        ):
            counter.update(pose)
            clock.advance(1 / 20)

    assert counter.reps == 3


def test_curl_toward_camera_counts_in_3d(counter_for):
    counter, clock, _ = counter_for(ExerciseMode.ELBOW_CURL)
    flat = body()
    image = {
        j: flat.get(j)
        for j in (
            Joint.LEFT_SHOULDER,
            Joint.RIGHT_SHOULDER,
            Joint.LEFT_ELBOW,
            Joint.LEFT_WRIST,
            Joint.LEFT_HIP,
            Joint.RIGHT_HIP,
        )
    }

    def pose(bent: bool) -> BodyPoints:
        wrist = (-0.2, -0.2, -0.26) if bent else (-0.2, 0.08, 0.0)
        world = {
            Joint.LEFT_SHOULDER: (-0.18, -0.45, 0.0),
            Joint.LEFT_ELBOW: (-0.2, -0.17, 0.0),
            Joint.LEFT_WRIST: wrist,
        }
        return BodyPoints(image, world)

    assert reps(counter, clock, pose(False), pose(True), 2) == 2

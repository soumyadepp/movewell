from physio_assistant import messages
from physio_assistant.analysis.counting import PostureOnlyCounter, RepCounter
from physio_assistant.domain.models import BodyPoints, ExerciseMode, Joint, MovementPhase
from physio_assistant.events import RepCounted
from tests.poses import arms_at, curled, hold, reps


def test_held_low_to_high_counts_and_publishes(counter_for):
    counter, clock, bus = counter_for(ExerciseMode.ARM_RAISE)

    assert reps(counter, clock, arms_at(10), arms_at(100)) == 1
    assert counter.phase is MovementPhase.HIGH
    assert bus.of_type(RepCounted) == [RepCounted(ExerciseMode.ARM_RAISE, 1)]


def test_single_frame_spike_does_not_count(counter_for):
    counter, clock, _ = counter_for(ExerciseMode.ARM_RAISE)
    hold(counter.update, arms_at(10), clock, 1)
    counter.update(arms_at(120))
    hold(counter.update, arms_at(10), clock, 1)

    assert counter.reps == 0


def test_movement_that_never_started_low_does_not_count(counter_for):
    counter, clock, _ = counter_for(ExerciseMode.ARM_RAISE)
    hold(counter.update, arms_at(100), clock, 2)

    assert counter.reps == 0


def test_held_position_counts_once(counter_for):
    counter, clock, _ = counter_for(ExerciseMode.ARM_RAISE)
    hold(counter.update, arms_at(10), clock)
    hold(counter.update, arms_at(100), clock, 5)

    assert counter.reps == 1


def test_movement_inside_band_does_not_count(counter_for):
    counter, clock, _ = counter_for(ExerciseMode.ARM_RAISE)

    assert reps(counter, clock, arms_at(45), arms_at(65), 3) == 0


def _drop_wrists(points: BodyPoints) -> BodyPoints:
    kept = {
        j: p for j, p in points.points.items() if j not in (Joint.LEFT_WRIST, Joint.RIGHT_WRIST)
    }
    return BodyPoints(kept)


def test_brief_dropouts_do_not_reset_progress(counter_for):
    counter, clock, _ = counter_for(ExerciseMode.ELBOW_CURL)
    frame = 0

    def flicker(points: BodyPoints, seconds: float) -> None:
        nonlocal frame
        for _ in range(round(seconds * 30)):
            counter.update(_drop_wrists(points) if frame % 3 == 2 else points)
            frame += 1
            clock.advance(1 / 30)

    for _ in range(3):
        flicker(curled(5), 0.8)
        flicker(curled(110), 0.8)

    assert counter.reps == 3


def test_sustained_loss_reports_not_visible(counter_for):
    counter, clock, _ = counter_for(ExerciseMode.ELBOW_CURL)
    hold(counter.update, curled(5), clock)
    hold(counter.update, _drop_wrists(curled(5)), clock, 1)

    assert isinstance(counter, RepCounter)
    assert counter.update(_drop_wrists(curled(5))) == counter.exercise.copy.not_visible
    assert counter.last_angle is None


def test_posture_counter_never_counts(counter_for):
    counter, _, _ = counter_for(ExerciseMode.POSTURE)

    assert isinstance(counter, PostureOnlyCounter)
    assert counter.update(arms_at(100)) == messages.GUIDANCE_POSTURE_MODE
    assert counter.reps == 0


def test_quick_rep_seen_in_two_frames_at_8_fps_counts(counter_for):
    counter, clock, _ = counter_for(ExerciseMode.ARM_RAISE)
    for _ in range(3):
        for degrees in (10, 10, 10, 10, 60, 100, 110, 60, 10, 10):
            counter.update(arms_at(degrees))
            clock.advance(1 / 8)

    assert counter.reps == 3


def test_counting_survives_a_dropped_frame_gap(counter_for):
    counter, clock, _ = counter_for(ExerciseMode.ARM_RAISE)
    hold(counter.update, arms_at(10), clock, 0.5)
    clock.advance(0.3)
    hold(counter.update, arms_at(100), clock, 0.3)

    assert counter.reps == 1

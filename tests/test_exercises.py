import pytest

from physio_assistant import messages
from physio_assistant.analysis.exercises import (
    ArmRaiseCounter,
    PostureOnlyCounter,
    SitToStandCounter,
    create_counter,
)
from physio_assistant.config import ExerciseThresholds
from physio_assistant.domain.models import ExerciseMode, Joint, MovementPhase
from physio_assistant.events import RepCounted
from tests.poses import arms_at, knees_at, without

T = ExerciseThresholds()


def arm_counter(bus, clock):
    return create_counter(ExerciseMode.ARM_RAISE, T, bus, clock)


def test_factory_returns_counter_per_mode(bus, clock):
    assert isinstance(create_counter(ExerciseMode.POSTURE, T, bus, clock), PostureOnlyCounter)
    assert isinstance(create_counter(ExerciseMode.ARM_RAISE, T, bus, clock), ArmRaiseCounter)
    assert isinstance(create_counter(ExerciseMode.SIT_TO_STAND, T, bus, clock), SitToStandCounter)


def test_full_arm_raise_counts_one_rep_and_publishes(bus, clock):
    counter = arm_counter(bus, clock)
    counter.update(arms_at(10))
    clock.advance(2)
    counter.update(arms_at(90))

    assert counter.reps == 1
    assert counter.phase is MovementPhase.RAISED
    assert bus.of_type(RepCounted) == [RepCounted(ExerciseMode.ARM_RAISE, 1)]


def test_raise_without_lowering_first_does_not_count(bus, clock):
    counter = arm_counter(bus, clock)
    clock.advance(2)
    counter.update(arms_at(90))

    assert counter.reps == 0
    assert counter.phase is MovementPhase.RAISED


def test_holding_arms_up_counts_once(bus, clock):
    counter = arm_counter(bus, clock)
    counter.update(arms_at(10))
    for _ in range(5):
        clock.advance(2)
        counter.update(arms_at(90))

    assert counter.reps == 1


def test_angle_inside_band_keeps_phase(bus, clock):
    counter = arm_counter(bus, clock)
    counter.update(arms_at(10))
    counter.update(arms_at(50))

    assert counter.phase is MovementPhase.LOWERED


def test_reps_faster_than_min_interval_are_deferred(bus, clock):
    counter = arm_counter(bus, clock)
    counter.update(arms_at(10))
    clock.advance(2)
    counter.update(arms_at(90))
    counter.update(arms_at(10))
    clock.advance(0.3)
    counter.update(arms_at(90))
    assert counter.reps == 1

    clock.advance(1)
    counter.update(arms_at(90))
    assert counter.reps == 2


def test_arm_counter_asks_for_visibility_when_joints_hidden(bus, clock):
    counter = arm_counter(bus, clock)
    hidden = without(Joint.LEFT_ELBOW, Joint.RIGHT_ELBOW)
    assert counter.update(hidden) == messages.GUIDANCE_ARM_RAISE_NOT_VISIBLE
    assert counter.last_angle is None


def test_arm_raise_counts_with_hips_out_of_frame(bus, clock):
    counter = arm_counter(bus, clock)
    counter.update(_without_hips(arms_at(10)))
    clock.advance(2)
    counter.update(_without_hips(arms_at(120)))

    assert counter.reps == 1
    assert counter.last_angle == pytest.approx(120, abs=0.5)


def _without_hips(points):
    kept = {j: p for j, p in points.points.items() if j not in (Joint.LEFT_HIP, Joint.RIGHT_HIP)}
    return type(points)(kept)


@pytest.mark.parametrize("cycles", [1, 3])
def test_sit_to_stand_counts_each_cycle(bus, clock, cycles):
    counter = create_counter(ExerciseMode.SIT_TO_STAND, T, bus, clock)
    for _ in range(cycles):
        counter.update(knees_at(90))
        clock.advance(2)
        counter.update(knees_at(175))

    assert counter.reps == cycles
    assert counter.phase is MovementPhase.STANDING


def test_posture_counter_never_counts(bus, clock):
    counter = create_counter(ExerciseMode.POSTURE, T, bus, clock)
    assert counter.update(arms_at(90)) == messages.GUIDANCE_POSTURE_MODE
    assert counter.reps == 0

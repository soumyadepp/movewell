"""Exercise repetition counters.

Counters share one hysteresis state machine (Template Method): the subclass
only says how to measure the angle and which phases and copy to use. The
movement must dip below ``low_deg`` and then rise above ``high_deg`` for a
repetition to count, which stops jitter around a single threshold from
double counting.
"""

import time
from abc import ABC, abstractmethod
from collections.abc import Callable

from physio_assistant import messages
from physio_assistant.config import ExerciseThresholds, RepThresholds
from physio_assistant.domain.geometry import calculate_angle, joint_angle, safe_average
from physio_assistant.domain.models import BodyPoints, ExerciseMode, Joint, MovementPhase
from physio_assistant.events import EventBus, RepCounted

Clock = Callable[[], float]


class ExerciseCounter(ABC):
    """Base class for every exercise mode, including the no-op posture mode."""

    mode: ExerciseMode

    def __init__(self) -> None:
        self.reps = 0
        self.phase = MovementPhase.READY
        self.last_angle: float | None = None

    @abstractmethod
    def update(self, points: BodyPoints) -> str:
        """Advances the counter with one frame.

        Args:
            points: Visible joints for the frame.

        Returns:
            A short guidance line for the user.
        """


class PostureOnlyCounter(ExerciseCounter):
    """Null Object used in posture mode so callers never branch on mode."""

    mode = ExerciseMode.POSTURE

    def update(self, points: BodyPoints) -> str:
        """Returns the posture-mode hint without counting anything."""
        return messages.GUIDANCE_POSTURE_MODE


class HysteresisRepCounter(ExerciseCounter):
    """Counts a repetition on a low-to-high transition of a measured angle."""

    low_phase: MovementPhase
    high_phase: MovementPhase
    guidance: str
    not_visible_guidance: str

    def __init__(self, thresholds: RepThresholds, events: EventBus, clock: Clock) -> None:
        super().__init__()
        self._t = thresholds
        self._events = events
        self._clock = clock
        self._last_rep_time = float("-inf")

    @abstractmethod
    def measure(self, points: BodyPoints) -> float | None:
        """Returns the angle this exercise tracks, or None if it cannot be seen."""

    def update(self, points: BodyPoints) -> str:
        """Advances the state machine and publishes RepCounted on a new repetition.

        Args:
            points: Visible joints for the frame.

        Returns:
            Guidance line for the user.
        """
        angle = self.measure(points)
        self.last_angle = angle
        if angle is None:
            return self.not_visible_guidance

        if angle < self._t.low_deg:
            self.phase = self.low_phase
        elif angle > self._t.high_deg:
            self._on_high(self._clock())
        return self.guidance

    def _on_high(self, now: float) -> None:
        if self.phase is not self.low_phase:
            self.phase = self.high_phase
            return
        if now - self._last_rep_time > self._t.min_interval_s:
            self.reps += 1
            self._last_rep_time = now
            self.phase = self.high_phase
            self._events.publish(RepCounted(mode=self.mode, total=self.reps))


class ArmRaiseCounter(HysteresisRepCounter):
    """Shoulder raise counter using the elbow-shoulder-hip angle as a rough 2-D proxy."""

    mode = ExerciseMode.ARM_RAISE
    low_phase = MovementPhase.LOWERED
    high_phase = MovementPhase.RAISED
    guidance = messages.GUIDANCE_ARM_RAISE
    not_visible_guidance = messages.GUIDANCE_ARM_RAISE_NOT_VISIBLE

    def measure(self, points: BodyPoints) -> float | None:
        """Returns the mean shoulder angle across the visible sides."""
        return safe_average(
            [
                shoulder_angle(points, Joint.LEFT_ELBOW, Joint.LEFT_SHOULDER, Joint.LEFT_HIP),
                shoulder_angle(points, Joint.RIGHT_ELBOW, Joint.RIGHT_SHOULDER, Joint.RIGHT_HIP),
            ]
        )


def shoulder_angle(points: BodyPoints, elbow: Joint, shoulder: Joint, hip: Joint) -> float | None:
    """Returns the upper-arm angle at the shoulder.

    Uses the hip as the reference when visible, otherwise a point straight
    below the shoulder, so counting still works with the hips out of frame.

    Args:
        points: Visible joints for the frame.
        elbow: Elbow joint.
        shoulder: Shoulder joint (vertex).
        hip: Preferred reference joint.

    Returns:
        The angle in degrees, or None if the elbow or shoulder is not visible.
    """
    e, s = points.get(elbow), points.get(shoulder)
    if e is None or s is None:
        return None
    return calculate_angle(e, s, points.get(hip) or (s[0], s[1] + 100))


class SitToStandCounter(HysteresisRepCounter):
    """Sit-to-stand or shallow squat counter using the hip-knee-ankle angle."""

    mode = ExerciseMode.SIT_TO_STAND
    low_phase = MovementPhase.SITTING_OR_BENT
    high_phase = MovementPhase.STANDING
    guidance = messages.GUIDANCE_SIT_TO_STAND
    not_visible_guidance = messages.GUIDANCE_SIT_TO_STAND_NOT_VISIBLE

    def measure(self, points: BodyPoints) -> float | None:
        """Returns the mean knee angle across the visible sides."""
        return safe_average(
            [
                joint_angle(points, Joint.LEFT_HIP, Joint.LEFT_KNEE, Joint.LEFT_ANKLE),
                joint_angle(points, Joint.RIGHT_HIP, Joint.RIGHT_KNEE, Joint.RIGHT_ANKLE),
            ]
        )


def create_counter(
    mode: ExerciseMode,
    thresholds: ExerciseThresholds,
    events: EventBus,
    clock: Clock = time.monotonic,
) -> ExerciseCounter:
    """Factory returning a fresh counter for an exercise mode.

    Args:
        mode: Selected exercise mode.
        thresholds: Exercise thresholds.
        events: Bus used to publish RepCounted.
        clock: Monotonic time source, injectable for tests.

    Returns:
        A counter with zero repetitions.

    Raises:
        ValueError: If the mode has no registered counter.
    """
    if mode is ExerciseMode.POSTURE:
        return PostureOnlyCounter()
    if mode is ExerciseMode.ARM_RAISE:
        return ArmRaiseCounter(thresholds.arm_raise, events, clock)
    if mode is ExerciseMode.SIT_TO_STAND:
        return SitToStandCounter(thresholds.sit_to_stand, events, clock)
    raise ValueError(f"No counter registered for {mode}")

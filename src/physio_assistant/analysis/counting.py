"""Repetition counting for any ``Exercise``.

One state machine counts every exercise. The smoothed angle must dwell below
the exercise's low threshold, then dwell above its high threshold, so a single
jittery frame can never complete a repetition. Brief gaps in tracking are
tolerated without resetting progress.
"""

import math
import time
from collections.abc import Callable
from typing import Protocol

from physio_assistant import messages
from physio_assistant.domain.models import BodyPoints, ExerciseMode, MovementPhase
from physio_assistant.events import EventBus, RepCounted
from physio_assistant.exercises import Angle, BlockReason, Exercise, get_exercise

Clock = Callable[[], float]

DWELL_S = 0.1
"""Seconds the angle must stay in a zone before the zone counts as reached."""

DWELL_EPSILON_S = 1e-3
"""Tolerance for floating-point frame timestamps when comparing dwell times."""

BLOCK_GRACE_S = 0.6
"""Seconds a reading may be unavailable before counting progress resets."""

SMOOTHING_TAU_S = 0.06
"""Time constant of the exponential smoothing; scaled by the time between frames."""

DWELL_FRAMES = 2
"""A zone also counts as reached after this many consecutive frames, for low frame rates."""

MAX_GAP_S = 0.5
"""Gaps longer than this restart smoothing instead of blending stale values."""


class Counter(Protocol):
    """What the assistant and UI need from any counter."""

    mode: ExerciseMode
    reps: int
    phase: MovementPhase
    last_angle: float | None

    def update(self, points: BodyPoints) -> str:
        """Advances the counter with one frame and returns a guidance line."""
        ...


class PostureOnlyCounter:
    """Null Object used in posture mode so callers never branch on mode."""

    def __init__(self) -> None:
        self.mode = ExerciseMode.POSTURE
        self.reps = 0
        self.phase = MovementPhase.READY
        self.last_angle: float | None = None

    def update(self, points: BodyPoints) -> str:
        """Returns the posture-mode hint without counting anything."""
        return messages.GUIDANCE_POSTURE_MODE


class RepCounter:
    """Counts repetitions of one exercise with smoothing, dwell and dropout tolerance."""

    def __init__(self, exercise: Exercise, events: EventBus, clock: Clock) -> None:
        self.exercise = exercise
        self.mode = exercise.mode
        self.reps = 0
        self.phase = MovementPhase.READY
        self.last_angle: float | None = None
        self._events = events
        self._clock = clock
        self._smoothed: float | None = None
        self._zone = "mid"
        self._zone_since = 0.0
        self._blocked_since: float | None = None
        self._last_rep_time = float("-inf")
        self._zone_frames = 0
        self._last_sample_at: float | None = None

    def update(self, points: BodyPoints) -> str:
        """Advances the state machine and publishes RepCounted on a new repetition.

        Args:
            points: Visible joints for the frame.

        Returns:
            Guidance line for the user.
        """
        copy = self.exercise.copy
        result = self.exercise.measure(points)
        now = self._clock()

        if not isinstance(result, Angle):
            if self._blocked_since is None:
                self._blocked_since = now
            if now - self._blocked_since < BLOCK_GRACE_S:
                return copy.guidance
            self._smoothed = None
            self.last_angle = None
            self._last_sample_at = None
            self._zone = "mid"
            self._zone_frames = 0
            return _block_guidance(result.reason, copy.guidance, copy.not_visible)
        self._blocked_since = None

        dt = math.inf if self._last_sample_at is None else now - self._last_sample_at
        self._last_sample_at = now
        if self._smoothed is None or dt > MAX_GAP_S:
            self._smoothed = result.degrees
        else:
            weight = 1 - math.exp(-dt / SMOOTHING_TAU_S)
            self._smoothed += weight * (result.degrees - self._smoothed)
        self.last_angle = self._smoothed

        t = self.exercise.thresholds
        zone = (
            "low"
            if self._smoothed < t.low_deg
            else "high"
            if self._smoothed > t.high_deg
            else "mid"
        )
        if zone != self._zone:
            self._zone = zone
            self._zone_since = now
            self._zone_frames = 0
        self._zone_frames += 1
        held = now - self._zone_since + DWELL_EPSILON_S
        reached = self._zone_frames >= DWELL_FRAMES or held >= DWELL_S
        if zone == "low" and reached:
            self.phase = MovementPhase.LOW
        elif zone == "high" and reached:
            self._on_high(now)
        return copy.guidance

    def _on_high(self, now: float) -> None:
        if self.phase is not MovementPhase.LOW:
            self.phase = MovementPhase.HIGH
            return
        if now - self._last_rep_time > self.exercise.thresholds.min_interval_s:
            self.reps += 1
            self._last_rep_time = now
            self.phase = MovementPhase.HIGH
            self._events.publish(RepCounted(mode=self.mode, total=self.reps))


def _block_guidance(reason: BlockReason, guidance: str, not_visible: str) -> str:
    if reason is BlockReason.FACE_CAMERA:
        return messages.GUIDANCE_TURN_FRONT
    if reason is BlockReason.TURN_SIDE:
        return messages.GUIDANCE_TURN_SIDE
    if reason is BlockReason.FORM:
        return guidance
    return not_visible


def create_counter(mode: ExerciseMode, events: EventBus, clock: Clock = time.monotonic) -> Counter:
    """Factory returning a fresh counter for a mode.

    Args:
        mode: Selected mode.
        events: Bus used to publish RepCounted.
        clock: Monotonic time source, injectable for tests.

    Returns:
        A counter with zero repetitions.
    """
    if mode is ExerciseMode.POSTURE:
        return PostureOnlyCounter()
    return RepCounter(get_exercise(mode), events, clock)

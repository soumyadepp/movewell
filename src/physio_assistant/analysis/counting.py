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

from physio_assistant.domain.feedback import Guidance
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

    def update(self, points: BodyPoints) -> Guidance:
        """Advances the counter with one frame.

        Args:
            points: Visible joints for the frame.

        Returns:
            Guidance code for the user.
        """
        ...


class PostureOnlyCounter:
    """Null Object used in posture mode so callers never branch on mode."""

    def __init__(self) -> None:
        """Creates a counter that stays at zero repetitions."""
        self.mode = ExerciseMode.POSTURE
        self.reps = 0
        self.phase = MovementPhase.READY
        self.last_angle: float | None = None

    def update(self, points: BodyPoints) -> Guidance:
        """Returns the posture-mode hint without counting anything.

        Args:
            points: Visible joints for the frame, ignored.

        Returns:
            ``Guidance.POSTURE_MODE``.
        """
        return Guidance.POSTURE_MODE


class RepCounter:
    """Counts repetitions of one exercise with smoothing, dwell and dropout tolerance."""

    def __init__(self, exercise: Exercise, events: EventBus, clock: Clock) -> None:
        """Creates a counter for one exercise.

        Args:
            exercise: Exercise whose angle is measured and counted.
            events: Bus used to publish RepCounted.
            clock: Monotonic time source.
        """
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

    def update(self, points: BodyPoints) -> Guidance:
        """Advances the state machine and publishes RepCounted on a new repetition.

        Args:
            points: Visible joints for the frame.

        Returns:
            Guidance code for the user.
        """
        result = self.exercise.measure(points)
        now = self._clock()
        if not isinstance(result, Angle):
            return self._on_blocked(result.reason, now)
        self._blocked_since = None
        self.last_angle = self._smooth(result.degrees, now)
        self._advance_phase(self._zone_for(self.last_angle), now)
        return Guidance.exercise(self.mode)

    def _on_blocked(self, reason: BlockReason, now: float) -> Guidance:
        """Handles a frame without a usable reading.

        Progress is kept during a short grace period, then tracking resets.

        Args:
            reason: Why the frame has no reading.
            now: Current clock time.

        Returns:
            The exercise guidance during the grace period, otherwise a hint
            that matches the reason.
        """
        if self._blocked_since is None:
            self._blocked_since = now
        if now - self._blocked_since < BLOCK_GRACE_S:
            return Guidance.exercise(self.mode)
        self._reset_tracking()
        return _block_guidance(reason, self.mode)

    def _reset_tracking(self) -> None:
        """Forgets the smoothed angle and zone so counting restarts cleanly."""
        self._smoothed = None
        self.last_angle = None
        self._last_sample_at = None
        self._zone = "mid"
        self._zone_frames = 0

    def _smooth(self, degrees: float, now: float) -> float:
        """Blends a new angle into the time-scaled exponential average.

        Args:
            degrees: Angle measured this frame.
            now: Current clock time.

        Returns:
            The updated smoothed angle.
        """
        dt = math.inf if self._last_sample_at is None else now - self._last_sample_at
        self._last_sample_at = now
        if self._smoothed is None or dt > MAX_GAP_S:
            self._smoothed = degrees
        else:
            weight = 1 - math.exp(-dt / SMOOTHING_TAU_S)
            self._smoothed += weight * (degrees - self._smoothed)
        return self._smoothed

    def _zone_for(self, angle: float) -> str:
        """Classifies an angle against the exercise thresholds.

        Args:
            angle: Smoothed angle in degrees.

        Returns:
            ``"low"``, ``"high"`` or ``"mid"``.
        """
        thresholds = self.exercise.thresholds
        if angle < thresholds.low_deg:
            return "low"
        if angle > thresholds.high_deg:
            return "high"
        return "mid"

    def _zone_reached(self, zone: str, now: float) -> bool:
        """Records the frame's zone and reports whether it has been held long enough.

        Args:
            zone: Zone of the current frame.
            now: Current clock time.

        Returns:
            True once the zone has lasted ``DWELL_FRAMES`` frames or ``DWELL_S`` seconds.
        """
        if zone != self._zone:
            self._zone = zone
            self._zone_since = now
            self._zone_frames = 0
        self._zone_frames += 1
        held = now - self._zone_since + DWELL_EPSILON_S
        return self._zone_frames >= DWELL_FRAMES or held >= DWELL_S

    def _advance_phase(self, zone: str, now: float) -> None:
        """Moves the movement phase forward once a zone has been reached.

        Args:
            zone: Zone of the current frame.
            now: Current clock time.
        """
        if not self._zone_reached(zone, now):
            return
        if zone == "low":
            self.phase = MovementPhase.LOW
        elif zone == "high":
            self._on_high(now)

    def _on_high(self, now: float) -> None:
        """Enters the high phase, counting a repetition when it follows the low phase.

        Args:
            now: Current clock time.
        """
        if self.phase is not MovementPhase.LOW:
            self.phase = MovementPhase.HIGH
            return
        if now - self._last_rep_time > self.exercise.thresholds.min_interval_s:
            self.reps += 1
            self._last_rep_time = now
            self.phase = MovementPhase.HIGH
            self._events.publish(RepCounted(mode=self.mode, total=self.reps))


def _block_guidance(reason: BlockReason, mode: ExerciseMode) -> Guidance:
    """Picks the guidance for a reading that stayed blocked past the grace period.

    Args:
        reason: Why the frame has no reading.
        mode: Exercise being tracked.

    Returns:
        A turn hint, the exercise guidance for a form issue, or a not-visible hint.
    """
    if reason is BlockReason.FACE_CAMERA:
        return Guidance.TURN_FRONT
    if reason is BlockReason.TURN_SIDE:
        return Guidance.TURN_SIDE
    if reason is BlockReason.FORM:
        return Guidance.exercise(mode)
    return Guidance.not_visible(mode)


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

"""Application service that owns session state.

It turns pose detections and user commands into state changes and events.
It has no OpenCV window, camera or speech code, so the whole flow can be
unit tested with fake detections and a fake clock.
"""

import time
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import datetime

from physio_assistant import messages
from physio_assistant.analysis.counting import Counter, create_counter
from physio_assistant.analysis.posture import PostureAnalyzer, create_posture_analyzer
from physio_assistant.analysis.progress import ProgressSummary, summarize
from physio_assistant.config import AppConfig
from physio_assistant.domain.models import (
    BodyPoints,
    ExerciseMode,
    Finding,
    SessionRecord,
    ViewMode,
)
from physio_assistant.events import Announcement, BodyLost, EventBus, FindingChanged
from physio_assistant.exercises import get_exercise
from physio_assistant.infrastructure.storage import SessionRepository
from physio_assistant.session import SessionTimer

_VIEW_ANNOUNCEMENTS = {
    ViewMode.FRONT: messages.SPEAK_FRONT_VIEW,
    ViewMode.SIDE: messages.SPEAK_SIDE_VIEW,
}


@dataclass
class FrameState:
    """What the dashboard shows for the latest frame.

    Attributes:
        body_detected: Whether a person was found.
        findings: Posture findings for the frame.
        guidance: Up to three guidance lines.
    """

    body_detected: bool = False
    findings: list[Finding] = field(default_factory=list)
    guidance: list[str] = field(default_factory=lambda: list(messages.GUIDANCE_INITIAL))


class Assistant:
    """Coordinates analyzers, the active counter, the timer and session history."""

    def __init__(
        self,
        config: AppConfig,
        events: EventBus,
        repository: SessionRepository,
        clock: Callable[[], float] = time.monotonic,
        now: Callable[[], datetime] = datetime.now,
    ) -> None:
        self._config = config
        self._events = events
        self._repository = repository
        self._clock = clock
        self._now = now

        self.view = ViewMode.FRONT
        self.mode = ExerciseMode.POSTURE
        self.timer = SessionTimer(clock)
        self.history: list[SessionRecord] = repository.load_all()
        self.frame = FrameState()
        self.status_message = ""

        self._analyzer: PostureAnalyzer = create_posture_analyzer(self.view, config.posture)
        self.counter: Counter = create_counter(self.mode, events, clock)
        self._last_finding: Finding | None = None

    @property
    def progress(self) -> ProgressSummary:
        """Progress numbers for the selected exercise."""
        return summarize(self.history, self.mode)

    def process(self, points: BodyPoints | None) -> FrameState:
        """Updates state from one frame's pose.

        Args:
            points: Visible joints, or None when nobody was detected.

        Returns:
            The new frame state.
        """
        if points is None:
            self.frame = FrameState(body_detected=False, guidance=list(messages.GUIDANCE_NO_BODY))
            self._events.publish(BodyLost())
            return self.frame

        findings = self._analyzer.analyze(points)
        guidance = [self.counter.update(points)]
        if findings:
            guidance.extend(f.correction for f in findings[:2])
            if findings[0] != self._last_finding:
                self._last_finding = findings[0]
                self._events.publish(FindingChanged(findings[0]))
        else:
            guidance.append(messages.GUIDANCE_NO_FINDINGS)
            self._last_finding = None

        self.frame = FrameState(body_detected=True, findings=findings, guidance=guidance)
        return self.frame

    def toggle_view(self) -> None:
        """Switches between front and side analysis."""
        self.view = self.view.toggled()
        self._analyzer = create_posture_analyzer(self.view, self._config.posture)
        self._events.publish(Announcement(_VIEW_ANNOUNCEMENTS[self.view]))

    def select_mode(self, mode: ExerciseMode) -> None:
        """Selects an exercise mode and resets its counter.

        Args:
            mode: Mode to activate.
        """
        self.mode = mode
        self.counter = create_counter(mode, self._events, self._clock)
        if mode is ExerciseMode.POSTURE:
            self._events.publish(Announcement(messages.SPEAK_MODE_POSTURE))
            return
        exercise = get_exercise(mode)
        if self.view is not exercise.best_view:
            self.view = exercise.best_view
            self._analyzer = create_posture_analyzer(self.view, self._config.posture)
        self._events.publish(Announcement(exercise.copy.announcement))

    def toggle_timer(self) -> None:
        """Starts, pauses or resumes the session timer."""
        running = self.timer.toggle()
        if running:
            self.status_message = ""
        self._events.publish(
            Announcement(messages.SPEAK_TIMER_STARTED if running else messages.SPEAK_TIMER_PAUSED)
        )

    def save_session(self) -> bool:
        """Persists a summary of the current session.

        Returns:
            True if the summary was saved.
        """
        record = SessionRecord(
            date_time=self._now().isoformat(timespec="seconds"),
            duration_seconds=self.timer.elapsed_seconds(),
            view_mode=self.view.value,
            exercise=self.mode.value,
            repetitions=self.counter.reps,
            posture_observations="; ".join(f.title for f in self.frame.findings),
        )
        if not self._repository.append(record):
            self.status_message = messages.SAVE_FAILED
            return False
        self.history.append(record)
        self.status_message = messages.SAVED
        self._events.publish(Announcement(messages.SPEAK_SAVED))
        return True

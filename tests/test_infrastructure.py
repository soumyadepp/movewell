"""Tests for storage, progress, speech gating and the voice notifier."""

from physio_assistant import messages
from physio_assistant.analysis.progress import summarize
from physio_assistant.domain.models import ExerciseMode, SessionRecord
from physio_assistant.events import (
    Announcement,
    AnnouncementKind,
    BodyLost,
    EventBus,
    RepCounted,
)
from physio_assistant.infrastructure.storage import CsvSessionRepository
from physio_assistant.infrastructure.voice import CooldownGate
from physio_assistant.notifier import VoiceNotifier


def record(exercise: str = "ARM RAISE", reps: int = 3) -> SessionRecord:
    """Builds a session record with fixed metadata.

    Args:
        exercise: Exercise label.
        reps: Repetitions counted.

    Returns:
        The record.
    """
    return SessionRecord("2026-11-04T09:30:00", 60, "FRONT", exercise, reps, "")


def test_csv_round_trip(tmp_path):
    repo = CsvSessionRepository(tmp_path / "nested" / "history.csv")
    assert repo.load_all() == []

    assert repo.append(record(reps=3))
    assert repo.append(record(reps=5))
    assert repo.load_all() == [record(reps=3), record(reps=5)]


def test_csv_tolerates_malformed_numbers(tmp_path):
    path = tmp_path / "history.csv"
    path.write_text(
        "date_time,duration_seconds,view_mode,exercise,repetitions,posture_observations\n"
        "x,abc,FRONT,ARM RAISE,,\n",
        encoding="utf-8",
    )
    loaded = CsvSessionRepository(path).load_all()
    assert loaded[0].repetitions == 0
    assert loaded[0].duration_seconds == 0


def test_progress_averages_recent_sessions_of_mode():
    history = [record(reps=r) for r in (1, 2, 3, 4, 5, 6)] + [record("SIT-TO-STAND", 100)]
    summary = summarize(history, ExerciseMode.ARM_RAISE)

    assert summary.total_sessions == 7
    assert summary.recent_average_reps == 4.0


def test_cooldown_gate(clock):
    gate = CooldownGate(5.0, clock)
    assert gate.allow(force=False)
    assert not gate.allow(force=False)
    assert gate.allow(force=True)
    clock.advance(5)
    assert gate.allow(force=False)


class SpySpeaker:
    """Speaker that records every message instead of speaking it."""

    def __init__(self) -> None:
        """Creates a spy with no recorded calls."""
        self.calls: list[tuple[str, bool]] = []

    def say(self, message: str, force: bool = False) -> None:
        """Records one message.

        Args:
            message: Text that would be spoken.
            force: Whether the cooldown would be bypassed.
        """
        self.calls.append((message, force))

    def close(self) -> None:
        """Does nothing."""


def test_notifier_maps_events_to_speech():
    bus, speaker = EventBus(), SpySpeaker()
    VoiceNotifier(speaker).attach(bus)
    bus.publish(RepCounted(ExerciseMode.ARM_RAISE, 1))
    bus.publish(BodyLost())
    bus.publish(Announcement(AnnouncementKind.TIMER_STARTED))

    assert speaker.calls == [
        (messages.SPEAK_REP_COUNTED, False),
        (messages.SPEAK_MOVE_INTO_VIEW, False),
        (messages.SPEAK_TIMER_STARTED, True),
    ]

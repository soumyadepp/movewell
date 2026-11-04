"""Progress summaries derived from saved session history."""

from collections.abc import Sequence
from dataclasses import dataclass

from physio_assistant.domain.models import ExerciseMode, SessionRecord


@dataclass(frozen=True)
class ProgressSummary:
    """Headline progress numbers for the dashboard.

    Attributes:
        total_sessions: Number of saved sessions across every mode.
        recent_average_reps: Mean repetitions over the most recent sessions of one mode.
    """

    total_sessions: int
    recent_average_reps: float


def summarize(
    history: Sequence[SessionRecord], mode: ExerciseMode, window: int = 5
) -> ProgressSummary:
    """Summarizes history for the selected exercise.

    Args:
        history: Saved sessions, oldest first.
        mode: Exercise to average over.
        window: Number of most recent matching sessions to average.

    Returns:
        The progress summary.
    """
    recent = [r.repetitions for r in history if r.exercise == mode.value][-window:]
    average = sum(recent) / len(recent) if recent else 0.0
    return ProgressSummary(total_sessions=len(history), recent_average_reps=average)

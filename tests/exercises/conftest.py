"""Fixtures shared by the per-exercise tests."""

import pytest

from physio_assistant.analysis.counting import create_counter
from physio_assistant.domain.models import ExerciseMode
from tests.conftest import FakeClock, RecordingBus


@pytest.fixture
def counter_for():
    """Provides a factory that builds a counter with its own clock and bus.

    Returns:
        A callable taking a mode and returning ``(counter, clock, bus)``.
    """

    def build(mode: ExerciseMode):
        """Builds a counter for one mode.

        Args:
            mode: Mode to count.

        Returns:
            The counter, its fake clock and its recording bus.
        """
        clock, bus = FakeClock(), RecordingBus()
        return create_counter(mode, bus, clock), clock, bus

    return build

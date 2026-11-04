"""Fixtures shared by the per-exercise tests."""

import pytest

from physio_assistant.analysis.counting import create_counter
from physio_assistant.domain.models import ExerciseMode
from tests.conftest import FakeClock, RecordingBus


@pytest.fixture
def counter_for():
    """Returns a factory building a counter for a mode with its own clock and bus."""

    def build(mode: ExerciseMode):
        clock, bus = FakeClock(), RecordingBus()
        return create_counter(mode, bus, clock), clock, bus

    return build

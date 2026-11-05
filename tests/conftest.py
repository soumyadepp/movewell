"""Shared fakes for unit tests."""

from datetime import datetime

import pytest

from physio_assistant.config import AppConfig
from physio_assistant.domain.models import SessionRecord
from physio_assistant.events import EventBus


class FakeClock:
    """Manually advanced monotonic clock."""

    def __init__(self) -> None:
        """Starts the clock at an arbitrary non-zero time."""
        self.now = 1000.0

    def __call__(self) -> float:
        """Returns the current fake time.

        Returns:
            Seconds on the fake clock.
        """
        return self.now

    def advance(self, seconds: float) -> None:
        """Moves time forward.

        Args:
            seconds: How far to advance.
        """
        self.now += seconds


class InMemoryRepository:
    """Session repository that keeps records in a list."""

    def __init__(self, records: list[SessionRecord] | None = None, fail: bool = False) -> None:
        """Creates the repository.

        Args:
            records: Records already saved.
            fail: Whether every append should fail.
        """
        self.records = list(records or [])
        self.fail = fail

    def load_all(self) -> list[SessionRecord]:
        """Returns a copy of the saved records.

        Returns:
            Saved records, oldest first.
        """
        return list(self.records)

    def append(self, record: SessionRecord) -> bool:
        """Saves one record unless configured to fail.

        Args:
            record: Session to save.

        Returns:
            True when saved, False when configured to fail.
        """
        if self.fail:
            return False
        self.records.append(record)
        return True


class RecordingBus(EventBus):
    """Event bus that also keeps every published event."""

    def __init__(self) -> None:
        """Creates an empty recording bus."""
        super().__init__()
        self.published: list[object] = []

    def publish(self, event: object) -> None:
        """Records the event, then delivers it to subscribers.

        Args:
            event: Event instance.
        """
        self.published.append(event)
        super().publish(event)

    def of_type(self, event_type: type) -> list[object]:
        """Returns published events of one type.

        Args:
            event_type: Event class to filter by.

        Returns:
            Matching events in publish order.
        """
        return [e for e in self.published if isinstance(e, event_type)]


@pytest.fixture
def clock() -> FakeClock:
    """Provides a fresh fake clock.

    Returns:
        A clock starting at a fixed time.
    """
    return FakeClock()


@pytest.fixture
def bus() -> RecordingBus:
    """Provides a fresh recording event bus.

    Returns:
        An empty recording bus.
    """
    return RecordingBus()


@pytest.fixture
def config() -> AppConfig:
    """Provides the default app config.

    Returns:
        Default settings.
    """
    return AppConfig()


@pytest.fixture
def fixed_now() -> datetime:
    """Provides a fixed wall-clock time for saved sessions.

    Returns:
        A constant datetime.
    """
    return datetime(2026, 11, 4, 9, 30, 0)

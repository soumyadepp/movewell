"""Shared fakes for unit tests."""

from datetime import datetime

import pytest

from physio_assistant.config import AppConfig
from physio_assistant.domain.models import SessionRecord
from physio_assistant.events import EventBus


class FakeClock:
    """Manually advanced monotonic clock."""

    def __init__(self) -> None:
        self.now = 1000.0

    def __call__(self) -> float:
        return self.now

    def advance(self, seconds: float) -> None:
        """Moves time forward."""
        self.now += seconds


class InMemoryRepository:
    """Session repository that keeps records in a list."""

    def __init__(self, records: list[SessionRecord] | None = None, fail: bool = False) -> None:
        self.records = list(records or [])
        self.fail = fail

    def load_all(self) -> list[SessionRecord]:
        return list(self.records)

    def append(self, record: SessionRecord) -> bool:
        if self.fail:
            return False
        self.records.append(record)
        return True


class RecordingBus(EventBus):
    """Event bus that also keeps every published event."""

    def __init__(self) -> None:
        super().__init__()
        self.published: list[object] = []

    def publish(self, event: object) -> None:
        self.published.append(event)
        super().publish(event)

    def of_type(self, event_type: type) -> list[object]:
        """Returns published events of one type."""
        return [e for e in self.published if isinstance(e, event_type)]


@pytest.fixture
def clock() -> FakeClock:
    return FakeClock()


@pytest.fixture
def bus() -> RecordingBus:
    return RecordingBus()


@pytest.fixture
def config() -> AppConfig:
    return AppConfig()


@pytest.fixture
def fixed_now() -> datetime:
    return datetime(2026, 11, 4, 9, 30, 0)

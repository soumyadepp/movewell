"""In-process publish/subscribe so analysis code never calls I/O directly."""

from collections import defaultdict
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

from physio_assistant.domain.models import ExerciseMode, Finding


@dataclass(frozen=True)
class RepCounted:
    """A repetition was counted.

    Attributes:
        mode: Exercise being counted.
        total: Running total after this repetition.
    """

    mode: ExerciseMode
    total: int


@dataclass(frozen=True)
class FindingChanged:
    """The leading posture finding differs from the previous frame.

    Attributes:
        finding: The new leading finding.
    """

    finding: Finding


@dataclass(frozen=True)
class BodyLost:
    """No person was detected in the frame."""


@dataclass(frozen=True)
class Announcement:
    """A user action produced a message that should be spoken.

    Attributes:
        message: Text to speak.
        force: Whether to bypass the speech cooldown.
    """

    message: str
    force: bool = True


Handler = Callable[[Any], None]


class EventBus:
    """Synchronous observer registry keyed by event type."""

    def __init__(self) -> None:
        self._handlers: dict[type, list[Handler]] = defaultdict(list)

    def subscribe(self, event_type: type, handler: Handler) -> None:
        """Registers a handler for one event type.

        Args:
            event_type: Event class to listen for.
            handler: Callable invoked with the event instance.
        """
        self._handlers[event_type].append(handler)

    def publish(self, event: object) -> None:
        """Delivers an event to every handler registered for its exact type.

        Args:
            event: Event instance.
        """
        for handler in self._handlers.get(type(event), ()):
            handler(event)

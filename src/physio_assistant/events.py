"""In-process publish/subscribe so analysis code never calls I/O directly."""

from collections import defaultdict
from collections.abc import Callable
from dataclasses import dataclass
from enum import StrEnum
from typing import Any

from physio_assistant.domain.models import ExerciseMode, Finding, ViewMode


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


class AnnouncementKind(StrEnum):
    """What a user action changed, as a code the voice layer turns into speech."""

    VIEW_SELECTED = "view_selected"
    MODE_SELECTED = "mode_selected"
    TIMER_STARTED = "timer_started"
    TIMER_PAUSED = "timer_paused"
    SESSION_SAVED = "session_saved"


@dataclass(frozen=True)
class Announcement:
    """A user action produced something that should be spoken.

    Attributes:
        kind: What happened.
        view: The newly selected view, for ``VIEW_SELECTED``.
        mode: The newly selected mode, for ``MODE_SELECTED``.
        force: Whether to bypass the speech cooldown.
    """

    kind: AnnouncementKind
    view: ViewMode | None = None
    mode: ExerciseMode | None = None
    force: bool = True


Handler = Callable[[Any], None]


class EventBus:
    """Synchronous observer registry keyed by event type."""

    def __init__(self) -> None:
        """Creates a bus with no subscribers."""
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

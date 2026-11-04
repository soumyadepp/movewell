"""Observer that turns domain events into spoken feedback."""

from physio_assistant import messages
from physio_assistant.events import Announcement, BodyLost, EventBus, FindingChanged, RepCounted
from physio_assistant.infrastructure.voice import Speaker


class VoiceNotifier:
    """Subscribes to the event bus and speaks the matching message."""

    def __init__(self, speaker: Speaker) -> None:
        self._speaker = speaker

    def attach(self, events: EventBus) -> None:
        """Registers handlers on the bus.

        Args:
            events: Bus to listen on.
        """
        events.subscribe(RepCounted, self._on_rep)
        events.subscribe(FindingChanged, self._on_finding)
        events.subscribe(BodyLost, self._on_body_lost)
        events.subscribe(Announcement, self._on_announcement)

    def _on_rep(self, event: RepCounted) -> None:
        self._speaker.say(messages.SPEAK_REP_COUNTED)

    def _on_finding(self, event: FindingChanged) -> None:
        self._speaker.say(event.finding.correction)

    def _on_body_lost(self, event: BodyLost) -> None:
        self._speaker.say(messages.SPEAK_MOVE_INTO_VIEW)

    def _on_announcement(self, event: Announcement) -> None:
        self._speaker.say(event.message, force=event.force)

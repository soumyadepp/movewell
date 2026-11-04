"""Spoken feedback. Speech is optional; the app runs silently without pyttsx3."""

import contextlib
import logging
import queue
import threading
import time
from collections.abc import Callable
from typing import Protocol

from physio_assistant import messages
from physio_assistant.config import VoiceConfig

logger = logging.getLogger(__name__)


class Speaker(Protocol):
    """Port for anything that can speak a short message."""

    def say(self, message: str, force: bool = False) -> None:
        """Queues a message, subject to cooldown unless forced."""
        ...

    def close(self) -> None:
        """Releases resources."""
        ...


class SilentSpeaker:
    """Null Object used when speech is disabled or unavailable."""

    def say(self, message: str, force: bool = False) -> None:
        """Discards the message."""

    def close(self) -> None:
        """Does nothing."""


class CooldownGate:
    """Decides whether an unforced message may be spoken yet."""

    def __init__(self, cooldown_s: float, clock: Callable[[], float] = time.monotonic) -> None:
        self._cooldown_s = cooldown_s
        self._clock = clock
        self._last_time = float("-inf")

    def allow(self, force: bool) -> bool:
        """Returns True and records the time if the message may be spoken.

        Args:
            force: Whether to bypass the cooldown.

        Returns:
            True if the message should be spoken.
        """
        now = self._clock()
        if not force and now - self._last_time < self._cooldown_s:
            return False
        self._last_time = now
        return True


class Pyttsx3Speaker:
    """Text-to-speech on one dedicated worker thread.

    pyttsx3 engines are not thread safe, so every call goes through a queue
    consumed by a single thread that owns the engine.
    """

    def __init__(self, config: VoiceConfig) -> None:
        import pyttsx3

        self._engine = pyttsx3.init()
        self._engine.setProperty("rate", config.rate)
        self._engine.setProperty("volume", config.volume)
        self._gate = CooldownGate(config.cooldown_s)
        self._queue: queue.Queue[str | None] = queue.Queue(maxsize=4)
        self._worker = threading.Thread(target=self._run, daemon=True)
        self._worker.start()

    def say(self, message: str, force: bool = False) -> None:
        """Queues a message, dropping it if the queue is full or cooldown applies."""
        if not message or not self._gate.allow(force):
            return
        try:
            self._queue.put_nowait(message)
        except queue.Full:
            logger.debug("Speech queue full, dropping: %s", message)

    def close(self) -> None:
        """Stops the worker thread."""
        with contextlib.suppress(queue.Full):
            self._queue.put_nowait(None)

    def _run(self) -> None:
        while (message := self._queue.get()) is not None:
            try:
                self._engine.say(message)
                self._engine.runAndWait()
            except Exception as exc:
                logger.warning(messages.SPEECH_ERROR.format(error=exc))


def create_speaker(config: VoiceConfig) -> Speaker:
    """Factory returning a real speaker when possible, otherwise a silent one.

    Args:
        config: Voice settings.

    Returns:
        A speaker implementation.
    """
    if not config.enabled:
        return SilentSpeaker()
    try:
        return Pyttsx3Speaker(config)
    except Exception as exc:
        logger.warning(messages.SPEECH_UNAVAILABLE.format(error=exc))
        return SilentSpeaker()

"""Session timer that survives pause and resume."""

import time
from collections.abc import Callable


class SessionTimer:
    """Stopwatch that accumulates active time across pauses."""

    def __init__(self, clock: Callable[[], float] = time.monotonic) -> None:
        """Creates a paused timer at zero.

        Args:
            clock: Monotonic time source, injectable for tests.
        """
        self._clock = clock
        self._accumulated = 0.0
        self._started_at: float | None = None

    @property
    def running(self) -> bool:
        """Whether the timer is currently counting."""
        return self._started_at is not None

    def toggle(self) -> bool:
        """Starts the timer if paused, or pauses it if running.

        Returns:
            True if the timer is running after the call.
        """
        now = self._clock()
        if self._started_at is None:
            self._started_at = now
            return True
        self._accumulated += now - self._started_at
        self._started_at = None
        return False

    def elapsed_seconds(self) -> int:
        """Returns the total active time so far.

        Returns:
            Whole seconds counted while running, across pauses.
        """
        live = self._clock() - self._started_at if self._started_at is not None else 0.0
        return int(self._accumulated + live)

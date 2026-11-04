"""Session history repository."""

import csv
import logging
from pathlib import Path
from typing import Protocol

from physio_assistant import messages
from physio_assistant.domain.models import SessionRecord

logger = logging.getLogger(__name__)


class SessionRepository(Protocol):
    """Port for persisting session summaries."""

    def load_all(self) -> list[SessionRecord]:
        """Returns every saved session, oldest first."""
        ...

    def append(self, record: SessionRecord) -> bool:
        """Persists one session. Returns False on failure."""
        ...


class CsvSessionRepository:
    """Appends session summaries to a local CSV file."""

    def __init__(self, path: Path) -> None:
        self.path = path

    def load_all(self) -> list[SessionRecord]:
        """Reads the CSV, returning an empty list if it is missing or unreadable."""
        if not self.path.exists():
            return []
        try:
            with self.path.open("r", newline="", encoding="utf-8") as fh:
                return [SessionRecord.from_row(row) for row in csv.DictReader(fh)]
        except (OSError, csv.Error) as exc:
            logger.warning("Could not read history: %s", exc)
            return []

    def append(self, record: SessionRecord) -> bool:
        """Appends one row, writing the header for a new file.

        Args:
            record: Session to save.

        Returns:
            True on success.
        """
        try:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            is_new = not self.path.exists()
            with self.path.open("a", newline="", encoding="utf-8") as fh:
                writer = csv.DictWriter(fh, fieldnames=SessionRecord.FIELDS)
                if is_new:
                    writer.writeheader()
                writer.writerow(record.to_row())
            return True
        except OSError as exc:
            logger.error(messages.SAVE_FAILED_LOG.format(error=exc))
            return False

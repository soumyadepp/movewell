"""OpenCV webcam adapter."""

from types import TracebackType

import cv2
import numpy as np

from physio_assistant.config import CameraConfig


class CameraUnavailableError(RuntimeError):
    """Raised when the webcam cannot be opened."""


class Webcam:
    """Context-managed webcam that yields BGR frames."""

    def __init__(self, config: CameraConfig) -> None:
        self._config = config
        self._capture: cv2.VideoCapture | None = None

    def __enter__(self) -> "Webcam":
        capture = cv2.VideoCapture(self._config.index)
        capture.set(cv2.CAP_PROP_FRAME_WIDTH, self._config.width)
        capture.set(cv2.CAP_PROP_FRAME_HEIGHT, self._config.height)
        if not capture.isOpened():
            capture.release()
            raise CameraUnavailableError(f"Camera index {self._config.index} could not be opened")
        self._capture = capture
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        tb: TracebackType | None,
    ) -> None:
        if self._capture is not None:
            self._capture.release()
            self._capture = None

    def read(self) -> np.ndarray | None:
        """Returns the next frame, mirrored if configured, or None on failure."""
        if self._capture is None:
            return None
        ok, frame = self._capture.read()
        if not ok:
            return None
        return cv2.flip(frame, 1) if self._config.mirror else frame

"""OpenCV webcam adapter."""

from types import TracebackType

import cv2
import numpy as np

from physio_assistant.config import CameraConfig
from physio_assistant.infrastructure.frames import Frame


class CameraUnavailableError(RuntimeError):
    """Raised when the webcam cannot be opened."""


class Webcam:
    """Context-managed webcam that yields BGR frames."""

    def __init__(self, config: CameraConfig) -> None:
        """Creates an unopened webcam.

        Args:
            config: Camera index, resolution and mirroring.
        """
        self._config = config
        self._capture: cv2.VideoCapture | None = None

    def __enter__(self) -> "Webcam":
        """Opens the camera at the configured resolution.

        Returns:
            This webcam, ready to read.

        Raises:
            CameraUnavailableError: If the camera cannot be opened.
        """
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
        """Releases the camera.

        Args:
            exc_type: Exception type raised in the block, if any.
            exc: Exception raised in the block, if any.
            tb: Traceback of that exception, if any.
        """
        if self._capture is not None:
            self._capture.release()
            self._capture = None

    def read(self) -> Frame | None:
        """Reads the next frame, mirrored if configured.

        Returns:
            The BGR frame, or None if the camera is closed or the read failed.
        """
        if self._capture is None:
            return None
        ok, frame = self._capture.read()
        if not ok:
            return None
        image = cv2.flip(frame, 1) if self._config.mirror else frame
        return np.asarray(image, dtype=np.uint8)

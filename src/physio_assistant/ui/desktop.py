"""Desktop frame loop: camera in, OpenCV window out."""

import logging

import cv2

from physio_assistant import messages
from physio_assistant.assistant import Assistant
from physio_assistant.infrastructure.camera import Webcam
from physio_assistant.infrastructure.pose import PoseEstimator
from physio_assistant.ui.commands import dispatch
from physio_assistant.ui.dashboard import DashboardRenderer

logger = logging.getLogger(__name__)


class DesktopRunner:
    """Reads frames, runs the assistant, renders the dashboard and handles keys."""

    def __init__(
        self,
        window_name: str,
        camera: Webcam,
        estimator: PoseEstimator,
        assistant: Assistant,
        renderer: DashboardRenderer,
    ) -> None:
        """Creates a runner from already opened adapters.

        Args:
            window_name: Title of the OpenCV window.
            camera: Open webcam.
            estimator: Pose estimator inside its context.
            assistant: Application service fed with each frame.
            renderer: Draws the dashboard next to the frame.
        """
        self._window_name = window_name
        self._camera = camera
        self._estimator = estimator
        self._assistant = assistant
        self._renderer = renderer

    def run(self) -> None:
        """Runs until the user quits or the camera stops delivering frames."""
        try:
            while True:
                frame = self._camera.read()
                if frame is None:
                    logger.error(messages.CAMERA_READ_FAILED)
                    break
                detection = self._estimator.detect(frame)
                if detection is not None:
                    self._estimator.draw(frame, detection)
                self._assistant.process(detection.points if detection else None)
                cv2.imshow(self._window_name, self._renderer.render(frame, self._assistant))
                if not dispatch(cv2.waitKey(1) & 0xFF, self._assistant):
                    break
        finally:
            cv2.destroyAllWindows()

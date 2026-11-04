"""Pose estimation port and its MediaPipe adapter."""

from dataclasses import dataclass
from types import TracebackType
from typing import Any, Protocol

import cv2
import mediapipe as mp
import numpy as np

from physio_assistant.config import PoseConfig
from physio_assistant.domain.models import BodyPoints, Joint

_mp_pose = mp.solutions.pose
_mp_drawing = mp.solutions.drawing_utils

_LANDMARK_IDS: dict[Joint, int] = {
    joint: _mp_pose.PoseLandmark[joint.name].value for joint in Joint
}


@dataclass(frozen=True)
class PoseDetection:
    """Result of running the pose model on one frame.

    Attributes:
        points: Visible joints in pixel coordinates.
        raw: Backend-specific landmarks, used only for drawing the skeleton.
    """

    points: BodyPoints
    raw: Any


class PoseEstimator(Protocol):
    """Port for any pose model. The app depends on this, not on MediaPipe."""

    def detect(self, frame_bgr: np.ndarray) -> PoseDetection | None:
        """Returns the detected pose, or None when nobody is in frame."""
        ...

    def draw(self, frame_bgr: np.ndarray, detection: PoseDetection) -> None:
        """Draws the skeleton onto the frame in place."""
        ...


class MediaPipePoseEstimator:
    """MediaPipe BlazePose adapter. Use as a context manager to free native resources."""

    def __init__(self, config: PoseConfig) -> None:
        self._config = config
        self._pose: Any = None
        self._landmark_style = _mp_drawing.DrawingSpec(
            color=(0, 255, 255), thickness=2, circle_radius=3
        )
        self._connection_style = _mp_drawing.DrawingSpec(color=(245, 245, 245), thickness=2)

    def __enter__(self) -> "MediaPipePoseEstimator":
        self._pose = _mp_pose.Pose(
            static_image_mode=False,
            model_complexity=self._config.model_complexity,
            smooth_landmarks=True,
            enable_segmentation=False,
            min_detection_confidence=self._config.min_detection_confidence,
            min_tracking_confidence=self._config.min_tracking_confidence,
        )
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        tb: TracebackType | None,
    ) -> None:
        if self._pose is not None:
            self._pose.close()
            self._pose = None

    def detect(self, frame_bgr: np.ndarray) -> PoseDetection | None:
        """Runs the model and converts visible landmarks to pixel coordinates.

        Args:
            frame_bgr: Frame in OpenCV BGR order.

        Returns:
            The detection, or None when no person is found.

        Raises:
            RuntimeError: If called outside the context manager.
        """
        if self._pose is None:
            raise RuntimeError("MediaPipePoseEstimator must be used as a context manager")
        results = self._pose.process(cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB))
        if not results.pose_landmarks:
            return None
        height, width = frame_bgr.shape[:2]
        landmarks = results.pose_landmarks.landmark
        points = {}
        for joint, landmark_id in _LANDMARK_IDS.items():
            lm = landmarks[landmark_id]
            if lm.visibility >= self._config.visibility_threshold:
                points[joint] = (int(lm.x * width), int(lm.y * height))
        return PoseDetection(points=BodyPoints(points), raw=results.pose_landmarks)

    def draw(self, frame_bgr: np.ndarray, detection: PoseDetection) -> None:
        """Draws the MediaPipe skeleton onto the frame in place."""
        _mp_drawing.draw_landmarks(
            frame_bgr,
            detection.raw,
            _mp_pose.POSE_CONNECTIONS,
            self._landmark_style,
            self._connection_style,
        )

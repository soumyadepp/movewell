"""Pose estimation port and its MediaPipe adapter."""

from collections.abc import Sequence
from dataclasses import dataclass
from types import TracebackType
from typing import Any, Protocol

import cv2
import mediapipe as mp
import numpy as np

from physio_assistant.config import PoseConfig
from physio_assistant.domain.models import BodyPoints, Joint, Point, Point3

_mp_pose = mp.solutions.pose
_mp_drawing = mp.solutions.drawing_utils

_LANDMARK_IDS: dict[Joint, int] = {
    joint: _mp_pose.PoseLandmark[joint.name].value for joint in Joint
}


def to_body_points(
    landmarks: Sequence[Any],
    world: Sequence[Any],
    width: int,
    height: int,
    visibility_threshold: float,
) -> BodyPoints:
    """Converts MediaPipe landmarks into body points.

    Image points use the frame's real pixel size, so proportions are correct
    for any camera aspect ratio. World points (metres, 3-D) are kept for the
    same visible joints and are used for joint angles.

    Args:
        landmarks: Normalized image landmarks with ``x``, ``y`` and ``visibility``.
        world: World landmarks with ``x``, ``y`` and ``z``, possibly empty.
        width: Frame width in pixels.
        height: Frame height in pixels.
        visibility_threshold: Minimum visibility for a joint to be kept.

    Returns:
        Body points for the frame.
    """
    points: dict[Joint, Point] = {}
    world_points: dict[Joint, Point3] = {}
    for joint, landmark_id in _LANDMARK_IDS.items():
        lm = landmarks[landmark_id]
        if lm.visibility < visibility_threshold:
            continue
        points[joint] = (lm.x * width, lm.y * height)
        if landmark_id < len(world):
            w = world[landmark_id]
            world_points[joint] = (w.x, w.y, w.z)
    return BodyPoints(points, world_points)


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
        world = results.pose_world_landmarks.landmark if results.pose_world_landmarks else []
        points = to_body_points(
            results.pose_landmarks.landmark, world, width, height, self._config.visibility_threshold
        )
        return PoseDetection(points=points, raw=results.pose_landmarks)

    def draw(self, frame_bgr: np.ndarray, detection: PoseDetection) -> None:
        """Draws the MediaPipe skeleton onto the frame in place."""
        _mp_drawing.draw_landmarks(
            frame_bgr,
            detection.raw,
            _mp_pose.POSE_CONNECTIONS,
            self._landmark_style,
            self._connection_style,
        )

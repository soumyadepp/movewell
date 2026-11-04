"""Typed, immutable configuration for every layer of the app."""

from dataclasses import dataclass, field
from pathlib import Path


@dataclass(frozen=True)
class CameraConfig:
    """Webcam capture settings.

    Attributes:
        index: OpenCV camera index.
        width: Requested frame width in pixels.
        height: Requested frame height in pixels.
        mirror: Whether to flip frames horizontally so the view acts like a mirror.
    """

    index: int = 0
    width: int = 960
    height: int = 720
    mirror: bool = True


@dataclass(frozen=True)
class PoseConfig:
    """Pose model settings.

    Attributes:
        visibility_threshold: Minimum landmark visibility to treat a joint as seen.
        model_complexity: MediaPipe model complexity (0, 1 or 2).
        min_detection_confidence: Minimum confidence for initial person detection.
        min_tracking_confidence: Minimum confidence to keep tracking between frames.
    """

    visibility_threshold: float = 0.5
    model_complexity: int = 1
    min_detection_confidence: float = 0.5
    min_tracking_confidence: float = 0.5


@dataclass(frozen=True)
class PostureThresholds:
    """Pixel and angle thresholds used by the heuristic posture rules.

    Attributes:
        shoulder_height_diff_px: Front view shoulder level difference that raises a flag.
        hip_height_diff_px: Front view hip level difference that raises a flag.
        trunk_shift_px: Front view horizontal shoulder-to-hip midpoint offset.
        knee_ankle_offset_px: Front view horizontal knee-to-ankle offset.
        head_forward_px: Side view horizontal ear-to-shoulder offset.
        trunk_incline_px: Side view horizontal shoulder-to-hip offset.
        bent_knee_deg: Side view knee angle below which the knee counts as bent.
    """

    shoulder_height_diff_px: float = 28
    hip_height_diff_px: float = 32
    trunk_shift_px: float = 35
    knee_ankle_offset_px: float = 55
    head_forward_px: float = 45
    trunk_incline_px: float = 65
    bent_knee_deg: float = 145


@dataclass(frozen=True)
class VoiceConfig:
    """Spoken feedback settings.

    Attributes:
        enabled: Whether to attempt text-to-speech at all.
        rate: Words per minute.
        volume: Volume between 0 and 1.
        cooldown_s: Minimum seconds between two unforced messages.
    """

    enabled: bool = True
    rate: int = 165
    volume: float = 0.9
    cooldown_s: float = 5.0


@dataclass(frozen=True)
class AppConfig:
    """Root configuration object passed to the composition root.

    Attributes:
        window_name: Title of the OpenCV window.
        data_file: CSV file where session summaries are appended.
        camera: Webcam settings.
        pose: Pose model settings.
        posture: Posture rule thresholds.
        voice: Spoken feedback settings.
    """

    window_name: str = "AI Physiotherapy Assistant"
    data_file: Path = Path("physio_session_history.csv")
    camera: CameraConfig = field(default_factory=CameraConfig)
    pose: PoseConfig = field(default_factory=PoseConfig)
    posture: PostureThresholds = field(default_factory=PostureThresholds)
    voice: VoiceConfig = field(default_factory=VoiceConfig)

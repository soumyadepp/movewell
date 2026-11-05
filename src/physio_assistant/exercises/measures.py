"""Measurement helpers shared by several exercises."""

from physio_assistant.domain.geometry import calculate_angle, joint_angle_3d, midpoint
from physio_assistant.domain.models import BodyPoints, Joint, Point, ViewMode
from physio_assistant.exercises.base import Angle, Blocked, BlockReason, Reading

FACING_RATIO = 0.45
"""Shoulder width relative to torso length that separates facing the camera from side-on."""

STANDING_LEG_MAX_DEG = 15.0
"""The supporting leg must stay within this many degrees of vertical."""


def below(point: Point) -> Point:
    """Returns a point straight below ``point`` in image coordinates.

    Args:
        point: Reference point.

    Returns:
        A point 100 pixels below the reference.
    """
    return (point[0], point[1] + 100.0)


def above(point: Point) -> Point:
    """Returns a point straight above ``point`` in image coordinates.

    Args:
        point: Reference point.

    Returns:
        A point 100 pixels above the reference.
    """
    return (point[0], point[1] - 100.0)


def from_vertical(start: Point | None, end: Point | None) -> float | None:
    """Returns the angle of the segment ``start`` to ``end`` away from straight down.

    Args:
        start: Segment start, e.g. a hip.
        end: Segment end, e.g. a knee.

    Returns:
        Degrees from vertical, or None if either point is missing.
    """
    if start is None or end is None:
        return None
    return calculate_angle(end, start, below(start))


def orientation_block(points: BodyPoints, view: ViewMode) -> BlockReason | None:
    """Checks that the person faces the camera (front) or stands side-on (side).

    Args:
        points: Visible joints for the frame.
        view: Orientation the exercise needs.

    Returns:
        The block reason, or None when the orientation is fine or cannot be
        judged because the hips are hidden.
    """
    left, right = points.get(Joint.LEFT_SHOULDER), points.get(Joint.RIGHT_SHOULDER)
    shoulders = midpoint(left, right)
    hips = midpoint(points.get(Joint.LEFT_HIP), points.get(Joint.RIGHT_HIP))
    if left is None or right is None or shoulders is None or hips is None:
        return None
    torso = ((shoulders[0] - hips[0]) ** 2 + (shoulders[1] - hips[1]) ** 2) ** 0.5
    if torso == 0:
        return None
    ratio = abs(left[0] - right[0]) / torso
    if view is ViewMode.FRONT and ratio < FACING_RATIO:
        return BlockReason.FACE_CAMERA
    if view is ViewMode.SIDE and ratio >= FACING_RATIO:
        return BlockReason.TURN_SIDE
    return None


def shoulder_angle(points: BodyPoints, elbow: Joint, shoulder: Joint, hip: Joint) -> float | None:
    """Returns the upper-arm angle at the shoulder.

    Uses the hip as the reference (in 3-D when available) when it is visible,
    otherwise a point straight below the shoulder, so the reading still works
    when the hips are cropped out of frame.

    Args:
        points: Visible joints for the frame.
        elbow: Elbow joint.
        shoulder: Shoulder joint (vertex).
        hip: Preferred reference joint.

    Returns:
        The angle in degrees, or None if the elbow or shoulder is not visible.
    """
    if points.get(hip) is not None:
        return joint_angle_3d(points, elbow, shoulder, hip)
    e, s = points.get(elbow), points.get(shoulder)
    if e is None or s is None:
        return None
    return calculate_angle(e, s, below(s))


def reading(angle: float | None) -> Reading:
    """Wraps an optional angle as a reading, treating None as not visible.

    Args:
        angle: Measured angle in degrees, or None.

    Returns:
        ``Angle`` for a value, otherwise ``Blocked`` with ``NOT_VISIBLE``.
    """
    return Blocked(BlockReason.NOT_VISIBLE) if angle is None else Angle(angle)

"""2-D geometry helpers on pixel coordinates."""

import math
from collections.abc import Iterable, Sequence

from physio_assistant.domain.models import BodyPoints, Joint, Point


def calculate_angle(a: Sequence[float], b: Sequence[float], c: Sequence[float]) -> float | None:
    """Returns the angle ABC in degrees for 2-D or 3-D points.

    Args:
        a: First end point.
        b: Vertex.
        c: Second end point.

    Returns:
        The angle in degrees, or None when either arm has zero length.
    """
    ba = [x - y for x, y in zip(a, b, strict=False)]
    bc = [x - y for x, y in zip(c, b, strict=False)]
    denom = math.hypot(*ba) * math.hypot(*bc)
    if denom == 0:
        return None
    dot = sum(u * v for u, v in zip(ba, bc, strict=False))
    return math.degrees(math.acos(max(-1.0, min(1.0, dot / denom))))


def midpoint(p1: Point | None, p2: Point | None) -> Point | None:
    """Returns the midpoint of two points, or None if either is missing."""
    if p1 is None or p2 is None:
        return None
    return ((p1[0] + p2[0]) / 2.0, (p1[1] + p2[1]) / 2.0)


def safe_average(values: Iterable[float | None]) -> float | None:
    """Returns the mean of the finite values, ignoring None and NaN.

    Args:
        values: Candidate numbers.

    Returns:
        The mean, or None when no finite value is present.
    """
    finite = [v for v in values if v is not None and math.isfinite(v)]
    return sum(finite) / len(finite) if finite else None


def joint_angle(points: BodyPoints, a: Joint, vertex: Joint, c: Joint) -> float | None:
    """Returns the angle at ``vertex`` formed by three joints.

    Args:
        points: Visible joints for the frame.
        a: First end joint.
        vertex: Joint at which the angle is measured.
        c: Second end joint.

    Returns:
        The angle in degrees, or None if any joint is not visible.
    """
    pa, pb, pc = points.get(a), points.get(vertex), points.get(c)
    if pa is None or pb is None or pc is None:
        return None
    return calculate_angle(pa, pb, pc)


def joint_angle_3d(points: BodyPoints, a: Joint, vertex: Joint, c: Joint) -> float | None:
    """Returns the joint angle using 3-D world points when all three are known.

    Falls back to image points otherwise. World angles are not shortened when
    the limb moves toward the camera.

    Args:
        points: Visible joints for the frame.
        a: First end joint.
        vertex: Joint at which the angle is measured.
        c: Second end joint.

    Returns:
        The angle in degrees, or None if any joint is not visible.
    """
    wa, wb, wc = points.get3(a), points.get3(vertex), points.get3(c)
    if wa is not None and wb is not None and wc is not None:
        return calculate_angle(wa, wb, wc)
    return joint_angle(points, a, vertex, c)

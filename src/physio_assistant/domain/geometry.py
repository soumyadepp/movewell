"""2-D geometry helpers on pixel coordinates."""

import math
from collections.abc import Iterable

from physio_assistant.domain.models import BodyPoints, Joint, Point


def calculate_angle(a: Point, b: Point, c: Point) -> float | None:
    """Returns the angle ABC in degrees.

    Args:
        a: First end point.
        b: Vertex.
        c: Second end point.

    Returns:
        The angle in degrees, or None when either arm has zero length.
    """
    bax, bay = a[0] - b[0], a[1] - b[1]
    bcx, bcy = c[0] - b[0], c[1] - b[1]
    denom = math.hypot(bax, bay) * math.hypot(bcx, bcy)
    if denom == 0:
        return None
    cosine = max(-1.0, min(1.0, (bax * bcx + bay * bcy) / denom))
    return math.degrees(math.acos(cosine))


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

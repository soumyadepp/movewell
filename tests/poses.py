"""Builders for synthetic body poses in pixel coordinates."""

import math

from physio_assistant.domain.models import BodyPoints, Joint, Point


def upright_front() -> dict[Joint, Point]:
    """A level, centered person facing the camera."""
    return {
        Joint.NOSE: (480, 120),
        Joint.LEFT_EAR: (460, 120),
        Joint.RIGHT_EAR: (500, 120),
        Joint.LEFT_SHOULDER: (420, 200),
        Joint.RIGHT_SHOULDER: (540, 200),
        Joint.LEFT_ELBOW: (410, 290),
        Joint.RIGHT_ELBOW: (550, 290),
        Joint.LEFT_WRIST: (405, 370),
        Joint.RIGHT_WRIST: (555, 370),
        Joint.LEFT_HIP: (440, 400),
        Joint.RIGHT_HIP: (520, 400),
        Joint.LEFT_KNEE: (440, 530),
        Joint.RIGHT_KNEE: (520, 530),
        Joint.LEFT_ANKLE: (440, 660),
        Joint.RIGHT_ANKLE: (520, 660),
    }


def body(**overrides: Point) -> BodyPoints:
    """Returns an upright front pose with selected joints moved.

    Args:
        **overrides: Joint name to new pixel position.

    Returns:
        Body points.
    """
    points = upright_front()
    for name, value in overrides.items():
        points[Joint(name)] = value
    return BodyPoints(points)


def without(*joints: Joint) -> BodyPoints:
    """Returns an upright front pose with some joints hidden."""
    points = upright_front()
    for joint in joints:
        points.pop(joint, None)
    return BodyPoints(points)


def arms_at(angle_deg: float) -> BodyPoints:
    """Returns a pose whose elbow-shoulder-hip angle is ``angle_deg`` on both sides."""
    points = upright_front()
    length = 90
    rad = math.radians(angle_deg)
    for shoulder, elbow, sign in (
        (Joint.LEFT_SHOULDER, Joint.LEFT_ELBOW, -1),
        (Joint.RIGHT_SHOULDER, Joint.RIGHT_ELBOW, 1),
    ):
        sx, sy = points[shoulder]
        hip = Joint.LEFT_HIP if shoulder is Joint.LEFT_SHOULDER else Joint.RIGHT_HIP
        points[hip] = (sx, sy + 200)
        points[elbow] = (sx + sign * length * math.sin(rad), sy + length * math.cos(rad))
    return BodyPoints(points)


def knees_at(angle_deg: float) -> BodyPoints:
    """Returns a pose whose hip-knee-ankle angle is ``angle_deg`` on both sides."""
    points = upright_front()
    length = 130
    rad = math.radians(180 - angle_deg)
    for hip, knee, ankle in (
        (Joint.LEFT_HIP, Joint.LEFT_KNEE, Joint.LEFT_ANKLE),
        (Joint.RIGHT_HIP, Joint.RIGHT_KNEE, Joint.RIGHT_ANKLE),
    ):
        kx, ky = points[knee]
        points[hip] = (kx, ky - length)
        points[ankle] = (kx + length * math.sin(rad), ky + length * math.cos(rad))
    return BodyPoints(points)

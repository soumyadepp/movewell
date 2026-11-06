"""Builders for synthetic body poses in pixel coordinates."""

import math
from collections.abc import Callable
from typing import Protocol

from physio_assistant.analysis.counting import Counter
from physio_assistant.domain.models import BodyPoints, Joint, Point


class AdvancingClock(Protocol):
    """A test clock that can be moved forward."""

    def advance(self, seconds: float) -> None:
        """Moves time forward.

        Args:
            seconds: How far to move.
        """
        ...


def at(points: BodyPoints, joint: Joint) -> Point:
    """Returns a joint that a test pose is known to contain.

    Args:
        points: The pose.
        joint: The joint to read.

    Returns:
        The joint's position.

    Raises:
        AssertionError: If the pose does not contain the joint.
    """
    point = points.get(joint)
    assert point is not None, f"{joint} missing from test pose"
    return point


def upright_front() -> dict[Joint, Point]:
    """Builds a level, centered person facing the camera.

    Returns:
        Mapping from joint to pixel position.
    """
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
    """Returns an upright front pose with some joints hidden.

    Args:
        *joints: Joints to remove.

    Returns:
        Body points.
    """
    points = upright_front()
    for joint in joints:
        points.pop(joint, None)
    return BodyPoints(points)


def arms_at(angle_deg: float) -> BodyPoints:
    """Returns a pose whose elbow-shoulder-hip angle is ``angle_deg`` on both sides.

    Args:
        angle_deg: Arm angle at the shoulder.

    Returns:
        Body points.
    """
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
    """Returns a pose whose hip-knee-ankle angle is ``angle_deg`` on both sides.

    Args:
        angle_deg: Knee angle.

    Returns:
        Body points.
    """
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


def hold(
    update: Callable[[BodyPoints], object],
    points: BodyPoints,
    clock: AdvancingClock,
    seconds: float = 0.5,
    fps: int = 30,
) -> None:
    """Feeds the same pose for ``seconds`` at ``fps`` frames per second.

    Args:
        update: Callable receiving each frame's points.
        points: Pose to hold.
        clock: Fake clock to advance.
        seconds: How long to hold.
        fps: Frames per second.
    """
    for _ in range(round(seconds * fps)):
        update(points)
        clock.advance(1 / fps)


def reps(
    counter: Counter, clock: AdvancingClock, low: BodyPoints, high: BodyPoints, cycles: int = 1
) -> int:
    """Holds ``low`` then ``high`` for ``cycles`` repetitions.

    Args:
        counter: Counter under test.
        clock: Fake clock to advance.
        low: Pose for the low phase.
        high: Pose for the high phase.
        cycles: Number of low-high cycles.

    Returns:
        The counter's repetition total afterwards.
    """
    for _ in range(cycles):
        hold(counter.update, low, clock, 0.8)
        hold(counter.update, high, clock, 0.8)
    return counter.reps


def curled(degrees: float) -> BodyPoints:
    """Returns a front pose with the left elbow flexed and the upper arm by the side.

    Args:
        degrees: Elbow flexion.

    Returns:
        Body points.
    """
    rad = math.radians(degrees)
    return body(left_wrist=(410 + 80 * math.sin(rad), 290 + 80 * math.cos(rad)))


def one_arm_up(degrees: float) -> BodyPoints:
    """Returns a front pose with only the left arm raised to ``degrees``.

    Args:
        degrees: Left arm angle at the shoulder.

    Returns:
        Body points.
    """
    raised, down = arms_at(degrees), arms_at(5)
    points = dict(upright_front())
    points[Joint.LEFT_ELBOW] = at(raised, Joint.LEFT_ELBOW)
    points[Joint.LEFT_HIP] = at(raised, Joint.LEFT_HIP)
    points[Joint.RIGHT_ELBOW] = at(down, Joint.RIGHT_ELBOW)
    points[Joint.RIGHT_HIP] = at(down, Joint.RIGHT_HIP)
    return BodyPoints(points)


def legs_out(degrees: float, standing_degrees: float = 0) -> BodyPoints:
    """Returns a front pose with the right leg abducted and the left at ``standing_degrees``.

    Args:
        degrees: Right leg angle from vertical.
        standing_degrees: Left leg angle from vertical.

    Returns:
        Body points.
    """

    def leg(hip_x: float, sign: int, deg: float) -> tuple[Point, Point]:
        """Places one knee and ankle at an angle from the hip.

        Args:
            hip_x: Hip x position in pixels.
            sign: Direction of abduction, 1 for right and -1 for left.
            deg: Leg angle from vertical.

        Returns:
            The knee and ankle positions.
        """
        rad = math.radians(deg)
        knee = (hip_x + sign * 130 * math.sin(rad), 400 + 130 * math.cos(rad))
        ankle = (hip_x + sign * 260 * math.sin(rad), 400 + 260 * math.cos(rad))
        return knee, ankle

    right_knee, right_ankle = leg(520, 1, degrees)
    left_knee, left_ankle = leg(440, -1, standing_degrees)
    return body(
        right_knee=right_knee, right_ankle=right_ankle, left_knee=left_knee, left_ankle=left_ankle
    )


def leaning(degrees: float) -> BodyPoints:
    """Returns a front pose with the trunk leaning ``degrees`` sideways about the hips.

    Args:
        degrees: Trunk lean from vertical.

    Returns:
        Body points.
    """
    rad = math.radians(degrees)
    mid_x, mid_y = 480 + 200 * math.sin(rad), 400 - 200 * math.cos(rad)
    return body(left_shoulder=(mid_x - 60, mid_y), right_shoulder=(mid_x + 60, mid_y))


def side_standing() -> BodyPoints:
    """Returns a person standing side-on to the camera.

    Returns:
        Body points.
    """
    return BodyPoints(
        {
            Joint.LEFT_SHOULDER: (480, 200),
            Joint.RIGHT_SHOULDER: (490, 200),
            Joint.LEFT_ELBOW: (480, 290),
            Joint.RIGHT_ELBOW: (490, 290),
            Joint.LEFT_HIP: (480, 400),
            Joint.RIGHT_HIP: (490, 400),
            Joint.LEFT_KNEE: (480, 530),
            Joint.RIGHT_KNEE: (490, 530),
            Joint.LEFT_ANKLE: (480, 660),
            Joint.RIGHT_ANKLE: (490, 660),
        }
    )


def seated_side(with_ankles: bool = True) -> BodyPoints:
    """Returns a person seated side-on, thighs horizontal.

    Args:
        with_ankles: Whether the ankles are visible.

    Returns:
        Body points.
    """
    points = {
        Joint.LEFT_SHOULDER: (470, 230),
        Joint.RIGHT_SHOULDER: (478, 230),
        Joint.LEFT_HIP: (480, 430),
        Joint.RIGHT_HIP: (488, 430),
        Joint.LEFT_KNEE: (610, 432),
        Joint.RIGHT_KNEE: (618, 432),
    }
    if with_ankles:
        points[Joint.LEFT_ANKLE] = (612, 560)
        points[Joint.RIGHT_ANKLE] = (620, 560)
    return BodyPoints(points)


def standing_side(with_ankles: bool = True) -> BodyPoints:
    """Returns ``side_standing`` optionally without ankles.

    Args:
        with_ankles: Whether the ankles are visible.

    Returns:
        Body points.
    """
    points = dict(side_standing().points)
    if not with_ankles:
        points.pop(Joint.LEFT_ANKLE)
        points.pop(Joint.RIGHT_ANKLE)
    return BodyPoints(points)


def facing_3d(
    left_knee: tuple[float, float, float], right_knee: tuple[float, float, float]
) -> BodyPoints:
    """Returns a front-facing pose whose 3-D hips and knees are given in metres.

    Args:
        left_knee: Left knee world position.
        right_knee: Right knee world position.

    Returns:
        Body points with world coordinates.
    """
    image = {
        j: at(body(), j)
        for j in (
            Joint.LEFT_SHOULDER,
            Joint.RIGHT_SHOULDER,
            Joint.LEFT_HIP,
            Joint.RIGHT_HIP,
            Joint.LEFT_KNEE,
            Joint.RIGHT_KNEE,
        )
    }
    world: dict[Joint, tuple[float, float, float]] = {
        Joint.LEFT_SHOULDER: (-0.18, -0.5, 0.0),
        Joint.RIGHT_SHOULDER: (0.18, -0.5, 0.0),
        Joint.LEFT_HIP: (-0.1, 0.0, 0.0),
        Joint.RIGHT_HIP: (0.1, 0.0, 0.0),
        Joint.LEFT_KNEE: left_knee,
        Joint.RIGHT_KNEE: right_knee,
    }
    return BodyPoints(image, world)

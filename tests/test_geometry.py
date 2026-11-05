"""Tests for the 2-D and 3-D geometry helpers."""

import math

import pytest

from physio_assistant.domain.geometry import calculate_angle, joint_angle, midpoint, safe_average
from physio_assistant.domain.models import Joint
from tests.poses import arms_at, without


@pytest.mark.parametrize(
    ("a", "b", "c", "expected"),
    [
        ((1, 0), (0, 0), (0, 1), 90.0),
        ((1, 0), (0, 0), (-1, 0), 180.0),
        ((1, 0), (0, 0), (2, 0), 0.0),
        ((1, 0), (0, 0), (1, 1), 45.0),
    ],
)
def test_calculate_angle(a, b, c, expected):
    assert calculate_angle(a, b, c) == pytest.approx(expected)


def test_calculate_angle_is_none_for_degenerate_arm():
    assert calculate_angle((0, 0), (0, 0), (1, 1)) is None


def test_midpoint_handles_missing_points():
    assert midpoint((0, 0), (4, 2)) == (2.0, 1.0)
    assert midpoint(None, (4, 2)) is None


def test_safe_average_ignores_none_and_nan():
    assert safe_average([10.0, None, math.nan, 20.0]) == 15.0
    assert safe_average([None, math.nan]) is None


def test_joint_angle_matches_constructed_pose():
    angle = joint_angle(arms_at(60), Joint.LEFT_ELBOW, Joint.LEFT_SHOULDER, Joint.LEFT_HIP)
    assert angle == pytest.approx(60, abs=0.5)


def test_joint_angle_is_none_when_joint_hidden():
    points = without(Joint.LEFT_ELBOW)
    assert joint_angle(points, Joint.LEFT_ELBOW, Joint.LEFT_SHOULDER, Joint.LEFT_HIP) is None

"""Heuristic posture analysis, one strategy per camera view.

Each analyzer is an ordered list of small rules. A rule inspects the visible
joints and returns a Finding or None. Adding a check means adding a rule, not
editing a long if/else chain.
"""

from collections.abc import Callable, Sequence
from typing import Protocol

from physio_assistant.analysis import findings as catalog
from physio_assistant.config import PostureThresholds
from physio_assistant.domain.geometry import calculate_angle, midpoint
from physio_assistant.domain.models import BodyPoints, Finding, Joint, ViewMode

Rule = Callable[[BodyPoints], Finding | None]


class PostureAnalyzer(Protocol):
    """Strategy interface for producing posture findings from one frame."""

    def analyze(self, points: BodyPoints) -> list[Finding]:
        """Returns every finding triggered by the frame."""
        ...


class RuleBasedAnalyzer:
    """Runs a fixed sequence of rules and collects the findings they raise."""

    def __init__(self, rules: Sequence[Rule]) -> None:
        self._rules = tuple(rules)

    def analyze(self, points: BodyPoints) -> list[Finding]:
        """Returns the findings raised by the rules, in rule order.

        Args:
            points: Visible joints for the frame.

        Returns:
            Findings in rule order.
        """
        return [finding for rule in self._rules if (finding := rule(points)) is not None]


def front_view_rules(t: PostureThresholds) -> list[Rule]:
    """Builds the rules for a patient facing the camera.

    Args:
        t: Posture thresholds.

    Returns:
        Ordered rules.
    """

    def shoulder_level(p: BodyPoints) -> Finding | None:
        ls, rs = p.get(Joint.LEFT_SHOULDER), p.get(Joint.RIGHT_SHOULDER)
        if ls and rs and abs(ls[1] - rs[1]) > t.shoulder_height_diff_px:
            return catalog.SHOULDER_HEIGHT
        return None

    def hip_level(p: BodyPoints) -> Finding | None:
        lh, rh = p.get(Joint.LEFT_HIP), p.get(Joint.RIGHT_HIP)
        if lh and rh and abs(lh[1] - rh[1]) > t.hip_height_diff_px:
            return catalog.HIP_HEIGHT
        return None

    def trunk_shift(p: BodyPoints) -> Finding | None:
        shoulders = midpoint(p.get(Joint.LEFT_SHOULDER), p.get(Joint.RIGHT_SHOULDER))
        hips = midpoint(p.get(Joint.LEFT_HIP), p.get(Joint.RIGHT_HIP))
        if shoulders and hips and abs(shoulders[0] - hips[0]) > t.trunk_shift_px:
            return catalog.TRUNK_SHIFT
        return None

    def knee_tracking(p: BodyPoints) -> Finding | None:
        lk, rk = p.get(Joint.LEFT_KNEE), p.get(Joint.RIGHT_KNEE)
        la, ra = p.get(Joint.LEFT_ANKLE), p.get(Joint.RIGHT_ANKLE)
        if not (lk and rk and la and ra):
            return None
        limit = t.knee_ankle_offset_px
        if abs(lk[0] - la[0]) > limit or abs(rk[0] - ra[0]) > limit:
            return catalog.KNEE_ALIGNMENT
        return None

    return [shoulder_level, hip_level, trunk_shift, knee_tracking]


def side_view_rules(t: PostureThresholds) -> list[Rule]:
    """Builds the rules for a patient standing side-on to the camera.

    Horizontal offsets are absolute because the facing direction is unknown.

    Args:
        t: Posture thresholds.

    Returns:
        Ordered rules.
    """

    def head_forward(p: BodyPoints) -> Finding | None:
        ear = p.first_visible(Joint.LEFT_EAR, Joint.RIGHT_EAR)
        shoulder = p.first_visible(Joint.LEFT_SHOULDER, Joint.RIGHT_SHOULDER)
        if ear and shoulder and abs(ear[0] - shoulder[0]) > t.head_forward_px:
            return catalog.HEAD_FORWARD
        return None

    def trunk_incline(p: BodyPoints) -> Finding | None:
        shoulder = p.first_visible(Joint.LEFT_SHOULDER, Joint.RIGHT_SHOULDER)
        hip = p.first_visible(Joint.LEFT_HIP, Joint.RIGHT_HIP)
        if shoulder and hip and abs(shoulder[0] - hip[0]) > t.trunk_incline_px:
            return catalog.TRUNK_INCLINE
        return None

    def knee_bent(p: BodyPoints) -> Finding | None:
        hip = p.first_visible(Joint.LEFT_HIP, Joint.RIGHT_HIP)
        knee = p.first_visible(Joint.LEFT_KNEE, Joint.RIGHT_KNEE)
        ankle = p.first_visible(Joint.LEFT_ANKLE, Joint.RIGHT_ANKLE)
        if not (hip and knee and ankle):
            return None
        angle = calculate_angle(hip, knee, ankle)
        if angle is not None and angle < t.bent_knee_deg:
            return catalog.KNEE_BENT
        return None

    return [head_forward, trunk_incline, knee_bent]


_RULE_FACTORIES: dict[ViewMode, Callable[[PostureThresholds], list[Rule]]] = {
    ViewMode.FRONT: front_view_rules,
    ViewMode.SIDE: side_view_rules,
}


def create_posture_analyzer(view: ViewMode, thresholds: PostureThresholds) -> PostureAnalyzer:
    """Factory returning the analyzer strategy for a camera view.

    Args:
        view: Current camera view.
        thresholds: Posture thresholds.

    Returns:
        A posture analyzer.
    """
    return RuleBasedAnalyzer(_RULE_FACTORIES[view](thresholds))

from physio_assistant.analysis import findings as catalog
from physio_assistant.analysis.posture import create_posture_analyzer
from physio_assistant.config import PostureThresholds
from physio_assistant.domain.models import BodyPoints, Joint, ViewMode
from tests.poses import body, without

T = PostureThresholds()


def front(points: BodyPoints):
    return create_posture_analyzer(ViewMode.FRONT, T).analyze(points)


def side(points: BodyPoints):
    return create_posture_analyzer(ViewMode.SIDE, T).analyze(points)


def test_upright_front_pose_has_no_findings():
    assert front(body()) == []


def test_uneven_shoulders_are_flagged():
    assert catalog.SHOULDER_HEIGHT in front(body(left_shoulder=(420, 240)))


def test_uneven_hips_are_flagged():
    assert catalog.HIP_HEIGHT in front(body(left_hip=(440, 440)))


def test_sideways_trunk_shift_is_flagged():
    shifted = body(left_shoulder=(470, 200), right_shoulder=(590, 200))
    assert catalog.TRUNK_SHIFT in front(shifted)


def test_knee_drifting_from_ankle_is_flagged():
    assert catalog.KNEE_ALIGNMENT in front(body(left_knee=(380, 530)))


def test_front_rules_skip_when_joints_hidden():
    assert front(without(Joint.RIGHT_SHOULDER, Joint.RIGHT_HIP, Joint.RIGHT_KNEE)) == []


def test_findings_keep_rule_order():
    result = front(body(left_shoulder=(420, 240), left_hip=(440, 440)))
    assert result[:2] == [catalog.SHOULDER_HEIGHT, catalog.HIP_HEIGHT]


def side_pose(**overrides) -> BodyPoints:
    base = {
        Joint.LEFT_EAR: (500, 120),
        Joint.LEFT_SHOULDER: (500, 200),
        Joint.LEFT_HIP: (500, 400),
        Joint.LEFT_KNEE: (500, 530),
        Joint.LEFT_ANKLE: (500, 660),
    }
    for name, value in overrides.items():
        base[Joint(name)] = value
    return BodyPoints(base)


def test_aligned_side_pose_has_no_findings():
    assert side(side_pose()) == []


def test_forward_head_is_flagged_in_either_direction():
    assert catalog.HEAD_FORWARD in side(side_pose(left_ear=(560, 120)))
    assert catalog.HEAD_FORWARD in side(side_pose(left_ear=(440, 120)))


def test_inclined_trunk_is_flagged():
    assert catalog.TRUNK_INCLINE in side(side_pose(left_shoulder=(580, 200)))


def test_bent_knee_is_flagged():
    assert catalog.KNEE_BENT in side(side_pose(left_knee=(580, 530)))


def test_side_rules_fall_back_to_right_side_joints():
    right_only = BodyPoints({Joint.RIGHT_EAR: (560, 120), Joint.RIGHT_SHOULDER: (500, 200)})
    assert side(right_only) == [catalog.HEAD_FORWARD]

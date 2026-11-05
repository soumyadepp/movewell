"""Tests for rendering guidance, announcement and status codes into user-facing text."""

import pytest

from physio_assistant import messages
from physio_assistant.analysis import findings as catalog
from physio_assistant.assistant import FrameState
from physio_assistant.domain.feedback import Guidance, GuidanceKind, StatusNotice
from physio_assistant.domain.models import ExerciseMode, ViewMode
from physio_assistant.events import Announcement, AnnouncementKind
from physio_assistant.exercises import counted_modes, get_exercise
from physio_assistant.ui.text import (
    guidance_lines,
    render_announcement,
    render_guidance,
    render_status,
)


@pytest.mark.parametrize(
    ("guidance", "expected"),
    [
        (Guidance.INITIAL, messages.GUIDANCE_INITIAL),
        (Guidance.NO_BODY, messages.GUIDANCE_NO_BODY),
        (Guidance.POSTURE_MODE, (messages.GUIDANCE_POSTURE_MODE,)),
        (Guidance.TURN_FRONT, (messages.GUIDANCE_TURN_FRONT,)),
        (Guidance.TURN_SIDE, (messages.GUIDANCE_TURN_SIDE,)),
        (Guidance.NO_FINDINGS, (messages.GUIDANCE_NO_FINDINGS,)),
    ],
    ids=lambda value: value.kind.value if isinstance(value, Guidance) else None,
)
def test_fixed_guidance_renders_message_copy(guidance, expected):
    assert render_guidance(guidance) == expected


@pytest.mark.parametrize("mode", counted_modes(), ids=lambda mode: mode.value)
def test_exercise_guidance_renders_exercise_copy(mode):
    copy = get_exercise(mode).copy

    assert render_guidance(Guidance.exercise(mode)) == (copy.guidance,)
    assert render_guidance(Guidance.not_visible(mode)) == (copy.not_visible,)


def test_finding_guidance_renders_its_correction():
    guidance = Guidance.for_finding(catalog.HEAD_FORWARD)

    assert render_guidance(guidance) == (catalog.HEAD_FORWARD.correction,)


def test_every_guidance_kind_renders():
    built = {
        GuidanceKind.EXERCISE: Guidance.exercise(ExerciseMode.ARM_RAISE),
        GuidanceKind.NOT_VISIBLE: Guidance.not_visible(ExerciseMode.ARM_RAISE),
        GuidanceKind.FINDING: Guidance.for_finding(catalog.KNEE_BENT),
    }
    for kind in GuidanceKind:
        assert all(render_guidance(built.get(kind, Guidance(kind))))


def test_guidance_lines_flattens_in_order():
    lines = guidance_lines(
        [Guidance.exercise(ExerciseMode.SIDE_BEND), Guidance.for_finding(catalog.HIP_HEIGHT)]
    )

    assert lines == [
        get_exercise(ExerciseMode.SIDE_BEND).copy.guidance,
        catalog.HIP_HEIGHT.correction,
    ]


def test_initial_frame_state_renders_initial_lines():
    assert guidance_lines(FrameState().guidance) == list(messages.GUIDANCE_INITIAL)


@pytest.mark.parametrize(
    ("view", "expected"),
    [(ViewMode.FRONT, messages.SPEAK_FRONT_VIEW), (ViewMode.SIDE, messages.SPEAK_SIDE_VIEW)],
)
def test_view_announcement_renders_view_sentence(view, expected):
    announcement = Announcement(AnnouncementKind.VIEW_SELECTED, view=view)

    assert render_announcement(announcement) == expected


def test_mode_announcement_renders_posture_and_exercise_sentences():
    posture = Announcement(AnnouncementKind.MODE_SELECTED, mode=ExerciseMode.POSTURE)
    curl = Announcement(AnnouncementKind.MODE_SELECTED, mode=ExerciseMode.ELBOW_CURL)

    assert render_announcement(posture) == messages.SPEAK_MODE_POSTURE
    assert render_announcement(curl) == get_exercise(ExerciseMode.ELBOW_CURL).copy.announcement


@pytest.mark.parametrize(
    ("kind", "expected"),
    [
        (AnnouncementKind.TIMER_STARTED, messages.SPEAK_TIMER_STARTED),
        (AnnouncementKind.TIMER_PAUSED, messages.SPEAK_TIMER_PAUSED),
        (AnnouncementKind.SESSION_SAVED, messages.SPEAK_SAVED),
    ],
)
def test_fixed_announcements_render_message_copy(kind, expected):
    assert render_announcement(Announcement(kind)) == expected


def test_status_renders_message_copy_or_nothing():
    assert render_status(StatusNotice.SAVED) == messages.SAVED
    assert render_status(StatusNotice.SAVE_FAILED) == messages.SAVE_FAILED
    assert render_status(None) == ""

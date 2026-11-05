"""Renders semantic feedback codes into the sentences users read and hear.

This is the only place that maps guidance, announcement and status codes to
copy from ``messages`` and from each exercise's ``ExerciseCopy``.
"""

from collections.abc import Iterable

from physio_assistant import messages
from physio_assistant.domain.feedback import Guidance, GuidanceKind, StatusNotice
from physio_assistant.domain.models import ExerciseMode, ViewMode
from physio_assistant.events import Announcement, AnnouncementKind
from physio_assistant.exercises import get_exercise

_FIXED_GUIDANCE: dict[GuidanceKind, tuple[str, ...]] = {
    GuidanceKind.INITIAL: messages.GUIDANCE_INITIAL,
    GuidanceKind.NO_BODY: messages.GUIDANCE_NO_BODY,
    GuidanceKind.POSTURE_MODE: (messages.GUIDANCE_POSTURE_MODE,),
    GuidanceKind.TURN_FRONT: (messages.GUIDANCE_TURN_FRONT,),
    GuidanceKind.TURN_SIDE: (messages.GUIDANCE_TURN_SIDE,),
    GuidanceKind.NO_FINDINGS: (messages.GUIDANCE_NO_FINDINGS,),
}

_VIEW_ANNOUNCEMENTS: dict[ViewMode, str] = {
    ViewMode.FRONT: messages.SPEAK_FRONT_VIEW,
    ViewMode.SIDE: messages.SPEAK_SIDE_VIEW,
}

_FIXED_ANNOUNCEMENTS: dict[AnnouncementKind, str] = {
    AnnouncementKind.TIMER_STARTED: messages.SPEAK_TIMER_STARTED,
    AnnouncementKind.TIMER_PAUSED: messages.SPEAK_TIMER_PAUSED,
    AnnouncementKind.SESSION_SAVED: messages.SPEAK_SAVED,
}

_STATUS_TEXT: dict[StatusNotice, str] = {
    StatusNotice.SAVED: messages.SAVED,
    StatusNotice.SAVE_FAILED: messages.SAVE_FAILED,
}


def render_guidance(guidance: Guidance) -> tuple[str, ...]:
    """Returns the on-screen lines for one guidance code.

    Most codes render to a single line; ``INITIAL`` and ``NO_BODY`` render to
    several.

    Args:
        guidance: Code produced by the counter or the assistant.

    Returns:
        The lines to display, in order.
    """
    if guidance.kind is GuidanceKind.FINDING:
        return (guidance.finding.correction,)
    if guidance.kind is GuidanceKind.EXERCISE:
        return (get_exercise(guidance.mode).copy.guidance,)
    if guidance.kind is GuidanceKind.NOT_VISIBLE:
        return (get_exercise(guidance.mode).copy.not_visible,)
    return _FIXED_GUIDANCE[guidance.kind]


def guidance_lines(guidance: Iterable[Guidance]) -> list[str]:
    """Renders a sequence of guidance codes into one flat list of lines.

    Args:
        guidance: Codes in display order.

    Returns:
        Every rendered line, in order.
    """
    return [line for item in guidance for line in render_guidance(item)]


def render_announcement(announcement: Announcement) -> str:
    """Returns the sentence to speak for an announcement.

    Args:
        announcement: Event published by the assistant.

    Returns:
        The text to speak.
    """
    if announcement.kind is AnnouncementKind.VIEW_SELECTED:
        return _VIEW_ANNOUNCEMENTS[announcement.view]
    if announcement.kind is AnnouncementKind.MODE_SELECTED:
        return _mode_announcement(announcement.mode)
    return _FIXED_ANNOUNCEMENTS[announcement.kind]


def render_status(status: StatusNotice | None) -> str:
    """Returns the on-screen status line.

    Args:
        status: Latest status notice, or None when there is nothing to report.

    Returns:
        The status text, or an empty string when there is no notice.
    """
    return "" if status is None else _STATUS_TEXT[status]


def _mode_announcement(mode: ExerciseMode) -> str:
    """Returns the sentence spoken when a mode is selected.

    Args:
        mode: Newly selected mode, including posture.

    Returns:
        The posture-mode sentence, or the exercise's own announcement.
    """
    if mode is ExerciseMode.POSTURE:
        return messages.SPEAK_MODE_POSTURE
    return get_exercise(mode).copy.announcement

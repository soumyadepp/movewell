"""Side panel renderer for the OpenCV window."""

import cv2
import numpy as np

from physio_assistant import messages
from physio_assistant.assistant import Assistant
from physio_assistant.domain.models import ExerciseMode, MovementPhase
from physio_assistant.exercises import get_exercise
from physio_assistant.infrastructure.frames import Frame
from physio_assistant.ui.commands import mode_label
from physio_assistant.ui.text import guidance_lines, render_status

Color = tuple[int, int, int]

PANEL_WIDTH = 470
BACKGROUND: Color = (27, 30, 40)
HEADER: Color = (48, 55, 75)
ACCENT: Color = (0, 255, 230)
VIEW: Color = (100, 220, 255)
TEXT: Color = (245, 245, 245)
MUTED: Color = (210, 210, 210)
WARNING: Color = (0, 180, 255)
GOOD: Color = (100, 255, 130)
EXERCISE: Color = (160, 230, 160)
PROGRESS: Color = (190, 220, 255)
RULE: Color = (90, 90, 100)
OVERLAY: Color = (0, 165, 255)


def _text(
    image: Frame,
    text: str,
    xy: tuple[int, int],
    scale: float = 0.55,
    color: Color = TEXT,
    thickness: int = 1,
) -> None:
    """Draws anti-aliased text onto an image in place.

    Args:
        image: Image to draw on.
        text: Text to draw.
        xy: Bottom-left corner of the text in pixels.
        scale: Font scale.
        color: BGR color.
        thickness: Stroke thickness in pixels.
    """
    cv2.putText(image, text, xy, cv2.FONT_HERSHEY_SIMPLEX, scale, color, thickness, cv2.LINE_AA)


def _phase_label(a: Assistant) -> str:
    """Names the current movement phase in the selected exercise's own words.

    Args:
        a: Assistant whose counter phase is shown.

    Returns:
        The exercise's low or high label, or the generic phase name.
    """
    phase = a.counter.phase
    if a.mode is ExerciseMode.POSTURE or phase is MovementPhase.READY:
        return phase.value.title()
    copy = get_exercise(a.mode).copy
    return copy.low_label if phase is MovementPhase.LOW else copy.high_label


class DashboardRenderer:
    """Draws the camera overlay and the information panel."""

    def render(self, frame: Frame, assistant: Assistant) -> Frame:
        """Returns the camera frame with the dashboard panel attached on the right.

        Args:
            frame: Camera frame, already annotated with the skeleton.
            assistant: Source of everything shown on the panel.

        Returns:
            A new image, frame and panel side by side.
        """
        state = assistant.frame
        if assistant.mode is ExerciseMode.POSTURE and state.findings:
            _text(frame, messages.OVERLAY_POSTURE, (20, 80), 0.7, OVERLAY, 2)

        h = frame.shape[0]
        panel = np.full((h, PANEL_WIDTH, 3), BACKGROUND, dtype=np.uint8)
        y = self._header(panel, assistant)
        y = self._findings(panel, assistant, y)
        y = self._guidance(panel, assistant, max(y + 8, 390))
        y = self._counter(panel, assistant, max(y + 10, 510))
        self._footer(panel, assistant, y)
        return np.hstack((frame, panel))

    def _rule(self, panel: Frame, y: int) -> None:
        """Draws a horizontal separator across the panel.

        Args:
            panel: Panel image to draw on.
            y: Vertical position in pixels.
        """
        cv2.line(panel, (15, y), (PANEL_WIDTH - 15, y), RULE, 1)

    def _header(self, panel: Frame, a: Assistant) -> int:
        """Draws the title, view, mode and session time.

        Args:
            panel: Panel image to draw on.
            a: Assistant providing the values.

        Returns:
            The y position where the next section starts.
        """
        cv2.rectangle(panel, (0, 0), (PANEL_WIDTH, 65), HEADER, -1)
        _text(panel, messages.APP_TITLE, (15, 29), 0.58, ACCENT, 2)
        _text(panel, messages.APP_SUBTITLE, (15, 51), 0.36, MUTED)
        _text(panel, messages.LABEL_VIEW.format(value=a.view.value), (15, 95), 0.55, VIEW, 2)
        _text(panel, messages.LABEL_MODE.format(value=mode_label(a.mode)), (15, 127), 0.52)
        elapsed = a.timer.elapsed_seconds()
        _text(
            panel,
            messages.LABEL_SESSION_TIME.format(minutes=elapsed // 60, seconds=elapsed % 60),
            (15, 157),
            0.48,
            MUTED,
        )
        self._rule(panel, 191)
        return 216

    def _findings(self, panel: Frame, a: Assistant, y: int) -> int:
        """Draws up to three posture findings, or the no-flag notice.

        Args:
            panel: Panel image to draw on.
            a: Assistant providing the findings.
            y: Vertical position where the section starts.

        Returns:
            The y position after the section.
        """
        _text(panel, messages.LABEL_OBSERVATIONS, (15, y), 0.52, ACCENT, 2)
        y += 28
        if not a.frame.findings:
            _text(panel, messages.LABEL_NO_FLAG, (18, y), 0.40, GOOD)
            _text(panel, messages.LABEL_NO_FLAG_CAVEAT, (18, y + 24), 0.34)
            return y + 49
        for finding in a.frame.findings[:3]:
            _text(panel, "- " + finding.title[:48], (18, y), 0.40, WARNING)
            _text(
                panel,
                messages.LABEL_CORRECTION.format(value=finding.correction[:45]),
                (25, y + 21),
                0.34,
            )
            _text(
                panel,
                messages.LABEL_EXERCISE.format(value=finding.exercise[:46]),
                (25, y + 40),
                0.34,
                EXERCISE,
            )
            y += 67
        return y

    def _guidance(self, panel: Frame, a: Assistant, y: int) -> int:
        """Draws up to three rendered guidance lines.

        Args:
            panel: Panel image to draw on.
            a: Assistant providing the guidance codes.
            y: Vertical position where the section starts.

        Returns:
            The y position after the section.
        """
        self._rule(panel, y)
        y += 27
        _text(panel, messages.LABEL_LIVE_GUIDANCE, (15, y), 0.52, ACCENT, 2)
        y += 27
        for line in guidance_lines(a.frame.guidance)[:3]:
            _text(panel, line[:57], (18, y), 0.36)
            y += 22
        return y

    def _counter(self, panel: Frame, a: Assistant, y: int) -> int:
        """Draws the repetition count, phase and measured angle.

        Args:
            panel: Panel image to draw on.
            a: Assistant providing the counter.
            y: Vertical position where the section starts.

        Returns:
            The y position after the section.
        """
        self._rule(panel, y)
        y += 28
        _text(panel, messages.LABEL_COUNTER, (15, y), 0.52, ACCENT, 2)
        y += 35
        _text(panel, messages.LABEL_REPS.format(value=a.counter.reps), (18, y), 0.65, GOOD, 2)
        y += 28
        _text(panel, messages.LABEL_PHASE.format(value=_phase_label(a)), (18, y), 0.40)
        if a.mode is not ExerciseMode.POSTURE:
            copy = get_exercise(a.mode).copy
            angle = a.counter.last_angle
            value = messages.ANGLE_UNKNOWN if angle is None else f"{angle:.0f} deg"
            _text(
                panel,
                messages.LABEL_ANGLE.format(label=copy.angle_label, value=value),
                (18, y + 22),
                0.36,
            )
        return y + 27

    def _footer(self, panel: Frame, a: Assistant, y: int) -> None:
        """Draws progress, the status notice and the key controls.

        Args:
            panel: Panel image to draw on.
            a: Assistant providing progress and status.
            y: Vertical position after the previous section.
        """
        h = panel.shape[0]
        progress = a.progress
        py = min(max(y + 5, 615), h - 85)
        _text(
            panel,
            messages.LABEL_PROGRESS.format(value=progress.total_sessions),
            (18, py),
            0.36,
            PROGRESS,
        )
        _text(
            panel,
            messages.LABEL_RECENT_AVERAGE.format(
                mode=a.mode.value, value=progress.recent_average_reps
            ),
            (18, py + 21),
            0.34,
            PROGRESS,
        )
        status = render_status(a.status)
        if status:
            _text(panel, status, (18, min(py + 43, h - 48)), 0.34, GOOD)
        _text(panel, messages.LABEL_CONTROLS_1, (12, h - 34), 0.30, MUTED)
        _text(panel, messages.LABEL_CONTROLS_2, (12, h - 14), 0.30, MUTED)

"""Semantic feedback codes produced by core logic and rendered to text by the UI.

Analysis and the assistant describe what the user should hear or read as
codes, never as sentences. The presentation layer owns the wording, so copy
can change (or be translated) without touching counting or session logic.
"""

from dataclasses import dataclass
from enum import StrEnum

from physio_assistant.domain.models import ExerciseMode, Finding


class Cue(StrEnum):
    """Guidance that needs no context: the same words every time."""

    INITIAL = "initial"
    NO_BODY = "no_body"
    POSTURE_MODE = "posture_mode"
    TURN_FRONT = "turn_front"
    TURN_SIDE = "turn_side"
    NO_FINDINGS = "no_findings"


@dataclass(frozen=True)
class ExerciseInstruction:
    """The exercise's own instruction, shown while it is tracked.

    Attributes:
        mode: Exercise being tracked.
    """

    mode: ExerciseMode


@dataclass(frozen=True)
class JointsHidden:
    """The joints an exercise needs are out of view.

    Attributes:
        mode: Exercise being tracked.
    """

    mode: ExerciseMode


@dataclass(frozen=True)
class PostureCorrection:
    """A posture finding to correct.

    Attributes:
        finding: Finding raised for the frame.
    """

    finding: Finding


Guidance = Cue | ExerciseInstruction | JointsHidden | PostureCorrection
"""One piece of live guidance. Each variant carries exactly the context it needs."""


class StatusNotice(StrEnum):
    """Outcome of a user action that the dashboard reports on screen."""

    SAVED = "saved"
    SAVE_FAILED = "save_failed"

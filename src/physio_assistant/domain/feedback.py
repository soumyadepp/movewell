"""Semantic feedback codes produced by core logic and rendered to text by the UI.

Analysis and the assistant describe what the user should hear or read as
codes, never as sentences. The presentation layer owns the wording, so copy
can change (or be translated) without touching counting or session logic.
"""

from dataclasses import dataclass
from enum import StrEnum
from typing import ClassVar

from physio_assistant.domain.models import ExerciseMode, Finding


class GuidanceKind(StrEnum):
    """What a guidance entry asks of the user."""

    INITIAL = "initial"
    NO_BODY = "no_body"
    POSTURE_MODE = "posture_mode"
    EXERCISE = "exercise"
    NOT_VISIBLE = "not_visible"
    TURN_FRONT = "turn_front"
    TURN_SIDE = "turn_side"
    FINDING = "finding"
    NO_FINDINGS = "no_findings"


@dataclass(frozen=True)
class Guidance:
    """One piece of live guidance, identified by kind plus the context it needs.

    Kinds without context are available as class constants, for example
    ``Guidance.TURN_FRONT``. Kinds that depend on the exercise or a posture
    finding are built with the class methods.

    Attributes:
        kind: What the guidance asks of the user.
        mode: Exercise the guidance refers to, for ``EXERCISE`` and ``NOT_VISIBLE``.
        finding: Posture finding the guidance refers to, for ``FINDING``.
    """

    kind: GuidanceKind
    mode: ExerciseMode | None = None
    finding: Finding | None = None

    INITIAL: ClassVar["Guidance"]
    NO_BODY: ClassVar["Guidance"]
    POSTURE_MODE: ClassVar["Guidance"]
    TURN_FRONT: ClassVar["Guidance"]
    TURN_SIDE: ClassVar["Guidance"]
    NO_FINDINGS: ClassVar["Guidance"]

    @classmethod
    def exercise(cls, mode: ExerciseMode) -> "Guidance":
        """Builds the instruction shown while an exercise is tracked.

        Args:
            mode: Exercise being tracked.

        Returns:
            Guidance of kind ``EXERCISE``.
        """
        return cls(GuidanceKind.EXERCISE, mode=mode)

    @classmethod
    def not_visible(cls, mode: ExerciseMode) -> "Guidance":
        """Builds the hint shown when the joints an exercise needs are hidden.

        Args:
            mode: Exercise being tracked.

        Returns:
            Guidance of kind ``NOT_VISIBLE``.
        """
        return cls(GuidanceKind.NOT_VISIBLE, mode=mode)

    @classmethod
    def for_finding(cls, finding: Finding) -> "Guidance":
        """Builds the correction cue for a posture finding.

        Args:
            finding: Finding raised for the frame.

        Returns:
            Guidance of kind ``FINDING``.
        """
        return cls(GuidanceKind.FINDING, finding=finding)


Guidance.INITIAL = Guidance(GuidanceKind.INITIAL)
Guidance.NO_BODY = Guidance(GuidanceKind.NO_BODY)
Guidance.POSTURE_MODE = Guidance(GuidanceKind.POSTURE_MODE)
Guidance.TURN_FRONT = Guidance(GuidanceKind.TURN_FRONT)
Guidance.TURN_SIDE = Guidance(GuidanceKind.TURN_SIDE)
Guidance.NO_FINDINGS = Guidance(GuidanceKind.NO_FINDINGS)


class StatusNotice(StrEnum):
    """Outcome of a user action that the dashboard reports on screen."""

    SAVED = "saved"
    SAVE_FAILED = "save_failed"

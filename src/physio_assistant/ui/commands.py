"""Keyboard commands (Command pattern).

Each key maps to a small command object, so adding a shortcut is one entry in
``KEY_BINDINGS`` rather than another branch in the frame loop.
"""

from dataclasses import dataclass
from typing import Protocol

from physio_assistant import messages
from physio_assistant.assistant import Assistant
from physio_assistant.domain.models import ExerciseMode
from physio_assistant.exercises import counted_modes, get_exercise

ESC = 27
SPACE = 32


def mode_label(mode: ExerciseMode) -> str:
    """Returns the display name for a mode.

    Args:
        mode: Any mode, including posture.

    Returns:
        The label.
    """
    return messages.POSTURE_LABEL if mode is ExerciseMode.POSTURE else get_exercise(mode).copy.label


class Command(Protocol):
    """Action triggered by a key press."""

    def execute(self, assistant: Assistant) -> bool:
        """Runs the action.

        Args:
            assistant: Application service to act on.

        Returns:
            False if the app should quit, True otherwise.
        """
        ...


class Quit:
    """Stops the frame loop."""

    def execute(self, assistant: Assistant) -> bool:
        """Signals the loop to exit.

        Args:
            assistant: Application service to act on.

        Returns:
            Always False, so the app quits.
        """
        return False


class ToggleView:
    """Switches between front and side view."""

    def execute(self, assistant: Assistant) -> bool:
        """Toggles the view.

        Args:
            assistant: Application service to act on.

        Returns:
            Always True.
        """
        assistant.toggle_view()
        return True


@dataclass(frozen=True)
class SelectMode:
    """Activates an exercise mode.

    Attributes:
        mode: Mode to activate.
    """

    mode: ExerciseMode

    def execute(self, assistant: Assistant) -> bool:
        """Selects the mode.

        Args:
            assistant: Application service to act on.

        Returns:
            Always True.
        """
        assistant.select_mode(self.mode)
        return True


class ToggleTimer:
    """Starts or pauses the session timer."""

    def execute(self, assistant: Assistant) -> bool:
        """Toggles the timer.

        Args:
            assistant: Application service to act on.

        Returns:
            Always True.
        """
        assistant.toggle_timer()
        return True


class SaveSession:
    """Saves a session summary."""

    def execute(self, assistant: Assistant) -> bool:
        """Saves the session.

        Args:
            assistant: Application service to act on.

        Returns:
            Always True.
        """
        assistant.save_session()
        return True


class ShowHelp:
    """Prints the controls to the terminal."""

    def execute(self, assistant: Assistant) -> bool:
        """Prints help.

        Args:
            assistant: Application service to act on.

        Returns:
            Always True.
        """
        modes = "\n".join(f"{i}: {mode_label(mode)}" for i, mode in enumerate(MODE_ORDER, start=1))
        print(messages.HELP_TEXT.format(modes=modes))
        return True


MODE_ORDER: tuple[ExerciseMode, ...] = (ExerciseMode.POSTURE, *counted_modes())
"""Modes in keyboard order: 1 is posture, 2 onward follow the exercise registry."""

KEY_BINDINGS: dict[int, Command] = {
    ord("q"): Quit(),
    ESC: Quit(),
    ord("v"): ToggleView(),
    **{ord(str(i)): SelectMode(mode) for i, mode in enumerate(MODE_ORDER, start=1)},
    SPACE: ToggleTimer(),
    ord("s"): SaveSession(),
    ord("h"): ShowHelp(),
}


def dispatch(key: int, assistant: Assistant) -> bool:
    """Runs the command bound to a key, if any.

    Args:
        key: Key code from ``cv2.waitKey`` masked to 8 bits.
        assistant: Application service.

    Returns:
        False if the app should quit.
    """
    if ord("A") <= key <= ord("Z"):
        key = ord(chr(key).lower())
    command = KEY_BINDINGS.get(key)
    return command.execute(assistant) if command else True

"""Keyboard shortcuts for the desktop app.

Each key maps to a function of the assistant, so adding a shortcut is one
entry in ``KEY_BINDINGS`` rather than another branch in the frame loop.
"""

from collections.abc import Callable
from functools import partial

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


def show_help(_assistant: Assistant) -> None:
    """Prints the controls to the terminal.

    Args:
        _assistant: Unused; every key action receives the assistant.
    """
    modes = "\n".join(f"{i}: {mode_label(mode)}" for i, mode in enumerate(MODE_ORDER, start=1))
    print(messages.HELP_TEXT.format(modes=modes))


MODE_ORDER: tuple[ExerciseMode, ...] = (ExerciseMode.POSTURE, *counted_modes())
"""Modes in keyboard order: 1 is posture, 2 onward follow the exercise registry."""

QUIT_KEYS = frozenset({ord("q"), ESC})
"""Keys that close the app."""

KEY_BINDINGS: dict[int, Callable[[Assistant], object]] = {
    ord("v"): Assistant.toggle_view,
    **{
        ord(str(i)): partial(Assistant.select_mode, mode=mode)
        for i, mode in enumerate(MODE_ORDER, start=1)
    },
    SPACE: Assistant.toggle_timer,
    ord("s"): Assistant.save_session,
    ord("h"): show_help,
}
"""What each key does to the assistant."""


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
    if key in QUIT_KEYS:
        return False
    action = KEY_BINDINGS.get(key)
    if action:
        action(assistant)
    return True

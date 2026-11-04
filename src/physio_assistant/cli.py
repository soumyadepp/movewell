"""Command line entry point and composition root.

This is the only module that knows which concrete adapters are used. Every
other module depends on ports (protocols), so swapping MediaPipe, the CSV
store or the speech engine is a change here only.
"""

import argparse
import logging
from dataclasses import replace
from pathlib import Path

from physio_assistant import __version__, messages
from physio_assistant.assistant import Assistant
from physio_assistant.config import AppConfig, CameraConfig, VoiceConfig
from physio_assistant.events import EventBus
from physio_assistant.infrastructure.camera import CameraUnavailableError, Webcam
from physio_assistant.infrastructure.pose import MediaPipePoseEstimator
from physio_assistant.infrastructure.storage import CsvSessionRepository
from physio_assistant.infrastructure.voice import create_speaker
from physio_assistant.notifier import VoiceNotifier
from physio_assistant.ui.dashboard import DashboardRenderer
from physio_assistant.ui.desktop import DesktopRunner


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    """Parses command line flags.

    Args:
        argv: Arguments, defaulting to ``sys.argv``.

    Returns:
        Parsed namespace.
    """
    defaults = AppConfig()
    parser = argparse.ArgumentParser(
        prog="physio-assistant",
        description="Educational webcam movement-monitoring prototype. Not a medical device.",
    )
    parser.add_argument("--camera", type=int, default=defaults.camera.index, help="camera index")
    parser.add_argument("--width", type=int, default=defaults.camera.width)
    parser.add_argument("--height", type=int, default=defaults.camera.height)
    parser.add_argument("--no-mirror", action="store_true", help="do not flip the image")
    parser.add_argument("--no-voice", action="store_true", help="disable spoken feedback")
    parser.add_argument(
        "--data-file",
        type=Path,
        default=defaults.data_file,
        help="CSV file for saved session summaries",
    )
    parser.add_argument("--verbose", action="store_true")
    parser.add_argument("--version", action="version", version=f"%(prog)s {__version__}")
    return parser.parse_args(argv)


def build_config(args: argparse.Namespace) -> AppConfig:
    """Builds the app config from parsed flags.

    Args:
        args: Parsed flags.

    Returns:
        The app config.
    """
    base = AppConfig()
    return replace(
        base,
        data_file=args.data_file,
        camera=CameraConfig(
            index=args.camera, width=args.width, height=args.height, mirror=not args.no_mirror
        ),
        voice=replace(VoiceConfig(), enabled=not args.no_voice),
    )


def main(argv: list[str] | None = None) -> int:
    """Wires dependencies and runs the desktop app.

    Args:
        argv: Arguments, defaulting to ``sys.argv``.

    Returns:
        Process exit code.
    """
    args = parse_args(argv)
    logging.basicConfig(level=logging.DEBUG if args.verbose else logging.INFO, format="%(message)s")
    config = build_config(args)

    events = EventBus()
    speaker = create_speaker(config.voice)
    VoiceNotifier(speaker).attach(events)
    repository = CsvSessionRepository(config.data_file)
    assistant = Assistant(config, events, repository)

    print(messages.STARTED)
    try:
        with Webcam(config.camera) as camera, MediaPipePoseEstimator(config.pose) as estimator:
            DesktopRunner(
                config.window_name, camera, estimator, assistant, DashboardRenderer()
            ).run()
    except CameraUnavailableError:
        print(messages.CAMERA_OPEN_FAILED)
        return 1
    finally:
        speaker.close()
        print(messages.CLOSED)
        print(messages.HISTORY_FILE.format(path=config.data_file.resolve()))
    return 0

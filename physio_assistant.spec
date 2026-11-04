"""PyInstaller build spec. Run with: uv run --group build pyinstaller physio_assistant.spec"""

import sys

from PyInstaller.utils.hooks import collect_data_files, collect_submodules

datas = collect_data_files("mediapipe", includes=["**/*.tflite", "**/*.binarypb", "**/*.txt"])
hiddenimports = collect_submodules("mediapipe.python.solutions") + [
    "pyttsx3.drivers",
    "pyttsx3.drivers.nsss",
    "pyttsx3.drivers.sapi5",
    "pyttsx3.drivers.espeak",
]

a = Analysis(
    ["src/physio_assistant/__main__.py"],
    pathex=["src"],
    datas=datas,
    hiddenimports=hiddenimports,
    excludes=["jax", "jaxlib", "tkinter"],
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="physio-assistant",
    console=sys.platform != "darwin",
)

coll = COLLECT(exe, a.binaries, a.datas, name="physio-assistant")

if sys.platform == "darwin":
    app = BUNDLE(
        coll,
        name="Physio Assistant.app",
        bundle_identifier="com.personal.physio-assistant",
        info_plist={
            "NSCameraUsageDescription": "The camera is used to track body landmarks for exercise feedback.",
            "NSHighResolutionCapable": True,
        },
    )

"""All user-facing copy lives here so wording can change without touching logic."""

APP_TITLE = "AI PHYSIOTHERAPY ASSISTANT"
APP_SUBTITLE = "Educational movement-monitoring prototype"

STARTED = (
    "AI Physiotherapy Assistant started. Use V to change FRONT/SIDE view. Press H for controls."
)
CLOSED = "Application closed."
HISTORY_FILE = "Session history file: {path}"
CAMERA_OPEN_FAILED = "ERROR: Could not open webcam. Check camera permissions or the --camera index."
CAMERA_READ_FAILED = "Camera frame could not be read."
SPEECH_UNAVAILABLE = "Speech engine unavailable: {error}"
SPEECH_ERROR = "Voice feedback error: {error}"
SAVE_FAILED_LOG = "Could not save session: {error}"

GUIDANCE_INITIAL = ("Stand where your full body is visible.", "Keep the camera steady.")
GUIDANCE_NO_BODY = (
    "No body detected.",
    "Move back until the required joints are visible.",
    "Improve lighting and keep the camera steady.",
)
GUIDANCE_POSTURE_MODE = "Use V to switch between front and side assessments."
GUIDANCE_NO_FINDINGS = "No configured posture threshold was triggered."
GUIDANCE_ARM_RAISE = "Raise and lower arms slowly within a comfortable range."
GUIDANCE_ARM_RAISE_NOT_VISIBLE = "Show both shoulders, elbows and wrists to the camera."
GUIDANCE_SIT_TO_STAND = "Move slowly between a supported sit and stand. Use a stable chair."
GUIDANCE_SIT_TO_STAND_NOT_VISIBLE = "Show hip, knee and ankle clearly from the side."

SPEAK_REP_COUNTED = "Good. One repetition counted."
SPEAK_MOVE_INTO_VIEW = "Please move into the camera view."
SPEAK_SIDE_VIEW = "Side view. Turn sideways to the camera."
SPEAK_FRONT_VIEW = "Front view. Face the camera."
SPEAK_MODE_POSTURE = "Posture observation mode selected."
SPEAK_MODE_ARM_RAISE = "Shoulder raise counter selected. Only exercise if suitable for you."
SPEAK_MODE_SIT_TO_STAND = "Sit to stand counter selected. Use a stable chair and support."
SPEAK_TIMER_STARTED = "Session timer started."
SPEAK_TIMER_PAUSED = "Session timer paused."
SPEAK_SAVED = "Session summary saved."

SAVED = "Session saved to CSV."
SAVE_FAILED = "Could not save session."

OVERLAY_POSTURE = "POSTURE OBSERVATION"
LABEL_VIEW = "CAMERA VIEW: {value}"
LABEL_MODE = "MODE: {value}"
LABEL_SESSION_TIME = "SESSION TIME: {minutes:02d}:{seconds:02d}"
LABEL_OBSERVATIONS = "POSTURE OBSERVATIONS"
LABEL_CORRECTION = "Correction: {value}"
LABEL_EXERCISE = "Exercise: {value}"
LABEL_NO_FLAG = "No obvious threshold-based flag."
LABEL_NO_FLAG_CAVEAT = "This does not confirm ideal or healthy posture."
LABEL_LIVE_GUIDANCE = "LIVE GUIDANCE"
LABEL_COUNTER = "EXERCISE COUNTER"
LABEL_REPS = "Repetitions: {value}"
LABEL_PHASE = "Movement phase: {value}"
LABEL_PROGRESS = "PROGRESS: {value} saved sessions"
LABEL_RECENT_AVERAGE = "Recent {mode} average reps: {value:.1f}"
LABEL_CONTROLS_1 = "V View | 1 Posture | 2 Arm raise | 3 Sit-stand | SPACE Timer"
LABEL_CONTROLS_2 = "S Save | H Help | Q Quit"

HELP_TEXT = """
CONTROLS
V: switch front/side view
1: posture mode
2: shoulder raise counter
3: sit-to-stand counter
SPACE: start/pause session timer
S: save session summary
H: show this help
Q or ESC: quit

Safety: stop if pain, dizziness, numbness,
breathlessness or instability occurs.
"""

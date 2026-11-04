/** All user-facing copy lives here so wording can change without touching logic. */
import { type CountedExercise, ExerciseMode, ViewMode } from "./domain/models";

export const APP_NAME = "AI Physiotherapy Assistant";
export const APP_TAGLINE = "Gentle movement guidance using your camera.";

export const SETUP_EYEBROW = "Getting started";
export const SETUP_TITLE_LEAD = "Welcome to your";
export const SETUP_TITLE_ACCENT = "exercise assistant";
export const SETUP_STEPS = [
  { title: "Place the laptop at waist height", body: "On a table, facing an open space." },
  { title: "Step back 2 to 3 metres", body: "So the camera can see you from head to feet." },
  { title: "Keep a sturdy chair close by", body: "For support, and for the sit-to-stand exercise." },
] as const;
export const SETUP_START = "Start camera";
export const SETUP_PRIVACY = "Your video stays on this device. Nothing is recorded or uploaded.";

export const LOADING_MODEL = "Loading pose model…";
export const CAMERA_DENIED =
  "The camera could not start. Allow camera access in the browser's address bar, then try again.";
export const MODEL_FAILED = "The pose model could not load. Check the internet connection and refresh.";
export const TRY_AGAIN = "Try again";

export interface ExerciseCopy {
  label: string;
  angleLabel: string;
  low: string;
  high: string;
  guidance: string;
  notVisible: string;
  bestView: ViewMode;
}

export const EXERCISE_COPY: Record<CountedExercise, ExerciseCopy> = {
  [ExerciseMode.ArmRaise]: {
    label: "Shoulder raise",
    angleLabel: "Shoulder angle",
    low: "Arms down",
    high: "Arms raised",
    guidance: "Raise both arms out to the side slowly, then lower them.",
    notVisible: "Show both shoulders and elbows to the camera.",
    bestView: ViewMode.Front,
  },
  [ExerciseMode.ElbowCurl]: {
    label: "Elbow curl",
    angleLabel: "Elbow bend",
    low: "Arm straight",
    high: "Elbow bent",
    guidance: "Keep elbows by your sides and bring your hands up towards your shoulders.",
    notVisible: "Show your shoulders, elbows and wrists to the camera.",
    bestView: ViewMode.Front,
  },
  [ExerciseMode.Marching]: {
    label: "Marching",
    angleLabel: "Knee lift",
    low: "Feet down",
    high: "Knee lifted",
    guidance: "Lift one knee at a time, as high as is comfortable. Hold a chair if needed.",
    notVisible: "Turn sideways so the camera sees your hip and knee.",
    bestView: ViewMode.Side,
  },
  [ExerciseMode.SideLegRaise]: {
    label: "Side leg raise",
    angleLabel: "Leg angle",
    low: "Feet together",
    high: "Leg raised",
    guidance: "Hold a chair, keep your back straight and lift one leg out to the side.",
    notVisible: "Face the camera so it can see your hips and ankles.",
    bestView: ViewMode.Front,
  },
  [ExerciseMode.SideBend]: {
    label: "Side bend",
    angleLabel: "Trunk lean",
    low: "Upright",
    high: "Leaning",
    guidance: "Slide one hand down the side of your leg, then come back to upright.",
    notVisible: "Face the camera so it can see your shoulders and hips.",
    bestView: ViewMode.Front,
  },
  [ExerciseMode.SitToStand]: {
    label: "Sit-to-stand",
    angleLabel: "Knee angle",
    low: "Seated",
    high: "Standing",
    guidance: "Stand up slowly from a sturdy chair, then sit back down with control.",
    notVisible: "Turn sideways so the camera sees your hip, knee and ankle.",
    bestView: ViewMode.Side,
  },
};

export const POSTURE_LABEL = "Posture check";

export const MODE_LABELS: Record<ExerciseMode, string> = {
  [ExerciseMode.Posture]: POSTURE_LABEL,
  ...Object.fromEntries(Object.entries(EXERCISE_COPY).map(([mode, copy]) => [mode, copy.label])),
} as Record<ExerciseMode, string>;

export const PHASE_READY = "Ready";
export const BEST_VIEW = (view: ViewMode) => `Best with ${view === ViewMode.Front ? "front" : "side"} view`;

export const MODES_GROUP = "Exercise mode";

export const VIEW_LABELS: Record<ViewMode, string> = {
  [ViewMode.Front]: "Front view",
  [ViewMode.Side]: "Side view",
};
export const VIEW_SWITCH = "Switch view";

export const REPS_LABEL = "repetitions";
export const TARGET_LABEL = (goal: number) => `Target: ${goal} repetitions`;
export const TARGET_PICK = "Set target";
export const TARGET_REACHED = "Target reached.";
export const ANGLE_THRESHOLDS = (low: number, high: number) => `counts below ${low}° then above ${high}°`;
export const ANGLE_UNKNOWN = "not visible";
export const POSTURE_COUNTER_HINT = "Choose an exercise to start counting repetitions.";

export const GUIDANCE_TITLE = "Live guidance";
export const GUIDANCE_INITIAL = ["Stand where your full body is visible.", "Keep the camera steady."];
export const GUIDANCE_NO_BODY = [
  "No body detected.",
  "Move back until the required joints are visible.",
  "Improve lighting and keep the camera steady.",
];
export const GUIDANCE_POSTURE_MODE = "Use Switch view to alternate between front and side assessments.";
export const GUIDANCE_NO_FINDINGS = "No configured posture threshold was triggered.";

export const OBSERVATIONS_TITLE = "Posture observations";
export const OBSERVATIONS_EMPTY = "No obvious threshold-based flag.";
export const OBSERVATIONS_CAVEAT = "Camera-based estimate.";
export const CORRECTION_LABEL = "Correction";
export const EXERCISE_LABEL = "Suggested";

export const TIMER_LABEL = "Session time";
export const TIMER_START = "Start timer";
export const TIMER_PAUSE = "Pause timer";
export const SAVE = "Save session";
export const SAVED = "Session saved.";
export const SAVE_FAILED = "Could not save the session on this device.";

export const PROGRESS_TITLE = "Progress";
export const SAVED_SESSIONS = (count: number) => `${count} saved session${count === 1 ? "" : "s"}`;
export const RECENT_AVERAGE = (value: number) => `Recent average: ${value.toFixed(1)} repetitions`;

export const SAFETY = "Move within a comfortable range, and rest if anything feels painful or dizzy.";

export const ABOUT_TITLE = "About and history";
export const ABOUT_BODY =
  "An educational prototype that estimates posture from a single camera, so readings are approximate. Your physiotherapist can advise which exercises suit you. Session history is kept only in this browser.";
export const DOWNLOAD_CSV = "Download history (CSV)";
export const CLEAR_HISTORY = "Clear history";
export const CSV_FILENAME = "physio_session_history.csv";
export const SHORTCUTS = "Keyboard: 1 to 7 choose an exercise · V switch view · Space timer · S save";

export const SETTINGS_GROUP = "Display and voice settings";
export const TEXT_SIZE_LABEL = "Text size";
export const TEXT_SIZES = [
  { id: "md", label: "A", name: "Standard text" },
  { id: "lg", label: "A+", name: "Large text" },
  { id: "xl", label: "A++", name: "Extra large text" },
] as const;
export const VOICE_LABEL = "Voice";
export const VOICE_ON = "On";
export const VOICE_OFF = "Off";
export const LANGUAGE_LABEL = "Voice language";
export const VOICE_MISSING = (language: string) =>
  `No ${language} voice is installed on this device. Add one in the system speech settings.`;

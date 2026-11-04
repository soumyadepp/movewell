/** All user-facing copy lives here so wording can change without touching logic. */
import { type CountedExercise, ExerciseMode, ViewMode } from "./domain/models";

export const APP_NAME = "MoveWell";
export const APP_NAME_LEAD = "Move";
export const APP_NAME_ACCENT = "Well";
export const APP_TAGLINE = "Gentle exercise guidance at home.";

export const SETUP_EYEBROW = "Getting started";
export const SETUP_TITLE_LEAD = "Let's get";
export const SETUP_TITLE_ACCENT = "set up";
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
  summary: string;
  steps: readonly [string, string, string];
  benefit: string;
  safety: string;
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
    summary: "Lifts both arms out to the side to keep shoulders mobile.",
    steps: ["Stand tall with arms relaxed by your sides.", "Raise both arms out to the side to shoulder height.", "Lower them slowly and repeat."],
    benefit: "Shoulder mobility for reaching and dressing.",
    safety: "Stop below any point of shoulder pain.",
  },
  [ExerciseMode.ElbowCurl]: {
    label: "Elbow curl",
    angleLabel: "Elbow bend",
    low: "Arm straight",
    high: "Elbow bent",
    guidance: "Keep elbows by your sides and bring your hands up towards your shoulders.",
    notVisible: "Show your shoulders, elbows and wrists to the camera.",
    bestView: ViewMode.Front,
    summary: "Bends the elbows to strengthen the front of the arms.",
    steps: ["Stand or sit with arms straight down.", "Keep elbows by your sides and lift your hands towards your shoulders.", "Lower slowly and repeat."],
    benefit: "Arm strength for lifting and carrying.",
    safety: "Hold light objects only if your physiotherapist agrees.",
  },
  [ExerciseMode.Marching]: {
    label: "Marching",
    angleLabel: "Knee lift",
    low: "Feet down",
    high: "Knee lifted",
    guidance: "Lift one knee at a time, as high as is comfortable. Hold a chair if needed.",
    notVisible: "Make sure both hips and knees are in view of the camera.",
    bestView: ViewMode.Front,
    summary: "Lifts one knee at a time, like marching on the spot.",
    steps: ["Stand facing the camera, holding a chair if needed.", "Lift one knee as high as is comfortable.", "Lower it and lift the other knee."],
    benefit: "Hip strength and balance for walking.",
    safety: "Keep a hand on a sturdy chair for balance.",
  },
  [ExerciseMode.SideLegRaise]: {
    label: "Side leg raise",
    angleLabel: "Leg angle",
    low: "Feet together",
    high: "Leg raised",
    guidance: "Hold a chair, keep your back straight and lift one leg out to the side.",
    notVisible: "Face the camera so it can see your hips and ankles.",
    bestView: ViewMode.Front,
    summary: "Lifts one leg out to the side while holding a chair.",
    steps: ["Face the camera and hold the back of a sturdy chair.", "Keep your back straight and lift one leg out to the side.", "Lower it slowly and switch legs."],
    benefit: "Hip strength that supports balance and helps prevent falls.",
    safety: "Keep the movement small and controlled.",
  },
  [ExerciseMode.SideBend]: {
    label: "Side bend",
    angleLabel: "Trunk lean",
    low: "Upright",
    high: "Leaning",
    guidance: "Slide one hand down the side of your leg, then come back to upright.",
    notVisible: "Face the camera so it can see your shoulders and hips.",
    bestView: ViewMode.Front,
    summary: "Leans gently to one side to stretch the waist.",
    steps: ["Stand tall with feet hip-width apart.", "Slide one hand down the side of your leg.", "Return upright and repeat on the other side."],
    benefit: "Flexibility in the trunk and lower back.",
    safety: "Bend only as far as is comfortable; do not twist.",
  },
  [ExerciseMode.SitToStand]: {
    label: "Sit-to-stand",
    angleLabel: "Knee angle",
    low: "Seated",
    high: "Standing",
    guidance: "Stand up slowly from a sturdy chair, then sit back down with control.",
    notVisible: "Make sure your hips and knees are in view of the camera.",
    bestView: ViewMode.Front,
    summary: "Stands up from a chair and sits back down with control.",
    steps: ["Sit near the front of a sturdy chair, facing the camera.", "Lean forward slightly and stand up, using your hands if needed.", "Sit back down slowly."],
    benefit: "Leg strength for everyday independence.",
    safety: "Use a chair that cannot slide, ideally against a wall.",
  },
};

export const POSTURE_LABEL = "Posture check";
export const POSTURE_SUMMARY = "Stand still while the camera looks at how you are standing, from the front or side.";

export const NAV_LABEL = "Main";
export const NAV_HOME = "Home";
export const NAV_EXERCISES = "Exercises";
export const NAV_PROGRESS = "Progress";

export const GREETING = (hour: number) =>
  hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
export const HOME_LEAD = "Ready for today's movement?";
export const ROUTINE_TITLE = "Today's routine";
export const ROUTINE_META = (count: number, minutes: number) => `${count} exercises · about ${minutes} minutes`;
export const ROUTINE_START = "Start routine";
export const ROUTINE_TARGET = (target: number) => `${target} reps`;
export const STAT_STREAK = "Day streak";
export const STAT_STREAK_UNIT = (n: number) => (n === 1 ? "day" : "days");
export const STAT_WEEK_DAYS = "Active days this week";
export const STAT_WEEK_REPS = "Repetitions this week";
export const STAT_WEEK_MINUTES = "Minutes this week";
export const EXPLORE_TITLE = "Exercise library";
export const EXPLORE_ALL = "See all exercises";
export const POSTURE_CARD_CTA = "Check posture";

export const LIBRARY_TITLE = "Exercises";
export const LIBRARY_LEAD = "Six gentle exercises chosen for strength, balance and mobility. Choose one to see how it works.";
export const VIEW_FRONT_LABEL = "Face the camera";
export const VIEW_SIDE_LABEL = "Stand side-on";
export const DETAIL_STEPS = "How to do it";
export const DETAIL_BENEFIT = "Why it helps";
export const DETAIL_SAFETY = "Safety";
export const DETAIL_TARGET = "Repetitions";
export const DETAIL_START = "Start exercise";
export const BACK_TO_LIBRARY = "All exercises";
export const DEMO_LABEL = (name: string) => `Animated figure showing ${name}`;

export const WORKOUT_STEP = (index: number, total: number) => `Exercise ${index} of ${total}`;
export const WORKOUT_NEXT = (name: string) => `Next: ${name}`;
export const WORKOUT_SKIP = "Skip exercise";
export const WORKOUT_END = "End session";
export const WORKOUT_FINISH = "Finish";
export const REST_TITLE = "Rest";
export const REST_NEXT = (name: string) => `Up next: ${name}`;
export const REST_SKIP = "Start now";
export const REST_TURN = (side: boolean) => (side ? "Turn side-on to the camera." : "Face the camera.");

export const SUMMARY_TITLE_LEAD = "Well";
export const SUMMARY_TITLE_ACCENT = "done";
export const SUMMARY_LEAD = "Here is what you did today.";
export const SUMMARY_EMPTY = "No repetitions were counted this time. That's fine, every attempt counts.";
export const SUMMARY_REPS = "Repetitions";
export const SUMMARY_TIME = "Active time";
export const SUMMARY_COMPLETED = "Exercises completed";
export const SUMMARY_DONE = "Completed";
export const SUMMARY_PARTIAL = "Partly done";
export const SUMMARY_HOME = "Back to home";
export const SUMMARY_PROGRESS = "See progress";
export const DURATION = (seconds: number) =>
  seconds < 60 ? `${seconds} s` : `${Math.floor(seconds / 60)} min ${String(seconds % 60).padStart(2, "0")} s`;

export const PROGRESS_LEAD = "Your activity from the last two weeks.";
export const CHART_TITLE = (name: string) => `${name}: repetitions per day`;
export const CHART_PICK = "Exercise";
export const CHART_EMPTY = "No sessions yet for this exercise. Complete one to see it here.";
export const CHART_TOOLTIP = (day: string, reps: number) => `${day}: ${reps} repetitions`;
export const CHART_TABLE = "Show as table";
export const CHART_DAY = "Day";
export const RECENT_TITLE = "Recent sessions";
export const RECENT_EMPTY = "Your completed exercises will appear here.";


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
export const CSV_FILENAME = "movewell_history.csv";
export const SHORTCUTS = "Keyboard: Tab moves between controls, Enter activates them.";

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

export const CANCEL = "Cancel";
export const SKIP_LINK = "Skip to content";
export const FOOTER =
  "MoveWell is an educational prototype, not a medical device. Camera-based estimates are approximate. Ask your physiotherapist which exercises suit you. Video is processed on this device and never uploaded.";
export const GUIDANCE_TURN_FRONT = "Face the camera so both shoulders are visible.";
export const GUIDANCE_TURN_SIDE = "Turn side-on to the camera for this exercise.";

export const DIAGNOSTICS_TITLE = "Diagnostics";
export const DIAGNOSTICS_SKELETON = "Show tracking lines on the camera";
export const DIAGNOSTICS_FPS = (fps: number) => `Tracking at ${fps} frames per second`;
export const DIAGNOSTICS_ANGLE = (label: string, angle: string) => `${label}: ${angle}`;
export const DIAGNOSTICS_GUIDANCE = "Current check";
export const DIAGNOSTICS_RECORD = "Record movement data";
export const DIAGNOSTICS_STOP = (frames: number) => `Stop and download (${frames} frames)`;
export const DIAGNOSTICS_RECORD_NOTE =
  "Records body landmark positions only, never video, so counting can be tuned. The file downloads to this device.";
export const RECORDING_FILENAME = "movewell-landmarks.json";

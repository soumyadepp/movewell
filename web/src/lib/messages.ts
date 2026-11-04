/**
 * All on-screen copy. Voice (docs/DESIGN.md): plain, warm, second person,
 * short sentences, like a kind physiotherapist. Say "times" or "movements",
 * never "reps", "angle" or "threshold". No taglines.
 */
import { ViewMode } from "./domain/models";

export const WORDMARK = ["Move", "Well"] as const;
export const APP_NAME = "MoveWell";
export const PHYSIO_NAME = "Sarah Jenkins";
export const PHYSIO_FIRST_NAME = "Sarah";
export const PLAN_DAYS_PER_WEEK = 5;
export const DEFAULT_NAME = "there";

export const NAV_LABEL = "Main";
export const NAV_TODAY = "Today";
export const NAV_EXERCISES = "Exercises";
export const NAV_WEEK = "Your week";
export const NAV_SETTINGS = "Settings";
export const SKIP_LINK = "Skip to content";
export const BACK = "Back";
export const CONTINUE = "Continue";
export const DONE = "Done";

export const STEP_OF = (step: number, total: number) =>
  `Step ${step} of ${total}`;

export const WELCOME_TITLE = "Welcome to MoveWell";
export const WELCOME_BODY = `${PHYSIO_NAME}, your physiotherapist, has set up a short daily session for you. Let's get you ready. It takes about a minute.`;
export const WELCOME_NAME_LABEL = "What should we call you?";
export const WELCOME_NAME_HINT = "We'll use this to greet you each day.";
export const WELCOME_PRIVACY =
  "Your progress is shared only with your physiotherapist.";

export const COMFORT_TITLE = "Make it comfortable";
export const COMFORT_LEAD = "You can change these anytime in Settings.";
export const TEXT_SIZE = "Text size";
export const TEXT_SIZE_HINT = "Make the words easier to read.";
export const TEXT_SIZES = [
  { id: "md", label: "Standard" },
  { id: "lg", label: "Large" },
  { id: "xl", label: "Extra large" },
] as const;
export const TEXT_SAMPLE = "Lift both arms slowly, then lower them.";
export const VOICE_LABEL = "Spoken guidance";
export const VOICE_HINT = "Hear counting and coaching out loud.";
export const VOICE_ON = "On";
export const VOICE_OFF = "Off";
export const SOUNDS_LABEL = "Sound cues";
export const SOUNDS_HINT =
  "Short tones when you are in view, out of view, or counted.";
export const LANGUAGE_LABEL = "Language";
export const LANGUAGE_HINT = "For spoken guidance.";
export const VOICE_MISSING = (language: string) =>
  `No ${language} voice is installed on this computer, so guidance will use the default voice.`;

export const SPACE_TITLE = "Set up your space";
export const SPACE_STEPS = [
  "Put your laptop on a table at about waist height.",
  "Stand 2 to 3 metres back so your whole body is on screen.",
  "Keep a sturdy chair close by.",
] as const;
export const SPACE_PRIVACY =
  "Your video stays on this computer. Nothing is recorded or sent anywhere.";
export const SPACE_START = "Turn on camera";
export const CAMERA_DENIED =
  "The camera didn't turn on. Click the camera icon in the address bar, choose Allow, then try again.";
export const MODEL_FAILED =
  "Something didn't load. Check the internet connection and refresh the page.";
export const LOADING_MODEL = "Getting ready…";
export const TRY_AGAIN = "Try again";

export const GREETING_HELLO = (hour: number) =>
  hour < 12 ? "Good morning," : hour < 17 ? "Good afternoon," : "Good evening,";
export const GREETING_NAME = (name: string) => `${name}.`;
export const SESSION_LENGTH = (minutes: number) =>
  `Today's session: ${minutes} minutes`;
export const SESSION_DONE_TODAY = "You've done today's session. Well done.";
export const START_SESSION = "Start session";
export const START_AGAIN = "Do it again";
export const THIS_WEEK = "This week";
export const WEEK_PROGRESS = (days: number) =>
  `${days} ${days === 1 ? "day" : "days"} this week. Your plan asks for ${PLAN_DAYS_PER_WEEK}.`;
export const PLAN_BY = `Plan set by ${PHYSIO_NAME}, Physiotherapist.`;
export const PLAN_CUSTOM = `Your own plan, based on ${PHYSIO_NAME}'s.`;
export const PLAN_EDIT = "Change my plan";
export const PLAN_TITLE = "My plan";
export const PLAN_LEAD =
  "Choose your exercises, their order and how many times. Changes save as you go.";
export const PLAN_SUMMARY = (count: number, minutes: number) =>
  `${count} ${count === 1 ? "exercise" : "exercises"}, about ${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
export const PLAN_TIMES = "Times";
export const PLAN_MOVE_UP = (name: string) => `Move ${name} up`;
export const PLAN_MOVE_DOWN = (name: string) => `Move ${name} down`;
export const PLAN_REMOVE = (name: string) => `Remove ${name}`;
export const PLAN_MOVED = (name: string, position: number, total: number) =>
  `${name} is now ${position} of ${total}.`;
export const PLAN_REMOVE_SHORT = "Remove";
export const PLAN_ADD = "Add an exercise";
export const PLAN_ALL_ADDED = "Every exercise is already in your plan.";
export const PLAN_REST = "Rest between exercises";
export const PLAN_SECONDS = (seconds: number) => `${seconds} sec`;
export const PLAN_RESET = `Go back to ${PHYSIO_FIRST_NAME}'s plan`;
export const PLAN_DONE = "Done";
export const NEXT_EXERCISE = "Next exercise";
export const END_CONFIRM = (done: number, total: number) =>
  `End the session now? You've done ${done} of ${total}.`;
export const FORGET_RANGES = "Forget my movement ranges";
export const RANGES_FORGOTTEN =
  "Done. Each exercise will learn your range again next time.";
export const LEARNING_RANGE =
  "Do two slow, comfortable movements, as far as feels right. MoveWell will learn your range.";
export const GET_READY = "Get ready";
export const PAUSED_TITLE = "Paused";
export const PAUSED_AWAY = "Step back into view and we'll carry on.";
export const PAUSED_USER = "Take your time.";
export const CARRY_ON = "Carry on";
export const PAUSE = "Pause";
export const VOICE_COMMANDS_LABEL = "Voice commands";
export const VOICE_COMMANDS_HINT = (
  next: string,
  pause: string,
  resume: string,
  end: string,
) =>
  `Say "${next}", "${pause}", "${resume}" or "${end}" during a session, so you don't need to come back to the screen.`;
export const VOICE_COMMANDS_PRIVACY =
  "Your browser listens only during a session, and may send what you say to Google to understand it. Video never leaves this computer.";
export const VOICE_COMMANDS_UNSUPPORTED =
  "This browser can't listen for commands. Chrome and Edge can.";
export const VOICE_COMMANDS_BLOCKED =
  "The microphone is blocked. Allow it from the icon in the browser's address bar to use voice commands.";
export const LISTENING_FOR = (next: string, pause: string, end: string) =>
  `Listening. Say "${next}", "${pause}" or "${end}".`;
export const HEARD = (word: string) => `Heard "${word}"`;
export const HEARD_OTHER = (text: string, next: string, pause: string) =>
  `Heard "${text}". Try "${next}" or "${pause}".`;
export const VOICE_PROBLEM_NETWORK =
  "Voice commands need an internet connection to the browser's speech service. Use the buttons for now.";
export const VOICE_PROBLEM_BUSY =
  "Something else is using speech recognition, such as another tab or app. Close it, then try again.";
export const VOICE_PROBLEM_OTHER_TAB =
  "Voice commands moved to another MoveWell tab.";
export const VOICE_PROBLEM_MICROPHONE =
  "No microphone was found. Use the buttons for now.";
export const VOICE_OFF_ACTION = "Turn on voice commands";
export const VOICE_LISTENING = "Listening";
export const VOICE_HEARING = "Hearing you…";
export const VOICE_SAY = (next: string, pause: string, end: string) =>
  `Say "${next}", "${pause}" or "${end}".`;
export const VOICE_TRY_AGAIN = "Try again";
export const VOICE_STARTING = "Starting the microphone…";
export const KEEP_GOING = "Keep going";
export const END_NOW = "End now";
export const DAY_DONE = "Done";
export const DAY_NOT_YET = "Not yet";

export const EXERCISES_TITLE = "Exercises";
export const EXERCISES_LEAD = "Six gentle exercises from your plan.";
export const VIEW_FRONT = "Face the camera";
export const VIEW_SIDE = "Stand side-on";
export const VIEW_HINT = (view: ViewMode) =>
  view === ViewMode.Side ? VIEW_SIDE : VIEW_FRONT;
export const ALL_EXERCISES = "All exercises";
export const WHY_IT_HELPS = "Why it helps";
export const TAKE_CARE = "Take care";
export const HOW_MANY = "How many times";
export const START_EXERCISE = "Start this exercise";
export const DEMO_LABEL = (name: string) => `Animated demonstration of ${name}`;

export const NEXT_POSITION = (index: number, total: number) =>
  `${index} of ${total}`;
export const TIMES = (n: number) => `${n} times`;
export const READY = "I'm ready";
export const SKIP_THIS = "Skip this one";
export const OF = (n: number) => `of ${n}`;
export const END_SESSION = "End session";
export const FINISH = "Finish";
export const REST = "Rest";
export const UP_NEXT = (name: string) => `Up next: ${name}`;
export const START_NOW = "Start now";
export const STEP_BACK = "Step back so the camera can see your whole body.";
export const CAMERA_OFF_TITLE = "Turn on your camera to begin";
export const CAMERA_OFF_BODY =
  "Stand 2 to 3 metres back with your whole body in view. Your video stays on this computer.";
export const TARGET_REACHED = "That's all of them. Well done.";

export const DONE_TITLE = (name: string) => `Well done, ${name}.`;
export const DONE_ACCENT = "Well done";
export const DONE_REST = (name: string) => `, ${name}.`;
export const DONE_STATS = (movements: number, minutes: number) =>
  `${movements} ${movements === 1 ? "movement" : "movements"} in ${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
export const DONE_WEEK = (days: number) =>
  `That's ${days} ${days === 1 ? "day" : "days"} this week.`;
export const DONE_EMPTY =
  "No movements were counted this time. That's fine. Every try counts.";
export const DONE_LIST = "Today's session";
export const RESULT = (reps: number, target: number) => `${reps} of ${target}`;
export const PARTLY_DONE = "Partly done";
export const PHYSIO_CAN_SEE = `${PHYSIO_FIRST_NAME} can see this session at your next visit.`;

export const WEEK_TITLE = "Your week";
export const RECENT_SESSIONS = "Recent sessions";
export const NO_SESSIONS =
  "Your sessions will appear here after you finish one.";
export const DAY_MINUTES = (minutes: number) => `${minutes} min`;
export const SESSION_MINUTES = (minutes: number) =>
  `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
export const SESSION_EXERCISES = (n: number) =>
  `${n} ${n === 1 ? "exercise" : "exercises"}`;
export const TODAY_LABEL = "Today";

export const SETTINGS_TITLE = "Settings";
export const YOUR_NAME = "Your name";
export const ADVANCED = "Advanced, for your physiotherapist";
export const SHOW_LINES = "Show tracking lines on the camera";
export const RECORD_DATA = "Record movement data during sessions";
export const RECORD_HINT =
  "Saves body positions only, never video, as a file on this computer after each session.";
export const DOWNLOAD_CSV = "Download session history (CSV)";
export const CLEAR_HISTORY = "Clear history";
export const CLEAR_CONFIRM = "Clear all session history on this computer?";
export const CLEAR_YES = "Yes, clear it";
export const CANCEL = "Cancel";
export const SAVED = "Saved.";
export const SAVE_FAILED = "Couldn't save on this computer.";

export const FOOTER_NOTE =
  "MoveWell is an educational prototype, not a medical device. Ask your physiotherapist which exercises suit you.";

export const GUIDANCE_INITIAL = [
  "Step back so the camera can see your whole body.",
  "Keep the camera still.",
];
export const GUIDANCE_NO_BODY = [
  "I can't see you yet.",
  "Step back so the camera can see your whole body.",
  "Try turning on a light.",
];
export const GUIDANCE_POSTURE_MODE =
  "Stand comfortably and look straight ahead.";
export const GUIDANCE_NO_FINDINGS = "You're standing well.";
export const GUIDANCE_TURN_FRONT =
  "Face the camera so I can see both shoulders.";
export const GUIDANCE_TURN_SIDE = "Turn side-on to the camera for this one.";

export const CSV_FILENAME = "movewell_history.csv";
export const RECORDING_FILENAME = "movewell-landmarks.json";

export const DEV = {
  title: "Frame inspector",
  hide: "Hide",
  show: "Inspector",
  fps: "fps",
  reading: "raw",
  smoothed: "smoothed",
  band: "band",
  range: "range",
  zone: "zone",
  phase: "phase",
  reps: "reps",
  blockedFor: "blocked for",
  joints: "Joint confidence (dropped below cut-off in red)",
  details: "Exercise breakdown",
} as const;

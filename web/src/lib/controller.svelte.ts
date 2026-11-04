/**
 * Reactive facade between Svelte components and the pure application core.
 *
 * Owns routing, the guided routine, the camera lifecycle and preferences.
 * Components read reactive state and call actions; they never touch the
 * camera, MediaPipe, audio or storage directly.
 */
import { Assistant } from "./assistant";
import { type FrameInspection, inspectFrame } from "./analysis/inspection";
import { dayStreak } from "./analysis/progress";
import { DEFAULT_GOAL, POSTURE, PREFERENCES_KEY, STORAGE_KEY } from "./config";
import {
  type CountedExercise,
  ExerciseMode,
  exerciseFromSlug,
  exerciseSlug,
  type Finding,
  isCounted,
  type MovementPhase,
  type SessionRecord,
  type ViewMode,
} from "./domain/models";
import { EventBus } from "./events";
import { SPEECH_CATALOGS, PhraseKey, type VoiceLanguage } from "./i18n/speech";
import { attachCues, WebAudioCuePlayer } from "./infrastructure/cues";
import { BrowserPoseEstimator, LANDMARK_INDEX } from "./infrastructure/pose";
import {
  downloadText,
  LocalStorageRepository,
  toCsv,
} from "./infrastructure/storage";
import {
  attachVoice,
  ClipSpeaker,
  pickVoice,
  WebSpeechSpeaker,
} from "./infrastructure/voice";
import * as msg from "./messages";
import {
  DAILY_ROUTINE,
  type RoutinePhase,
  RoutineRun,
  type RoutineStep,
  type StepResult,
  singleExercise,
} from "./routine";
import { secondsClock } from "./session";
import { Smoothed } from "./stable";

export type Stage = "onboarding" | "loading" | "running" | "error";
export type TextSize = "md" | "lg" | "xl";

export type SetupStep = "welcome" | "comfort" | "space";

export type Route =
  | { name: "setup"; step: SetupStep }
  | { name: "home" }
  | { name: "library" }
  | { name: "detail"; mode: ExerciseMode }
  | { name: "workout"; kind: "routine" }
  | { name: "workout"; kind: "single"; mode: CountedExercise; target: number }
  | { name: "summary" }
  | { name: "week" }
  | { name: "settings" };

export const href = {
  home: "#/",
  library: "#/exercises",
  detail: (mode: ExerciseMode) => `#/exercises/${exerciseSlug(mode)}`,
  routine: "#/workout/routine",
  single: (mode: ExerciseMode, target: number) =>
    `#/workout/${exerciseSlug(mode)}?target=${target}`,
  summary: "#/summary",
  week: "#/week",
  settings: "#/settings",
  setup: (step: SetupStep) => `#/setup/${step}`,
};

/** Parses a location hash into a route, falling back to home. */
export function parseRoute(hash: string): Route {
  const [path, query = ""] = hash.replace(/^#/, "").split("?");
  const parts = path.split("/").filter(Boolean);
  if (parts[0] === "exercises" && parts[1]) {
    const mode = exerciseFromSlug(parts[1]);
    return mode ? { name: "detail", mode } : { name: "library" };
  }
  if (parts[0] === "exercises") return { name: "library" };
  if (parts[0] === "week" || parts[0] === "progress") return { name: "week" };
  if (parts[0] === "settings") return { name: "settings" };
  if (parts[0] === "setup") {
    const step =
      parts[1] === "comfort" || parts[1] === "space" ? parts[1] : "welcome";
    return { name: "setup", step };
  }
  if (parts[0] === "summary") return { name: "summary" };
  if (parts[0] === "workout") {
    if (parts[1] === "routine") return { name: "workout", kind: "routine" };
    const mode = parts[1] ? exerciseFromSlug(parts[1]) : null;
    if (mode && isCounted(mode)) {
      const target =
        Number(new URLSearchParams(query).get("target")) || DEFAULT_GOAL;
      return { name: "workout", kind: "single", mode, target };
    }
  }
  return { name: "home" };
}

interface Preferences {
  textSize: TextSize;
  language: VoiceLanguage;
  muted: boolean;
  sounds: boolean;
  name: string;
  onboarded: boolean;
  showSkeleton: boolean;
  recordSessions: boolean;
}

/** Milliseconds between developer panel updates, so it never slows the frame loop. */
const INSPECTION_INTERVAL_MS = 100;

/**
 * Dev mode shows the frame inspection panel. On by default under the Vite dev
 * server; elsewhere it is enabled by adding ?debug to the page URL.
 */
function devModeRequested(): boolean {
  if (import.meta.env.DEV) return true;
  return (
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("debug")
  );
}

const DEFAULT_PREFERENCES: Preferences = {
  textSize: "lg",
  language: "en",
  muted: false,
  sounds: true,
  name: "",
  onboarded: false,
  showSkeleton: false,
  recordSessions: false,
};

function loadPreferences(): Preferences {
  try {
    const raw = localStorage.getItem(PREFERENCES_KEY);
    return {
      ...DEFAULT_PREFERENCES,
      ...(raw ? (JSON.parse(raw) as Partial<Preferences>) : {}),
    };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export interface Snapshot {
  view: ViewMode;
  mode: ExerciseMode;
  goal: number;
  reps: number;
  phase: MovementPhase;
  angle: number | null;
  bodyDetected: boolean;
  findings: Finding[];
  guidance: string[];
}

export interface RoutineSnapshot {
  steps: RoutineStep[];
  index: number;
  phase: RoutinePhase;
  restRemainingS: number;
  next: RoutineStep | null;
  isSingle: boolean;
}

export interface SessionSummary {
  results: StepResult[];
  totalReps: number;
  totalS: number;
  completed: number;
  streak: number;
}

export interface Diagnostics {
  fps: number;
  rawBlocked: string | null;
  framesRecorded: number;
}

interface RecordedFrame {
  t: number;
  mode: ExerciseMode;
  aspect: number;
  landmarks: number[][];
  world: number[][];
}

const CELEBRATION_MS = 3500;
/** Recording stops by itself after this many frames (about one minute at 30 fps). */
const MAX_RECORDED_FRAMES = 1800;
const round = (n: number) => Math.round(n * 10000) / 10000;
const FINISH_DELAY_MS = 2500;

export class CoachController {
  route = $state<Route>({ name: "home" });
  stage = $state<Stage>("onboarding");
  errorMessage = $state("");
  celebrating = $state(false);
  muted = $state(false);
  sounds = $state(true);
  textSize = $state<TextSize>("lg");
  language = $state<VoiceLanguage>("en");
  voiceMissing = $state(false);
  snapshot = $state<Snapshot>() as Snapshot;
  routine = $state<RoutineSnapshot | null>(null);
  summary = $state<SessionSummary | null>(null);
  history = $state<SessionRecord[]>([]);
  showSkeleton = $state(false);
  recordSessions = $state(false);
  recording = $state(false);
  name = $state("");
  onboarded = $state(false);
  cameraGranted = $state(false);
  devMode = $state(devModeRequested());
  inspection = $state<FrameInspection | null>(null);
  diagnostics = $state<Diagnostics>({
    fps: 0,
    rawBlocked: null,
    framesRecorded: 0,
  });

  private readonly events = new EventBus();
  private readonly speaker = new ClipSpeaker(
    import.meta.env.BASE_URL,
    new WebSpeechSpeaker(),
    secondsClock,
  );
  private readonly cues = new WebAudioCuePlayer();
  private readonly repository = new LocalStorageRepository(STORAGE_KEY);
  private readonly assistant: Assistant;
  private readonly voiceReady: Promise<void>;
  private readonly angle = new Smoothed(0.3);
  private estimator: BrowserPoseEstimator | null = null;
  private stream: MediaStream | null = null;
  private frameHandle = 0;
  private celebrationTimer: ReturnType<typeof setTimeout> | undefined;
  private finishTimer: ReturnType<typeof setTimeout> | undefined;
  private run: RoutineRun | null = null;
  private recorded: RecordedFrame[] = [];
  private canvas: HTMLCanvasElement | null = null;

  constructor() {
    this.assistant = new Assistant({
      posture: POSTURE,
      events: this.events,
      repository: this.repository,
      clock: secondsClock,
    });
    attachVoice(this.events, this.speaker, () => this.language);
    attachCues(this.events, this.cues, secondsClock);
    const prefs = loadPreferences();
    this.textSize = prefs.textSize;
    this.name = prefs.name;
    this.onboarded = prefs.onboarded;
    this.showSkeleton = prefs.showSkeleton;
    this.recordSessions = prefs.recordSessions;
    this.muted = prefs.muted;
    this.speaker.enabled = !prefs.muted;
    this.sounds = prefs.sounds;
    this.cues.enabled = prefs.sounds;
    this.language = prefs.language;
    this.voiceReady = this.speaker
      .load()
      .then(() => this.setLanguage(this.language));
    if (typeof window !== "undefined") {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.addEventListener("voiceschanged", () =>
          this.setLanguage(this.language),
        );
      }
      window.addEventListener("hashchange", () => this.onRouteChange());
    }
    this.events.subscribe("goalReached", () => this.onGoalReached());
    this.refresh();
    this.onRouteChange();
    void this.checkCameraPermission();
  }

  /** Name used in greetings, falling back to a neutral word before setup. */
  get displayName(): string {
    return this.name.trim() || msg.DEFAULT_NAME;
  }

  setName(name: string): void {
    this.name = name.trim().slice(0, 40);
    this.savePreferences();
  }

  finishSetup(): void {
    this.onboarded = true;
    this.savePreferences();
    this.navigate(href.home);
  }

  setRecordSessions(on: boolean): void {
    this.recordSessions = on;
    this.savePreferences();
  }

  /**
   * Asks for camera permission once during setup, then releases the camera.
   *
   * @returns True if access was granted.
   */
  async requestCameraAccess(): Promise<boolean> {
    this.errorMessage = "";
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      for (const track of stream.getTracks()) track.stop();
      this.cameraGranted = true;
      return true;
    } catch {
      this.errorMessage = msg.CAMERA_DENIED;
      return false;
    }
  }

  /** Moves from the "Next up" introduction to counting the exercise. */
  beginExercise(): void {
    this.run?.begin();
    this.refresh();
  }

  private async checkCameraPermission(): Promise<void> {
    try {
      const status = await navigator.permissions?.query({
        name: "camera" as PermissionName,
      });
      if (status?.state === "granted") this.cameraGranted = true;
    } catch {
      return;
    }
  }

  /** Whether the camera can start without showing the setup sheet. */
  get canAutoStart(): boolean {
    return this.cameraGranted;
  }

  get streak(): number {
    return dayStreak(this.history, new Date());
  }

  navigate(hash: string): void {
    if (window.location.hash === hash) this.onRouteChange();
    else window.location.hash = hash;
  }

  async start(
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement,
  ): Promise<void> {
    if (this.stage === "loading") return;
    this.stage = "loading";
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 960 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: false,
      });
    } catch {
      this.fail(msg.CAMERA_DENIED);
      return;
    }
    video.srcObject = this.stream;
    await video.play();
    try {
      this.estimator ??= await BrowserPoseEstimator.create();
    } catch {
      this.fail(msg.MODEL_FAILED);
      return;
    }
    await this.voiceReady;
    this.cameraGranted = true;
    this.stage = "running";
    this.beginWorkout();
    this.loop(video, canvas);
  }

  stop(): void {
    this.finishRecording();
    cancelAnimationFrame(this.frameHandle);
    for (const track of this.stream?.getTracks() ?? []) track.stop();
    this.stream = null;
    this.speaker.stop();
    clearTimeout(this.finishTimer);
    if (this.stage !== "error") this.stage = "onboarding";
  }

  skipExercise(): void {
    if (this.run?.phase === "intro") this.run.begin();
    if (!this.run || this.run.phase !== "exercise") return;
    this.recordStep(this.run.completeStep(this.assistant.counter.reps, false));
  }

  skipRest(): void {
    if (!this.run) return;
    this.run.skipRest();
    this.beginStep();
  }

  endSession(): void {
    if (this.run) {
      const before = this.run.results.length;
      this.run.finish(this.assistant.counter.reps);
      this.logResults(this.run.results.slice(before));
      this.showSummary();
    } else {
      this.navigate(href.home);
    }
  }

  toggleView(): void {
    this.assistant.toggleView();
    this.refresh();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.speaker.enabled = !muted;
    if (muted) this.speaker.stop();
    this.savePreferences();
  }

  /** Turns the non-verbal sound cues on or off, playing one as a sample when turned on. */
  setSounds(on: boolean): void {
    this.sounds = on;
    this.cues.enabled = on;
    if (on) {
      this.cues.unlock();
      this.cues.play("ready");
    }
    this.savePreferences();
  }

  setTextSize(size: TextSize): void {
    this.textSize = size;
    this.savePreferences();
  }

  chooseLanguage(language: VoiceLanguage): void {
    this.setLanguage(language);
    this.speaker.say(language, PhraseKey.selected, "interrupt");
  }

  setLanguage(language: VoiceLanguage): void {
    this.language = language;
    this.speaker.preload(language);
    this.voiceMissing =
      !this.speaker.hasClips(language) && !this.hasSystemVoice(language);
    this.savePreferences();
  }

  setDevMode(on: boolean): void {
    this.devMode = on;
    if (!on) this.inspection = null;
  }

  setShowSkeleton(show: boolean): void {
    this.showSkeleton = show;
    this.savePreferences();
    if (!show && this.canvas)
      this.canvas
        .getContext("2d")
        ?.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /** Starts or stops recording landmark data (never video) for tuning; stopping downloads a JSON file. */
  toggleRecording(): void {
    if (!this.recording) {
      this.recorded = [];
      this.recording = true;
      return;
    }
    this.recording = false;
    const payload = {
      app: msg.APP_NAME,
      recordedAt: new Date().toISOString(),
      frames: this.recorded,
    };
    downloadText(
      msg.RECORDING_FILENAME,
      JSON.stringify(payload),
      "application/json",
    );
    this.recorded = [];
    this.diagnostics = { ...this.diagnostics, framesRecorded: 0 };
  }

  downloadHistory(): void {
    downloadText(msg.CSV_FILENAME, toCsv(this.assistant.history));
  }

  clearHistory(): void {
    this.assistant.clearHistory();
    this.refresh();
  }

  private onRouteChange(): void {
    const route = parseRoute(
      typeof window === "undefined" ? "" : window.location.hash,
    );
    if (!this.onboarded && route.name !== "setup") {
      this.navigate(href.setup("welcome"));
      return;
    }
    if (this.route.name === "workout" && route.name !== "workout") this.stop();
    this.route = route;
    if (route.name === "workout") {
      this.run = null;
      this.routine = null;
      if (this.stage === "running") this.beginWorkout();
    }
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  }

  /** Creates the routine for the current workout route and starts its first step. */
  private beginWorkout(): void {
    const route = this.route;
    if (route.name !== "workout") return;
    this.summary = null;
    this.celebrating = false;
    const plan =
      route.kind === "routine"
        ? DAILY_ROUTINE
        : singleExercise(route.mode, route.target);
    this.run = new RoutineRun(plan, secondsClock);
    this.cues.unlock();
    if (this.recordSessions && !this.recording) this.toggleRecording();
    if (!this.run.isSingle)
      this.events.publish("routineStarted", { steps: plan.steps.length });
    this.beginStep();
  }

  private beginStep(): void {
    const step = this.run?.current;
    if (!step) return;
    this.celebrating = false;
    this.assistant.setGoal(step.target);
    this.assistant.selectMode(step.mode);
    this.angle.update(null);
    this.refresh();
  }

  private onGoalReached(): void {
    this.celebrate();
    if (!this.run || this.run.phase !== "exercise") return;
    this.recordStep(this.run.completeStep(this.assistant.counter.reps, true));
  }

  private recordStep(phase: RoutinePhase): void {
    if (!this.run) return;
    this.logResults(this.run.results.slice(-1));
    if (phase === "done") {
      if (!this.run.isSingle) this.events.publish("routineCompleted", {});
      clearTimeout(this.finishTimer);
      this.finishTimer = setTimeout(() => this.showSummary(), FINISH_DELAY_MS);
    }
    this.refresh();
  }

  private logResults(results: StepResult[]): void {
    for (const result of results) {
      if (result.reps > 0)
        this.assistant.logExercise(result.mode, result.reps, result.durationS);
    }
  }

  private showSummary(): void {
    const results = this.run?.results ?? [];
    this.summary = {
      results,
      totalReps: results.reduce((sum, r) => sum + r.reps, 0),
      totalS: results.reduce((sum, r) => sum + r.durationS, 0),
      completed: results.filter((r) => r.completed).length,
      streak: dayStreak(this.assistant.history, new Date()),
    };
    this.run = null;
    this.navigate(href.summary);
  }

  private hasSystemVoice(language: VoiceLanguage): boolean {
    if (typeof window === "undefined" || !("speechSynthesis" in window))
      return false;
    const voices = window.speechSynthesis.getVoices();
    return (
      voices.length === 0 ||
      pickVoice(voices, SPEECH_CATALOGS[language].bcp47) !== null
    );
  }

  private savePreferences(): void {
    try {
      const prefs: Preferences = {
        textSize: this.textSize,
        language: this.language,
        muted: this.muted,
        sounds: this.sounds,
        name: this.name,
        onboarded: this.onboarded,
        showSkeleton: this.showSkeleton,
        recordSessions: this.recordSessions,
      };
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(prefs));
    } catch {
      return;
    }
  }

  private loop(video: HTMLVideoElement, canvas: HTMLCanvasElement): void {
    let lastVideoTime = -1;
    const styles = getComputedStyle(document.documentElement);
    const skeleton = {
      joint: styles.getPropertyValue("--skeleton-joint").trim(),
      bone: styles.getPropertyValue("--skeleton-bone").trim(),
    };
    this.canvas = canvas;
    let frames = 0;
    let fpsWindowStart = performance.now();
    let lastInspection = 0;
    const tick = () => {
      this.frameHandle = requestAnimationFrame(tick);
      if (this.run?.tick()) this.beginStep();
      if (
        !this.estimator ||
        video.readyState < 2 ||
        video.currentTime === lastVideoTime
      ) {
        this.refreshRoutine();
        return;
      }
      lastVideoTime = video.currentTime;
      if (canvas.width !== video.videoWidth) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
      const now = performance.now();
      const detection = this.estimator.detect(video, now);
      if (this.showSkeleton || this.devMode)
        this.estimator.draw(canvas, detection, skeleton);
      frames++;
      if (now - fpsWindowStart >= 1000) {
        this.diagnostics = {
          ...this.diagnostics,
          fps: Math.round((frames * 1000) / (now - fpsWindowStart)),
        };
        frames = 0;
        fpsWindowStart = now;
      }
      if (this.recording && detection)
        this.recordFrame(now, video, detection.landmarks, detection.world);
      if (!this.run || this.run.phase === "exercise")
        this.assistant.process(detection?.points ?? null);
      if (this.devMode && now - lastInspection >= INSPECTION_INTERVAL_MS) {
        lastInspection = now;
        this.inspection = inspectFrame({
          fps: this.diagnostics.fps,
          mode: this.assistant.mode,
          goal: this.assistant.goal,
          counter: this.assistant.counter,
          points: detection?.points ?? null,
          visibility: (joint) =>
            detection?.landmarks[LANDMARK_INDEX[joint]]?.visibility ?? null,
          now: secondsClock(),
        });
      }
      this.refresh();
    };
    tick();
  }

  private recordFrame(
    t: number,
    video: HTMLVideoElement,
    landmarks: { x: number; y: number; z: number; visibility?: number }[],
    world: { x: number; y: number; z: number }[],
  ): void {
    this.recorded.push({
      t: round(t / 1000),
      mode: this.assistant.mode,
      aspect: round(video.videoWidth / Math.max(1, video.videoHeight)),
      landmarks: landmarks.map((l) => [
        round(l.x),
        round(l.y),
        round(l.z),
        round(l.visibility ?? 0),
      ]),
      world: world.map((w) => [round(w.x), round(w.y), round(w.z)]),
    });
    this.diagnostics = {
      ...this.diagnostics,
      framesRecorded: this.recorded.length,
    };
    if (this.recorded.length >= MAX_RECORDED_FRAMES) this.toggleRecording();
  }

  private finishRecording(): void {
    if (this.recording) this.toggleRecording();
  }

  private celebrate(): void {
    this.celebrating = true;
    clearTimeout(this.celebrationTimer);
    this.celebrationTimer = setTimeout(
      () => (this.celebrating = false),
      CELEBRATION_MS,
    );
  }

  private fail(message: string): void {
    this.stop();
    this.errorMessage = message;
    this.stage = "error";
  }

  private refreshRoutine(): void {
    const run = this.run;
    this.routine = run
      ? {
          steps: run.plan.steps,
          index: run.index,
          phase: run.phase,
          restRemainingS: run.restRemainingS(),
          next: run.next,
          isSingle: run.isSingle,
        }
      : null;
  }

  private refresh(): void {
    const a = this.assistant;
    this.snapshot = {
      view: a.view,
      mode: a.mode,
      goal: a.goal,
      reps: a.counter.reps,
      phase: a.counter.phase,
      angle: this.angle.update(a.counter.lastAngle),
      bodyDetected: a.frame.bodyDetected,
      findings: a.frame.findings,
      guidance: a.frame.guidance,
    };
    if (this.history !== a.history) this.history = a.history;
    this.refreshRoutine();
  }
}

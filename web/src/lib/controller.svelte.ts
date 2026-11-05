/**
 * Reactive facade between the Svelte screens and the application core.
 *
 * Holds the state the screens read, applies the person's settings, and runs
 * the guided routine: it starts each step, reacts to frames from the camera,
 * and turns button presses and spoken commands into routine actions. Camera,
 * storage, voice commands and presence detection live in their own modules.
 */
import { type FrameInspection, inspectFrame } from "./analysis/inspection";
import { dayStreak } from "./analysis/progress";
import { Assistant } from "./assistant";
import { type Command, type CommandAction, commandAction } from "./commands";
import { PLAN_KEY, POSTURE, PREFERENCES_KEY, RANGES_KEY, STORAGE_KEY } from "./config";
import type { Guidance } from "./domain/guidance";
import type { ExerciseMode, Finding, MovementPhase, SessionRecord, ViewMode } from "./domain/models";
import { EventBus } from "./events";
import { PhraseKey, phraseText, SPEECH_CATALOGS, type VoiceLanguage } from "./i18n/speech";
import { CameraError, CameraFeed, cameraAlreadyAllowed, requestCameraAccess } from "./infrastructure/camera";
import { attachCues, WebAudioCuePlayer } from "./infrastructure/cues";
import { LANDMARK_INDEX, type PoseDetection } from "./infrastructure/pose";
import { type Preferences, PlanRepository, PreferencesRepository, type TextSize } from "./infrastructure/preferences";
import { LandmarkRecorder } from "./infrastructure/recorder";
import { downloadText, LocalStorageRangeRepository, LocalStorageRepository, toCsv } from "./infrastructure/storage";
import { attachVoice, ClipSpeaker, pickVoice, type Speaker, WebSpeechSpeaker } from "./infrastructure/voice";
import * as msg from "./messages";
import { PresenceWatcher } from "./presence";
import {
  DAILY_ROUTINE,
  type PauseReason,
  type RoutinePhase,
  type RoutinePlan,
  RoutineRun,
  type RoutineStep,
  singleExercise,
  type StepResult,
} from "./routine";
import { href, parseRoute, type Route } from "./routing";
import { secondsClock } from "./session";
import { Smoothed } from "./stable";
import { VoiceCommands } from "./voiceCommands.svelte";

export type Stage = "onboarding" | "loading" | "running" | "error";

/** The current exercise, as the session screen shows it. */
export interface Snapshot {
  view: ViewMode;
  mode: ExerciseMode;
  goal: number;
  reps: number;
  phase: MovementPhase;
  angle: number | null;
  bodyDetected: boolean;
  findings: Finding[];
  guidance: Guidance[];
}

/** The routine's progress, as the session screen shows it. */
export interface RoutineSnapshot {
  steps: RoutineStep[];
  index: number;
  phase: RoutinePhase;
  restRemainingS: number;
  countdownS: number;
  pauseReason: PauseReason | null;
  next: RoutineStep | null;
  isSingle: boolean;
}

/** Totals for the Done screen. */
export interface SessionSummary {
  results: StepResult[];
  totalReps: number;
  totalS: number;
  completed: number;
  streak: number;
}

const CELEBRATION_MS = 3500;
const FINISH_DELAY_MS = 2500;
/** Milliseconds between developer panel updates, so it never slows the frame loop. */
const INSPECTION_INTERVAL_MS = 100;

/**
 * Dev mode shows the frame inspection panel. It is on under the Vite dev
 * server; elsewhere it is enabled by adding ?debug to the page URL.
 */
function devModeRequested(): boolean {
  if (import.meta.env.DEV) return true;
  return typeof window !== "undefined" && new URLSearchParams(window.location.search).has("debug");
}

/** The single object the screens talk to: state to show and actions to call. */
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
  name = $state("");
  onboarded = $state(false);
  cameraGranted = $state(false);
  plan = $state<RoutinePlan>(DAILY_ROUTINE);
  voiceCommands = $state(false);
  confirmingEnd = $state(false);
  devMode = $state(devModeRequested());
  inspection = $state<FrameInspection | null>(null);

  /** Spoken-command state for the voice status. */
  readonly commands: VoiceCommands;

  private readonly events = new EventBus();
  private readonly preferences = new PreferencesRepository(PREFERENCES_KEY);
  private readonly plans = new PlanRepository(PLAN_KEY);
  private readonly ranges = new LocalStorageRangeRepository(RANGES_KEY);
  private readonly speaker = new ClipSpeaker(import.meta.env.BASE_URL, new WebSpeechSpeaker(), secondsClock);
  private readonly cues = new WebAudioCuePlayer();
  private readonly camera = new CameraFeed();
  private readonly recorder = new LandmarkRecorder(msg.APP_NAME, msg.RECORDING_FILENAME);
  private readonly presence = new PresenceWatcher();
  private readonly assistant: Assistant;
  private readonly voiceReady: Promise<void>;
  private readonly angle = new Smoothed(0.3);
  private run: RoutineRun | null = null;
  private lastCountdown = 0;
  private lastInspection = 0;
  private celebrationTimer: ReturnType<typeof setTimeout> | undefined;
  private finishTimer: ReturnType<typeof setTimeout> | undefined;

  /** The speaker, plus a record of what was said so it is not heard back as a command. */
  private readonly voice: Speaker = {
    get enabled() {
      return true;
    },
    say: (language, key, priority) => {
      const text = phraseText(SPEECH_CATALOGS[language], key);
      if (text && this.speaker.enabled) this.commands.recordSpoken(text);
      this.speaker.say(language, key, priority);
    },
    stop: () => this.speaker.stop(),
  };

  constructor() {
    this.assistant = new Assistant({
      posture: POSTURE,
      events: this.events,
      repository: new LocalStorageRepository(STORAGE_KEY),
      clock: secondsClock,
      ranges: this.ranges,
    });
    this.commands = new VoiceCommands({
      language: () => this.language,
      onCommand: (command) => this.handleCommand(command),
      describe: () => this.run?.phase,
    });
    attachVoice(this.events, this.voice, () => this.language);
    attachCues(this.events, this.cues, secondsClock);
    this.applyPreferences(this.preferences.load());
    this.plan = this.plans.load();
    this.voiceReady = this.speaker.load().then(() => this.setLanguage(this.language));
    if (typeof window !== "undefined") {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.addEventListener("voiceschanged", () => this.setLanguage(this.language));
      }
      window.addEventListener("hashchange", () => this.onRouteChange());
    }
    this.events.subscribe("goalReached", () => this.onGoalReached());
    this.refresh();
    this.onRouteChange();
    void cameraAlreadyAllowed().then((allowed) => {
      if (allowed) this.cameraGranted = true;
    });
  }

  /** Name used in greetings, falling back to a neutral word before setup. */
  get displayName(): string {
    return this.name.trim() || msg.DEFAULT_NAME;
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

  setName(name: string): void {
    this.name = name.trim().slice(0, 40);
    this.savePreferences();
  }

  finishSetup(): void {
    this.onboarded = true;
    this.savePreferences();
    this.navigate(href.home);
  }

  /** Replaces the daily plan and saves it on this device. */
  updatePlan(plan: RoutinePlan): void {
    this.plan = plan;
    this.plans.save(plan);
  }

  /** Goes back to the physiotherapist's plan. */
  resetPlan(): void {
    this.plan = DAILY_ROUTINE;
    this.plans.clear();
  }

  /**
   * Asks for camera permission once during setup, then releases the camera.
   *
   * Returns:
   *   True if access was granted.
   */
  async requestCameraAccess(): Promise<boolean> {
    this.errorMessage = "";
    const granted = await requestCameraAccess();
    if (granted) this.cameraGranted = true;
    else this.errorMessage = msg.CAMERA_DENIED;
    return granted;
  }

  /**
   * Opens the camera and starts the workout for the current route.
   *
   * Args:
   *   video: Where the camera is shown.
   *   canvas: Where tracking lines are drawn.
   */
  async start(video: HTMLVideoElement, canvas: HTMLCanvasElement): Promise<void> {
    if (this.stage === "loading") return;
    this.stage = "loading";
    try {
      await this.camera.open(video);
    } catch (error) {
      const reason = error instanceof CameraError ? error.reason : "camera";
      this.fail(reason === "model" ? msg.MODEL_FAILED : msg.CAMERA_DENIED);
      return;
    }
    await this.voiceReady;
    this.cameraGranted = true;
    this.stage = "running";
    this.camera.drawSkeleton = this.showSkeleton || this.devMode;
    this.beginWorkout();
    this.commands.activate();
    this.camera.run(
      video,
      canvas,
      () => this.tickRoutine(),
      (detection, nowMs) => this.onFrame(detection, nowMs, video),
    );
  }

  /** Stops the camera, listening, recording and any speech. */
  stop(): void {
    this.commands.deactivate();
    this.confirmingEnd = false;
    this.recorder.stop();
    this.camera.close();
    this.speaker.stop();
    clearTimeout(this.finishTimer);
    if (this.stage !== "error") this.stage = "onboarding";
  }

  /** Moves from the "Next up" introduction to the countdown. */
  beginExercise(): void {
    this.run?.begin();
    this.refresh();
  }

  /** Records the current exercise as partly done and moves on. */
  skipExercise(): void {
    if (this.run?.phase === "intro") this.run.begin();
    if (!this.run || !this.run.isActive) return;
    this.recordStep(this.run.completeStep(this.assistant.counter.reps, false));
  }

  skipRest(): void {
    if (!this.run) return;
    this.run.skipRest();
    this.beginStep();
  }

  /** Pauses the current exercise from a button or spoken command. */
  pause(): void {
    if (!this.run) return;
    const before = this.run.phase;
    this.run.pause("user");
    if (this.run.phase === "paused" && before !== "paused") this.events.publish("sessionPaused", { reason: "user" });
    this.refresh();
  }

  /** Carries on after a pause with a fresh countdown. */
  resume(): void {
    if (!this.run) return;
    this.run.resume();
    this.lastCountdown = 0;
    this.refresh();
  }

  /** Ends a single exercise straight away, or asks first during a routine. */
  requestEnd(): void {
    if (!this.run || this.run.isSingle) {
      this.endSession();
      return;
    }
    this.confirmingEnd = true;
    if (this.commands.listening) this.voice.say(this.language, PhraseKey.endConfirm, "interrupt");
  }

  cancelEnd(): void {
    this.confirmingEnd = false;
  }

  /** Ends the session now, keeping progress on the current exercise. */
  endSession(): void {
    this.confirmingEnd = false;
    if (!this.run) {
      this.navigate(href.home);
      return;
    }
    const before = this.run.results.length;
    this.run.finish(this.assistant.counter.reps);
    this.logResults(this.run.results.slice(before));
    this.showSummary();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.speaker.enabled = !muted;
    if (muted) this.speaker.stop();
    this.savePreferences();
  }

  /** Turns spoken commands on or off; they only listen during a session. */
  setVoiceCommands(on: boolean): void {
    this.voiceCommands = on;
    this.commands.setEnabled(on);
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

  /** Switches the voice language and says a sample in it. */
  chooseLanguage(language: VoiceLanguage): void {
    this.setLanguage(language);
    this.voice.say(language, PhraseKey.selected, "interrupt");
  }

  /**
   * Switches the voice language without speaking.
   *
   * Args:
   *   language: The language for speech and spoken commands.
   */
  setLanguage(language: VoiceLanguage): void {
    this.language = language;
    this.speaker.preload(language);
    this.voiceMissing = !this.speaker.hasClips(language) && !this.hasSystemVoice(language);
    this.savePreferences();
    this.commands.restart();
  }

  setShowSkeleton(show: boolean): void {
    this.showSkeleton = show;
    this.camera.drawSkeleton = show || this.devMode;
    if (!this.camera.drawSkeleton) this.camera.clearOverlay();
    this.savePreferences();
  }

  setRecordSessions(on: boolean): void {
    this.recordSessions = on;
    this.savePreferences();
  }

  downloadHistory(): void {
    downloadText(msg.CSV_FILENAME, toCsv(this.assistant.history));
  }

  /** Forgets every learned range, so each exercise learns it again next time. */
  clearRanges(): void {
    this.ranges.clear();
  }

  clearHistory(): void {
    this.assistant.clearHistory();
    this.refresh();
  }

  private applyPreferences(prefs: Preferences): void {
    this.textSize = prefs.textSize;
    this.name = prefs.name;
    this.onboarded = prefs.onboarded;
    this.showSkeleton = prefs.showSkeleton;
    this.recordSessions = prefs.recordSessions;
    this.muted = prefs.muted;
    this.speaker.enabled = !prefs.muted;
    this.sounds = prefs.sounds;
    this.cues.enabled = prefs.sounds;
    this.voiceCommands = prefs.voiceCommands;
    this.commands.setEnabled(prefs.voiceCommands);
    this.language = prefs.language;
  }

  private savePreferences(): void {
    this.preferences.save({
      textSize: this.textSize,
      language: this.language,
      muted: this.muted,
      sounds: this.sounds,
      voiceCommands: this.voiceCommands,
      name: this.name,
      onboarded: this.onboarded,
      showSkeleton: this.showSkeleton,
      recordSessions: this.recordSessions,
    });
  }

  private onRouteChange(): void {
    const route = parseRoute(typeof window === "undefined" ? "" : window.location.hash);
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
    const plan = route.kind === "routine" ? this.plan : singleExercise(route.mode, route.target);
    this.run = new RoutineRun(plan, secondsClock);
    this.presence.reset();
    this.cues.unlock();
    if (this.recordSessions) this.recorder.start();
    if (!this.run.isSingle) this.events.publish("routineStarted", { steps: plan.steps.length });
    this.beginStep();
  }

  private beginStep(): void {
    const step = this.run?.current;
    if (!step) return;
    this.celebrating = false;
    this.lastCountdown = 0;
    this.assistant.setGoal(step.target);
    this.assistant.selectMode(step.mode);
    this.angle.update(null);
    this.refresh();
  }

  /** Runs on every animation frame: timed routine phases and the countdown voice. */
  private tickRoutine(): void {
    const run = this.run;
    if (!run) return;
    const before = run.phase;
    if (run.tick()) this.beginStep();
    if (run.phase === "countdown") {
      const remaining = run.countdownRemainingS();
      if (remaining > 0 && remaining !== this.lastCountdown) {
        this.lastCountdown = remaining;
        this.events.publish("countdownTick", { remaining });
      }
    } else if (before === "countdown" && run.phase === "exercise") {
      this.lastCountdown = 0;
      this.events.publish("countdownFinished", {});
    }
    this.refreshRoutine();
  }

  /** Runs on every new camera frame. */
  private onFrame(detection: PoseDetection | null, nowMs: number, video: HTMLVideoElement): void {
    if (detection && this.recorder.recording) {
      const aspect = video.videoWidth / Math.max(1, video.videoHeight);
      this.recorder.add(nowMs, this.assistant.mode, aspect, detection.landmarks, detection.world);
    }
    this.watchPresence(detection !== null);
    if (!this.run || this.run.phase === "exercise") this.assistant.process(detection?.points ?? null);
    if (this.devMode && nowMs - this.lastInspection >= INSPECTION_INTERVAL_MS) {
      this.lastInspection = nowMs;
      this.inspect(detection);
    }
    this.refresh();
  }

  private watchPresence(present: boolean): void {
    const run = this.run;
    if (!run) return;
    const action = this.presence.observe(present, secondsClock(), run.phase, run.pauseReason);
    if (action === "pause") {
      run.pause("away");
      this.events.publish("sessionPaused", { reason: "away" });
    } else if (action === "resume") {
      this.resume();
    }
  }

  private inspect(detection: PoseDetection | null): void {
    this.inspection = inspectFrame({
      fps: this.camera.fps,
      mode: this.assistant.mode,
      goal: this.assistant.goal,
      counter: this.assistant.counter,
      rangeStatus: this.assistant.rangeStatus,
      points: detection?.points ?? null,
      visibility: (joint) => detection?.landmarks[LANDMARK_INDEX[joint]]?.visibility ?? null,
      now: secondsClock(),
    });
  }

  /**
   * Applies a spoken command to whatever the session is doing right now.
   *
   * Returns:
   *   False when there is no session to act on.
   */
  private handleCommand(command: Command): boolean {
    if (!this.run) return false;
    const actions: Record<CommandAction, () => void> = {
      begin: () => this.beginExercise(),
      skipExercise: () => this.skipExercise(),
      skipRest: () => this.skipRest(),
      pause: () => this.pause(),
      resume: () => this.resume(),
      requestEnd: () => this.requestEnd(),
      confirmEnd: () => this.endSession(),
      cancelEnd: () => this.cancelEnd(),
      none: () => undefined,
    };
    actions[commandAction(command, this.run.phase, this.confirmingEnd)]();
    return true;
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
      if (result.reps > 0) this.assistant.logExercise(result.mode, result.reps, result.durationS);
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

  private celebrate(): void {
    this.celebrating = true;
    clearTimeout(this.celebrationTimer);
    this.celebrationTimer = setTimeout(() => (this.celebrating = false), CELEBRATION_MS);
  }

  private fail(message: string): void {
    this.stop();
    this.errorMessage = message;
    this.stage = "error";
  }

  private hasSystemVoice(language: VoiceLanguage): boolean {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
    const voices = window.speechSynthesis.getVoices();
    return voices.length === 0 || pickVoice(voices, SPEECH_CATALOGS[language].bcp47) !== null;
  }

  private refreshRoutine(): void {
    const run = this.run;
    this.routine = run
      ? {
          steps: run.plan.steps,
          index: run.index,
          phase: run.phase,
          restRemainingS: run.restRemainingS(),
          countdownS: run.countdownRemainingS(),
          pauseReason: run.pauseReason,
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

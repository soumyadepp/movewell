/**
 * Reactive facade between Svelte components and the pure Assistant.
 * Components read `snapshot` and call actions; they never touch the camera,
 * MediaPipe or speech directly.
 */
import { Assistant } from "./assistant";
import { EXERCISES, POSTURE, PREFERENCES_KEY, STORAGE_KEY } from "./config";
import type { ExerciseMode, Finding, MovementPhase, ViewMode } from "./domain/models";
import { EventBus } from "./events";
import { PhraseKey, SPEECH_CATALOGS, type VoiceLanguage } from "./i18n/speech";
import { BrowserPoseEstimator } from "./infrastructure/pose";
import { downloadText, LocalStorageRepository, toCsv } from "./infrastructure/storage";
import { attachVoice, ClipSpeaker, pickVoice, WebSpeechSpeaker } from "./infrastructure/voice";
import * as msg from "./messages";
import { secondsClock } from "./session";
import { Smoothed } from "./stable";

export type Stage = "onboarding" | "loading" | "running" | "error";
export type TextSize = "md" | "lg" | "xl";

interface Preferences {
  textSize: TextSize;
  language: VoiceLanguage;
  muted: boolean;
}

const DEFAULT_PREFERENCES: Preferences = { textSize: "lg", language: "en", muted: false };

function loadPreferences(): Preferences {
  try {
    const raw = localStorage.getItem(PREFERENCES_KEY);
    return { ...DEFAULT_PREFERENCES, ...(raw ? (JSON.parse(raw) as Partial<Preferences>) : {}) };
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
  elapsedSeconds: number;
  timerRunning: boolean;
  statusMessage: string;
  totalSessions: number;
  recentAverageReps: number;
}

const CELEBRATION_MS = 3500;

export class CoachController {
  stage = $state<Stage>("onboarding");
  errorMessage = $state("");
  celebrating = $state(false);
  muted = $state(false);
  textSize = $state<TextSize>("lg");
  language = $state<VoiceLanguage>("en");
  voiceMissing = $state(false);
  snapshot = $state<Snapshot>() as Snapshot;

  private readonly events = new EventBus();
  private readonly speaker = new ClipSpeaker(import.meta.env.BASE_URL, new WebSpeechSpeaker(), secondsClock);
  private readonly voiceReady: Promise<void>;
  private readonly repository = new LocalStorageRepository(STORAGE_KEY);
  private readonly assistant: Assistant;
  private estimator: BrowserPoseEstimator | null = null;
  private stream: MediaStream | null = null;
  private frameHandle = 0;
  private celebrationTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly angle = new Smoothed(0.3);

  constructor() {
    this.assistant = new Assistant({
      posture: POSTURE,
      exercises: EXERCISES,
      events: this.events,
      repository: this.repository,
      clock: secondsClock,
    });
    attachVoice(this.events, this.speaker, () => this.language);
    const prefs = loadPreferences();
    this.textSize = prefs.textSize;
    this.muted = prefs.muted;
    this.speaker.enabled = !prefs.muted;
    this.language = prefs.language;
    this.voiceReady = this.speaker.load().then(() => this.setLanguage(this.language));
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.addEventListener("voiceschanged", () => this.setLanguage(this.language));
    }
    this.events.subscribe("goalReached", () => this.celebrate());
    this.refresh();
  }

  async start(video: HTMLVideoElement, canvas: HTMLCanvasElement): Promise<void> {
    this.stage = "loading";
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 960 }, height: { ideal: 720 }, facingMode: "user" },
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
    this.stage = "running";
    this.assistant.selectMode(this.assistant.mode);
    this.loop(video, canvas);
  }

  stop(): void {
    cancelAnimationFrame(this.frameHandle);
    for (const track of this.stream?.getTracks() ?? []) track.stop();
    this.speaker.stop();
    this.stream = null;
  }

  selectMode(mode: ExerciseMode): void {
    this.assistant.selectMode(mode);
    this.celebrating = false;
    this.refresh();
  }

  setGoal(goal: number): void {
    this.assistant.setGoal(goal);
    this.refresh();
  }

  toggleView(): void {
    this.assistant.toggleView();
    this.refresh();
  }

  toggleTimer(): void {
    this.assistant.toggleTimer();
    this.refresh();
  }

  save(): void {
    this.assistant.saveSession();
    this.refresh();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.speaker.enabled = !muted;
    if (muted) this.speaker.stop();
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
    this.voiceMissing = !this.speaker.hasClips(language) && !this.hasSystemVoice(language);
    this.savePreferences();
  }

  private hasSystemVoice(language: VoiceLanguage): boolean {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
    const voices = window.speechSynthesis.getVoices();
    return voices.length === 0 || pickVoice(voices, SPEECH_CATALOGS[language].bcp47) !== null;
  }

  private savePreferences(): void {
    try {
      const prefs: Preferences = { textSize: this.textSize, language: this.language, muted: this.muted };
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(prefs));
    } catch {
      return;
    }
  }

  downloadHistory(): void {
    downloadText(msg.CSV_FILENAME, toCsv(this.assistant.history));
  }

  clearHistory(): void {
    this.assistant.clearHistory();
    this.refresh();
  }

  private loop(video: HTMLVideoElement, canvas: HTMLCanvasElement): void {
    let lastVideoTime = -1;
    const styles = getComputedStyle(document.documentElement);
    const skeleton = {
      joint: styles.getPropertyValue("--skeleton-joint").trim(),
      bone: styles.getPropertyValue("--skeleton-bone").trim(),
    };
    const tick = () => {
      this.frameHandle = requestAnimationFrame(tick);
      if (!this.estimator || video.readyState < 2 || video.currentTime === lastVideoTime) return;
      lastVideoTime = video.currentTime;
      if (canvas.width !== video.videoWidth) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
      const detection = this.estimator.detect(video, performance.now());
      this.estimator.draw(canvas, detection, skeleton);
      this.assistant.process(detection?.points ?? null);
      this.refresh();
    };
    tick();
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

  private refresh(): void {
    const a = this.assistant;
    const progress = a.progress;
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
      elapsedSeconds: a.timer.elapsedSeconds(),
      timerRunning: a.timer.running,
      statusMessage: a.statusMessage,
      totalSessions: progress.totalSessions,
      recentAverageReps: progress.recentAverageReps,
    };
  }
}

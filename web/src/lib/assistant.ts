/**
 * Application service that owns session state. No DOM, camera or speech
 * code, so it runs under Vitest exactly as in the browser.
 */
import {
  createCounter,
  type ExerciseCounter,
  RepCounter,
} from "./analysis/counting";
import {
  CALIBRATION_CYCLES,
  minimumSpan,
  type PersonalRange,
  RangeTracker,
  thresholdsFor,
} from "./analysis/range";
import {
  createPostureAnalyzer,
  type PostureAnalyzer,
} from "./analysis/posture";
import { localIso } from "./analysis/progress";
import { DEFAULT_GOAL, type PostureThresholds } from "./config";
import { getExercise } from "./exercises";
import {
  type BodyPoints,
  ExerciseMode,
  type Finding,
  isCounted,
  type SessionRecord,
  toggledView,
  ViewMode,
} from "./domain/models";
import type { EventBus } from "./events";
import * as msg from "./messages";
import { type Clock, SessionTimer } from "./session";
import { Debounced } from "./stable";

export interface SessionRepository {
  loadAll(): SessionRecord[];
  append(record: SessionRecord): boolean;
  clear(): void;
}

export interface FrameState {
  bodyDetected: boolean;
  findings: Finding[];
  guidance: string[];
}

/** Where each exercise's personal range of movement is kept. */
export interface RangeRepository {
  get(mode: ExerciseMode): PersonalRange | null;
  set(mode: ExerciseMode, range: PersonalRange): void;
  clear(): void;
}

/**
 * Where the counting thresholds for the current exercise come from.
 * learning: watching the first movements to learn the person's range.
 * personal: using a range learned earlier.
 * standard: using the exercise's standard thresholds.
 */
export type RangeStatus = "learning" | "personal" | "standard";

export interface AssistantDeps {
  posture: PostureThresholds;
  events: EventBus;
  repository: SessionRepository;
  clock: Clock;
  now?: () => Date;
  ranges?: RangeRepository;
}

/** Seconds of missing detections tolerated before the user is told they are out of view. */
const BODY_LOST_GRACE_S = 1.0;
/** Seconds a posture finding must persist (or be absent) before the display changes. */
const FINDINGS_HOLD_S = 0.8;

const sameFindings = (a: Finding[], b: Finding[]) =>
  a.length === b.length && a.every((finding, i) => finding.id === b[i].id);

export class Assistant {
  view = ViewMode.Front;
  mode = ExerciseMode.ArmRaise;
  goal = DEFAULT_GOAL;
  readonly timer: SessionTimer;
  history: SessionRecord[];
  frame: FrameState = {
    bodyDetected: false,
    findings: [],
    guidance: [...msg.GUIDANCE_INITIAL],
  };
  statusMessage = "";
  counter: ExerciseCounter;
  rangeStatus: RangeStatus = "standard";
  private tracker: RangeTracker | null = null;
  private savedCycles = 0;

  private analyzer: PostureAnalyzer;
  private lastFinding: Finding | null = null;
  private lastSeen = -Infinity;
  private bodyLostAnnounced = false;
  private bodyPresent = false;
  private readonly stableFindings = new Debounced<Finding[]>(
    [],
    FINDINGS_HOLD_S,
    sameFindings,
  );
  private readonly now: () => Date;

  constructor(private readonly deps: AssistantDeps) {
    this.now = deps.now ?? (() => new Date());
    this.timer = new SessionTimer(deps.clock);
    this.history = deps.repository.loadAll();
    this.analyzer = createPostureAnalyzer(this.view, deps.posture);
    this.counter = createCounter(this.mode, deps.events, deps.clock);
  }

  get progress(): { totalSessions: number; recentAverageReps: number } {
    const recent = this.history
      .filter((r) => r.exercise === this.mode)
      .map((r) => Number(r.repetitions) || 0)
      .slice(-5);
    const average = recent.length
      ? recent.reduce((s, v) => s + v, 0) / recent.length
      : 0;
    return { totalSessions: this.history.length, recentAverageReps: average };
  }

  process(points: BodyPoints | null): FrameState {
    const now = this.deps.clock();
    if (!points) {
      if (now - this.lastSeen < BODY_LOST_GRACE_S) return this.frame;
      if (!this.bodyLostAnnounced) {
        this.bodyLostAnnounced = true;
        this.bodyPresent = false;
        this.deps.events.publish("bodyLost", {});
      }
      this.stableFindings.reset([]);
      this.lastFinding = null;
      this.frame = {
        bodyDetected: false,
        findings: [],
        guidance: [...msg.GUIDANCE_NO_BODY],
      };
      return this.frame;
    }
    this.lastSeen = now;
    this.bodyLostAnnounced = false;
    if (!this.bodyPresent) {
      this.bodyPresent = true;
      this.deps.events.publish("bodyFound", {});
    }

    const findings = this.stableFindings.update(
      this.analyzer.analyze(points),
      now,
    );
    const repsBefore = this.counter.reps;
    const guidance = [this.counter.update(points)];
    this.trackRange(guidance);
    if (repsBefore < this.goal && this.counter.reps >= this.goal) {
      this.deps.events.publish("goalReached", {
        mode: this.mode,
        goal: this.goal,
      });
    }
    if (findings.length) {
      guidance.push(...findings.slice(0, 2).map((f) => f.correction));
      if (findings[0] !== this.lastFinding) {
        this.lastFinding = findings[0];
        this.deps.events.publish("findingChanged", { finding: findings[0] });
      }
    } else {
      if (this.mode === ExerciseMode.Posture)
        guidance.push(msg.GUIDANCE_NO_FINDINGS);
      this.lastFinding = null;
    }
    this.frame = { bodyDetected: true, findings, guidance };
    return this.frame;
  }

  toggleView(): void {
    this.view = toggledView(this.view);
    this.analyzer = createPostureAnalyzer(this.view, this.deps.posture);
    this.stableFindings.reset([]);
    this.deps.events.publish("viewChanged", { view: this.view });
  }

  selectMode(mode: ExerciseMode): void {
    this.mode = mode;
    if (isCounted(mode) && this.view !== getExercise(mode).bestView) {
      this.view = getExercise(mode).bestView;
      this.analyzer = createPostureAnalyzer(this.view, this.deps.posture);
      this.stableFindings.reset([]);
    }
    this.counter = createCounter(mode, this.deps.events, this.deps.clock);
    this.startRangeTracking();
    this.statusMessage = "";
    this.deps.events.publish("modeChanged", { mode });
  }

  private startRangeTracking(): void {
    this.tracker = null;
    this.savedCycles = 0;
    this.rangeStatus = "standard";
    const counter = this.counter;
    const ranges = this.deps.ranges;
    if (!(counter instanceof RepCounter) || !ranges) return;
    const standard = counter.exercise.thresholds;
    this.tracker = new RangeTracker(minimumSpan(standard));
    const saved = thresholdsFor(standard, ranges.get(counter.mode));
    counter.setThresholds(saved);
    this.rangeStatus = saved === standard ? "learning" : "personal";
  }

  /**
   * Feeds the smoothed angle to the range tracker. While learning, the first
   * movements set personal thresholds and count as reps; afterwards each new
   * movement refreshes the saved range for next time.
   */
  private trackRange(guidance: string[]): void {
    const counter = this.counter;
    const tracker = this.tracker;
    if (!tracker || !(counter instanceof RepCounter)) return;
    tracker.observe(counter.lastAngle);
    const cycles = tracker.cycles.length;
    const range = tracker.range;
    if (this.rangeStatus === "learning") {
      if (cycles >= CALIBRATION_CYCLES && range) {
        counter.setThresholds(
          thresholdsFor(counter.exercise.thresholds, range),
        );
        counter.credit(cycles);
        this.rangeStatus = "personal";
        this.deps.events.publish("rangeLearned", { mode: counter.mode });
      } else if (guidance[0] === counter.exercise.copy.guidance) {
        guidance[0] = msg.LEARNING_RANGE;
      }
    }
    if (range && cycles >= CALIBRATION_CYCLES && cycles !== this.savedCycles) {
      this.savedCycles = cycles;
      this.deps.ranges?.set(counter.mode, range);
    }
  }

  setGoal(goal: number): void {
    this.goal = goal;
  }

  toggleTimer(): void {
    const running = this.timer.toggle();
    if (running) this.statusMessage = "";
    this.deps.events.publish("timerToggled", { running });
  }

  saveSession(): boolean {
    return this.logExercise(
      this.mode,
      this.counter.reps,
      this.timer.elapsedSeconds(),
    );
  }

  /**
   * Appends one exercise result to the session history.
   *
   * @returns True if it was persisted.
   */
  logExercise(mode: ExerciseMode, reps: number, durationS: number): boolean {
    const record: SessionRecord = {
      date_time: localIso(this.now()),
      duration_seconds: durationS,
      view_mode: this.view,
      exercise: mode,
      repetitions: reps,
      posture_observations: this.frame.findings.map((f) => f.title).join("; "),
    };
    if (!this.deps.repository.append(record)) {
      this.statusMessage = msg.SAVE_FAILED;
      return false;
    }
    this.history = [...this.history, record];
    this.statusMessage = msg.SAVED;
    this.deps.events.publish("sessionSaved", {});
    return true;
  }

  clearHistory(): void {
    this.deps.repository.clear();
    this.history = [];
  }
}

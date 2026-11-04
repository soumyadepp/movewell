/**
 * Application service that owns session state. No DOM, camera or speech
 * code, so it runs under Vitest exactly as in the browser.
 */
import { createCounter, type ExerciseCounter } from "./analysis/exercises";
import { createPostureAnalyzer, type PostureAnalyzer } from "./analysis/posture";
import { DEFAULT_GOAL, type ExerciseThresholds, type PostureThresholds } from "./config";
import {
  type BodyPoints,
  ExerciseMode,
  type Finding,
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

export interface AssistantDeps {
  posture: PostureThresholds;
  exercises: ExerciseThresholds;
  events: EventBus;
  repository: SessionRepository;
  clock: Clock;
  now?: () => Date;
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
  frame: FrameState = { bodyDetected: false, findings: [], guidance: [...msg.GUIDANCE_INITIAL] };
  statusMessage = "";
  counter: ExerciseCounter;

  private analyzer: PostureAnalyzer;
  private lastFinding: Finding | null = null;
  private lastSeen = -Infinity;
  private bodyLostAnnounced = false;
  private readonly stableFindings = new Debounced<Finding[]>([], FINDINGS_HOLD_S, sameFindings);
  private readonly now: () => Date;

  constructor(private readonly deps: AssistantDeps) {
    this.now = deps.now ?? (() => new Date());
    this.timer = new SessionTimer(deps.clock);
    this.history = deps.repository.loadAll();
    this.analyzer = createPostureAnalyzer(this.view, deps.posture);
    this.counter = createCounter(this.mode, deps.exercises, deps.events, deps.clock);
  }

  get progress(): { totalSessions: number; recentAverageReps: number } {
    const recent = this.history
      .filter((r) => r.exercise === this.mode)
      .map((r) => Number(r.repetitions) || 0)
      .slice(-5);
    const average = recent.length ? recent.reduce((s, v) => s + v, 0) / recent.length : 0;
    return { totalSessions: this.history.length, recentAverageReps: average };
  }

  process(points: BodyPoints | null): FrameState {
    const now = this.deps.clock();
    if (!points) {
      if (now - this.lastSeen < BODY_LOST_GRACE_S) return this.frame;
      if (!this.bodyLostAnnounced) {
        this.bodyLostAnnounced = true;
        this.deps.events.publish("bodyLost", {});
      }
      this.stableFindings.reset([]);
      this.lastFinding = null;
      this.frame = { bodyDetected: false, findings: [], guidance: [...msg.GUIDANCE_NO_BODY] };
      return this.frame;
    }
    this.lastSeen = now;
    this.bodyLostAnnounced = false;

    const findings = this.stableFindings.update(this.analyzer.analyze(points), now);
    const repsBefore = this.counter.reps;
    const guidance = [this.counter.update(points)];
    if (repsBefore < this.goal && this.counter.reps >= this.goal) {
      this.deps.events.publish("goalReached", { mode: this.mode, goal: this.goal });
    }
    if (findings.length) {
      guidance.push(...findings.slice(0, 2).map((f) => f.correction));
      if (findings[0] !== this.lastFinding) {
        this.lastFinding = findings[0];
        this.deps.events.publish("findingChanged", { finding: findings[0] });
      }
    } else {
      if (this.mode === ExerciseMode.Posture) guidance.push(msg.GUIDANCE_NO_FINDINGS);
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
    this.counter = createCounter(mode, this.deps.exercises, this.deps.events, this.deps.clock);
    this.statusMessage = "";
    this.deps.events.publish("modeChanged", { mode });
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
    const record: SessionRecord = {
      date_time: this.now().toISOString().slice(0, 19),
      duration_seconds: this.timer.elapsedSeconds(),
      view_mode: this.view,
      exercise: this.mode,
      repetitions: this.counter.reps,
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

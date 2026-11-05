/**
 * Application service that owns the state of the exercise in progress.
 *
 * It turns each frame's body points into a rep count, posture findings and a
 * guidance code, and keeps the exercise history. No DOM, camera or speech
 * code, so it runs under Vitest exactly as in the browser.
 */
import { createCounter, type ExerciseCounter } from "./analysis/counting";
import { createPostureAnalyzer, type PostureAnalyzer } from "./analysis/posture";
import { localIso } from "./analysis/progress";
import { RangeLearner, type RangeRepository, type RangeStatus } from "./analysis/rangeLearner";
import { DEFAULT_GOAL, type PostureThresholds } from "./config";
import type { Guidance } from "./domain/guidance";
import { type BodyPoints, ExerciseMode, type Finding, isCounted, type SessionRecord, ViewMode } from "./domain/models";
import type { EventBus } from "./events";
import { getExercise } from "./exercises";
import type { Clock } from "./session";
import { Debounced } from "./stable";

export type { RangeRepository, RangeStatus } from "./analysis/rangeLearner";

/** Where finished exercises are kept. */
export interface SessionRepository {
  loadAll(): SessionRecord[];
  append(record: SessionRecord): boolean;
  clear(): void;
}

/** What the latest frame showed. */
export interface FrameState {
  bodyDetected: boolean;
  findings: Finding[];
  /** Most important first. */
  guidance: Guidance[];
}

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
/** Posture corrections shown alongside the exercise guidance. */
const MAX_CORRECTIONS = 2;

const sameFindings = (a: Finding[], b: Finding[]) =>
  a.length === b.length && a.every((finding, i) => finding.id === b[i].id);

/** Counts reps, checks posture and keeps history for the exercise in progress. */
export class Assistant {
  view = ViewMode.Front;
  mode = ExerciseMode.ArmRaise;
  goal = DEFAULT_GOAL;
  history: SessionRecord[];
  frame: FrameState = { bodyDetected: false, findings: [], guidance: [{ kind: "gettingStarted" }] };
  counter: ExerciseCounter;

  private analyzer: PostureAnalyzer;
  private readonly ranges: RangeLearner;
  private lastFinding: Finding | null = null;
  private lastSeen = -Infinity;
  private bodyLostAnnounced = false;
  private bodyPresent = false;
  private readonly stableFindings = new Debounced<Finding[]>([], FINDINGS_HOLD_S, sameFindings);
  private readonly now: () => Date;

  constructor(private readonly deps: AssistantDeps) {
    this.now = deps.now ?? (() => new Date());
    this.history = deps.repository.loadAll();
    this.analyzer = createPostureAnalyzer(this.view, deps.posture);
    this.counter = createCounter(this.mode, deps.events, deps.clock);
    this.ranges = new RangeLearner(deps.events, deps.ranges);
  }

  /** Where the current exercise's counting thresholds come from. */
  get rangeStatus(): RangeStatus {
    return this.ranges.status;
  }

  /**
   * Processes one frame.
   *
   * Args:
   *   points: The detected body points, or null when nobody was detected.
   *
   * Returns:
   *   The updated frame state.
   */
  process(points: BodyPoints | null): FrameState {
    const now = this.deps.clock();
    this.frame = points ? this.onBody(points, now) : this.onNoBody(now);
    return this.frame;
  }

  /**
   * Switches to an exercise, matching the camera view it needs.
   *
   * Args:
   *   mode: The exercise to count next.
   */
  selectMode(mode: ExerciseMode): void {
    this.mode = mode;
    if (isCounted(mode) && this.view !== getExercise(mode).bestView) {
      this.view = getExercise(mode).bestView;
      this.analyzer = createPostureAnalyzer(this.view, this.deps.posture);
      this.stableFindings.reset([]);
    }
    this.counter = createCounter(mode, this.deps.events, this.deps.clock);
    this.ranges.start(this.counter);
    this.deps.events.publish("modeChanged", { mode });
  }

  setGoal(goal: number): void {
    this.goal = goal;
  }

  /**
   * Appends one exercise result to the history.
   *
   * Args:
   *   mode: The exercise that was done.
   *   reps: Repetitions counted.
   *   durationS: Time spent on it, in seconds.
   *
   * Returns:
   *   True if it was saved.
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
    if (!this.deps.repository.append(record)) return false;
    this.history = [...this.history, record];
    return true;
  }

  clearHistory(): void {
    this.deps.repository.clear();
    this.history = [];
  }

  /** Keeps the last state through brief dropouts, then reports the person as gone once. */
  private onNoBody(now: number): FrameState {
    if (now - this.lastSeen < BODY_LOST_GRACE_S) return this.frame;
    if (!this.bodyLostAnnounced) {
      this.bodyLostAnnounced = true;
      this.bodyPresent = false;
      this.deps.events.publish("bodyLost", {});
    }
    this.stableFindings.reset([]);
    this.lastFinding = null;
    return { bodyDetected: false, findings: [], guidance: [{ kind: "noBody" }] };
  }

  /** Counts, learns the range, checks posture and picks guidance for a frame with a body. */
  private onBody(points: BodyPoints, now: number): FrameState {
    this.lastSeen = now;
    this.bodyLostAnnounced = false;
    if (!this.bodyPresent) {
      this.bodyPresent = true;
      this.deps.events.publish("bodyFound", {});
    }
    const repsBefore = this.counter.reps;
    const instruction = this.counter.update(points);
    const learning = this.ranges.observe();
    if (repsBefore < this.goal && this.counter.reps >= this.goal) {
      this.deps.events.publish("goalReached", { mode: this.mode, goal: this.goal });
    }
    const findings = this.stableFindings.update(this.analyzer.analyze(points), now);
    this.announceFinding(findings);
    const guidance: Guidance[] = [
      learning && instruction.kind === "exercise" ? { kind: "learningRange" } : instruction,
      ...findings.slice(0, MAX_CORRECTIONS).map((finding): Guidance => ({ kind: "finding", finding })),
    ];
    if (!findings.length && this.mode === ExerciseMode.Posture) guidance.push({ kind: "noFindings" });
    return { bodyDetected: true, findings, guidance };
  }

  /** Publishes the leading posture finding once each time it changes. */
  private announceFinding(findings: Finding[]): void {
    const leading = findings[0] ?? null;
    if (leading && leading !== this.lastFinding) this.deps.events.publish("findingChanged", { finding: leading });
    this.lastFinding = leading;
  }
}

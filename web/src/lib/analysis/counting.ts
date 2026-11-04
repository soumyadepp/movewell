/**
 * Repetition counting for any Exercise.
 *
 * One state machine counts every exercise. The smoothed angle must dwell
 * below the exercise's low threshold, then dwell above its high threshold, so
 * a single jittery frame can never complete a repetition. Brief gaps in
 * tracking are tolerated without resetting progress.
 */
import { type BodyPoints, ExerciseMode, MovementPhase } from "../domain/models";
import type { EventBus } from "../events";
import { type Exercise, getExercise } from "../exercises";
import { GUIDANCE_POSTURE_MODE, GUIDANCE_TURN_FRONT, GUIDANCE_TURN_SIDE } from "../messages";
import type { Clock } from "../session";

/** Seconds the angle must stay in a zone before it counts as reached. */
const DWELL_S = 0.1;
/** Tolerance for floating-point frame timestamps when comparing dwell times. */
const DWELL_EPSILON_S = 1e-3;
/**
 * Seconds a reading may be unavailable (a joint briefly below the confidence
 * cut-off, or orientation momentarily ambiguous) before the counter resets.
 */
const BLOCK_GRACE_S = 0.6;
/**
 * Time constant of the exponential smoothing, in seconds. Smoothing is scaled
 * by the time between frames, so a lower or uneven frame rate does not make
 * the reading lag behind the movement.
 */
const SMOOTHING_TAU_S = 0.06;
/** A zone also counts as reached after this many consecutive frames, for low frame rates. */
const DWELL_FRAMES = 2;
/** Gaps longer than this restart smoothing instead of blending stale values. */
const MAX_GAP_S = 0.5;

export type Zone = "low" | "mid" | "high";

/** What the assistant and UI need from any counter. */
export interface ExerciseCounter {
  readonly mode: ExerciseMode;
  readonly reps: number;
  readonly phase: MovementPhase;
  readonly lastAngle: number | null;
  /** Which side of the hysteresis band the smoothed angle is in. */
  readonly zone: Zone;
  /** When the current run of blocked frames started, in clock seconds. */
  readonly blockedSince: number | null;
  update(points: BodyPoints): string;
}

/** Null Object used in posture mode so callers never branch on mode. */
class PostureOnlyCounter implements ExerciseCounter {
  readonly mode = ExerciseMode.Posture;
  readonly reps = 0;
  readonly phase = MovementPhase.Ready;
  readonly lastAngle = null;
  readonly zone: Zone = "mid";
  readonly blockedSince = null;

  update(): string {
    return GUIDANCE_POSTURE_MODE;
  }
}

/** Counts repetitions of one exercise with smoothing, dwell and dropout tolerance. */
export class RepCounter implements ExerciseCounter {
  readonly mode: ExerciseMode;
  reps = 0;
  phase = MovementPhase.Ready;
  lastAngle: number | null = null;
  private smoothed: number | null = null;
  zone: Zone = "mid";
  blockedSince: number | null = null;
  private zoneSince = 0;
  private lastRepTime = -Infinity;
  private blockAnnounced = false;
  private zoneFrames = 0;
  private lastSampleAt: number | null = null;

  constructor(
    readonly exercise: Exercise,
    private readonly events: EventBus,
    private readonly clock: Clock,
  ) {
    this.mode = exercise.mode;
  }

  update(points: BodyPoints): string {
    const { copy, thresholds: t } = this.exercise;
    const result = this.exercise.measure(points);
    const now = this.clock();
    if ("blocked" in result) {
      this.blockedSince ??= now;
      if (now - this.blockedSince < BLOCK_GRACE_S) return copy.guidance;
      this.smoothed = null;
      this.lastAngle = null;
      this.lastSampleAt = null;
      this.zone = "mid";
      this.zoneFrames = 0;
      if (result.blocked !== "form" && !this.blockAnnounced) {
        this.blockAnnounced = true;
        this.events.publish("positionBlocked", { reason: result.blocked });
      }
      if (result.blocked === "face_camera") return GUIDANCE_TURN_FRONT;
      if (result.blocked === "turn_side") return GUIDANCE_TURN_SIDE;
      if (result.blocked === "form") return copy.guidance;
      return copy.notVisible;
    }
    this.blockedSince = null;
    if (this.blockAnnounced) {
      this.blockAnnounced = false;
      this.events.publish("positionReady", {});
    }

    const dt = this.lastSampleAt === null ? Infinity : now - this.lastSampleAt;
    this.lastSampleAt = now;
    if (this.smoothed === null || dt > MAX_GAP_S) {
      this.smoothed = result.angle;
    } else {
      this.smoothed += (1 - Math.exp(-dt / SMOOTHING_TAU_S)) * (result.angle - this.smoothed);
    }
    this.lastAngle = this.smoothed;

    const zone: Zone = this.smoothed < t.lowDeg ? "low" : this.smoothed > t.highDeg ? "high" : "mid";
    if (zone !== this.zone) {
      this.zone = zone;
      this.zoneSince = now;
      this.zoneFrames = 0;
    }
    this.zoneFrames += 1;
    const reached = this.zoneFrames >= DWELL_FRAMES || now - this.zoneSince + DWELL_EPSILON_S >= DWELL_S;
    if (zone === "low" && reached) {
      this.phase = MovementPhase.Low;
    } else if (zone === "high" && reached) {
      this.onHigh(now);
    }
    return copy.guidance;
  }

  private onHigh(now: number): void {
    if (this.phase !== MovementPhase.Low) {
      this.phase = MovementPhase.High;
      return;
    }
    if (now - this.lastRepTime > this.exercise.thresholds.minIntervalS) {
      this.reps += 1;
      this.lastRepTime = now;
      this.phase = MovementPhase.High;
      this.events.publish("repCounted", { mode: this.mode, total: this.reps });
    }
  }
}

/** Factory returning a fresh counter for a mode. */
export function createCounter(mode: ExerciseMode, events: EventBus, clock: Clock): ExerciseCounter {
  if (mode === ExerciseMode.Posture) return new PostureOnlyCounter();
  return new RepCounter(getExercise(mode), events, clock);
}

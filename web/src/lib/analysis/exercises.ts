/**
 * Repetition counting.
 *
 * Every exercise is a registry entry (Registry + Strategy): a function that
 * measures one angle from the pose. A single hysteresis state machine counts
 * all of them: the angle must dip below lowDeg and then rise above highDeg,
 * so jitter around one threshold never double counts. Adding an exercise
 * means adding one entry to MEASURES plus its copy and thresholds.
 */
import type { ExerciseThresholds, RepThresholds } from "../config";
import { calculateAngle, jointAngle, midpoint, safeAverage } from "../domain/geometry";
import { type BodyPoints, type CountedExercise, ExerciseMode, Joint, MovementPhase, type Point } from "../domain/models";
import type { EventBus } from "../events";
import { EXERCISE_COPY, GUIDANCE_POSTURE_MODE } from "../messages";
import type { Clock } from "../session";

export type Measure = (points: BodyPoints) => number | null;

const below = (p: Point): Point => [p[0], p[1] + 100];
const above = (p: Point): Point => [p[0], p[1] - 100];
const maxOf = (values: (number | null)[]): number | null => {
  const seen = values.filter((v): v is number => v !== null);
  return seen.length ? Math.max(...seen) : null;
};

/**
 * Upper-arm angle at the shoulder. Uses the hip as the reference when it is
 * visible, otherwise a point straight below the shoulder, so the count still
 * works when the hips are cropped out of frame.
 */
export function shoulderAngle(p: BodyPoints, elbow: Joint, shoulder: Joint, hip: Joint): number | null {
  const e = p.get(elbow);
  const s = p.get(shoulder);
  if (!e || !s) return null;
  return calculateAngle(e, s, p.get(hip) ?? below(s));
}

/** Elbow flexion: 0 with a straight arm, rising as the hand comes up. */
function elbowFlexion(p: BodyPoints, shoulder: Joint, elbow: Joint, wrist: Joint): number | null {
  const angle = jointAngle(p, shoulder, elbow, wrist);
  return angle === null ? null : 180 - angle;
}

/** Hip flexion: 0 standing tall, rising as the knee lifts. Falls back to vertical if the shoulder is hidden. */
function hipFlexion(p: BodyPoints, shoulder: Joint, hip: Joint, knee: Joint): number | null {
  const h = p.get(hip);
  const k = p.get(knee);
  if (!h || !k) return null;
  const angle = calculateAngle(p.get(shoulder) ?? above(h), h, k);
  return angle === null ? null : 180 - angle;
}

/** Leg abduction: angle of the hip-to-ankle line away from straight down. */
function legAbduction(p: BodyPoints, hip: Joint, ankle: Joint): number | null {
  const h = p.get(hip);
  const a = p.get(ankle) ?? p.get(hip === Joint.LeftHip ? Joint.LeftKnee : Joint.RightKnee);
  if (!h || !a) return null;
  return calculateAngle(a, h, below(h));
}

/** Trunk lateral lean: angle of the hip-midpoint-to-shoulder-midpoint line away from vertical. */
function trunkLean(p: BodyPoints): number | null {
  const shoulders = midpoint(p.get(Joint.LeftShoulder), p.get(Joint.RightShoulder));
  const hips = midpoint(p.get(Joint.LeftHip), p.get(Joint.RightHip));
  if (!shoulders || !hips) return null;
  return calculateAngle(shoulders, hips, above(hips));
}

export const MEASURES: Record<CountedExercise, Measure> = {
  [ExerciseMode.ArmRaise]: (p) =>
    safeAverage([
      shoulderAngle(p, Joint.LeftElbow, Joint.LeftShoulder, Joint.LeftHip),
      shoulderAngle(p, Joint.RightElbow, Joint.RightShoulder, Joint.RightHip),
    ]),
  [ExerciseMode.ElbowCurl]: (p) =>
    maxOf([
      elbowFlexion(p, Joint.LeftShoulder, Joint.LeftElbow, Joint.LeftWrist),
      elbowFlexion(p, Joint.RightShoulder, Joint.RightElbow, Joint.RightWrist),
    ]),
  [ExerciseMode.Marching]: (p) =>
    maxOf([
      hipFlexion(p, Joint.LeftShoulder, Joint.LeftHip, Joint.LeftKnee),
      hipFlexion(p, Joint.RightShoulder, Joint.RightHip, Joint.RightKnee),
    ]),
  [ExerciseMode.SideLegRaise]: (p) =>
    maxOf([legAbduction(p, Joint.LeftHip, Joint.LeftAnkle), legAbduction(p, Joint.RightHip, Joint.RightAnkle)]),
  [ExerciseMode.SideBend]: trunkLean,
  [ExerciseMode.SitToStand]: (p) =>
    safeAverage([
      jointAngle(p, Joint.LeftHip, Joint.LeftKnee, Joint.LeftAnkle),
      jointAngle(p, Joint.RightHip, Joint.RightKnee, Joint.RightAnkle),
    ]),
};

export interface ExerciseCounter {
  readonly mode: ExerciseMode;
  readonly reps: number;
  readonly phase: MovementPhase;
  readonly lastAngle: number | null;
  update(points: BodyPoints): string;
}

/** Null Object used in posture mode so callers never branch on mode. */
class PostureOnlyCounter implements ExerciseCounter {
  readonly mode = ExerciseMode.Posture;
  readonly reps = 0;
  readonly phase = MovementPhase.Ready;
  readonly lastAngle = null;

  update(): string {
    return GUIDANCE_POSTURE_MODE;
  }
}

/** Counts a repetition on a low-to-high transition of the exercise's measured angle. */
export class RepCounter implements ExerciseCounter {
  reps = 0;
  phase = MovementPhase.Ready;
  lastAngle: number | null = null;
  private lastRepTime = -Infinity;

  constructor(
    readonly mode: CountedExercise,
    private readonly measure: Measure,
    private readonly t: RepThresholds,
    private readonly events: EventBus,
    private readonly clock: Clock,
  ) {}

  update(points: BodyPoints): string {
    const angle = this.measure(points);
    this.lastAngle = angle;
    const copy = EXERCISE_COPY[this.mode];
    if (angle === null) return copy.notVisible;
    if (angle < this.t.lowDeg) {
      this.phase = MovementPhase.Low;
    } else if (angle > this.t.highDeg) {
      this.onHigh(this.clock());
    }
    return copy.guidance;
  }

  private onHigh(now: number): void {
    if (this.phase !== MovementPhase.Low) {
      this.phase = MovementPhase.High;
      return;
    }
    if (now - this.lastRepTime > this.t.minIntervalS) {
      this.reps += 1;
      this.lastRepTime = now;
      this.phase = MovementPhase.High;
      this.events.publish("repCounted", { mode: this.mode, total: this.reps });
    }
  }
}

/** Factory returning a fresh counter for an exercise mode. */
export function createCounter(
  mode: ExerciseMode,
  thresholds: ExerciseThresholds,
  events: EventBus,
  clock: Clock,
): ExerciseCounter {
  if (mode === ExerciseMode.Posture) return new PostureOnlyCounter();
  return new RepCounter(mode, MEASURES[mode], thresholds[mode], events, clock);
}

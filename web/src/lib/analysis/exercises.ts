/**
 * Repetition counting.
 *
 * Every exercise is a registry entry (Registry + Strategy): a function that
 * reads one angle from the pose, or explains why it cannot. Readings are
 * rejected when the body is not oriented correctly or when the movement does
 * not match the exercise (for example one arm waving during a two-arm raise),
 * which removes most false positives before counting starts.
 *
 * A single state machine counts every exercise. The smoothed angle must stay
 * below lowDeg for a short dwell, then stay above highDeg for a short dwell,
 * so a single jittery frame can never complete a repetition.
 */
import type { ExerciseThresholds, RepThresholds } from "../config";
import { calculateAngle, jointAngle, midpoint, safeAverage } from "../domain/geometry";
import {
  BEST_VIEW,
  type BodyPoints,
  type CountedExercise,
  ExerciseMode,
  Joint,
  MovementPhase,
  type Point,
  ViewMode,
} from "../domain/models";
import type { EventBus } from "../events";
import { EXERCISE_COPY, GUIDANCE_POSTURE_MODE, GUIDANCE_TURN_FRONT, GUIDANCE_TURN_SIDE } from "../messages";
import type { Clock } from "../session";

export type BlockReason = "not_visible" | "face_camera" | "turn_side";

export type Reading = { angle: number } | { blocked: BlockReason };

export type Measure = (points: BodyPoints) => Reading;

/** Shoulder width relative to torso length that separates facing the camera from standing side-on. */
export const FACING_RATIO = 0.45;
/** Upper arm must stay within this many degrees of vertical for an elbow curl. */
const CURL_UPPER_ARM_MAX_DEG = 40;
/** The supporting leg must stay within this many degrees of vertical. */
const STANDING_LEG_MAX_DEG = 15;
/** Seconds the angle must stay in a zone before it counts as reached. */
const DWELL_LOW_S = 0.15;
const DWELL_HIGH_S = 0.2;
/** Smoothing applied to the raw angle before thresholds. */
const SMOOTHING = 0.5;

const below = (p: Point): Point => [p[0], p[1] + 100];
const above = (p: Point): Point => [p[0], p[1] - 100];
const blocked = (reason: BlockReason): Reading => ({ blocked: reason });
const reading = (angle: number | null): Reading => (angle === null ? blocked("not_visible") : { angle });

/** Angle of the segment from `from` to `to`, measured from straight down, in degrees. */
function fromVertical(from: Point | null, to: Point | null): number | null {
  if (!from || !to) return null;
  return calculateAngle(to, from, below(from));
}

/**
 * Checks that the person faces the camera (front) or stands side-on (side).
 * Returns null when the hips are hidden, since torso length is then unknown.
 */
export function orientationBlock(p: BodyPoints, view: ViewMode): BlockReason | null {
  const ls = p.get(Joint.LeftShoulder);
  const rs = p.get(Joint.RightShoulder);
  const hips = midpoint(p.get(Joint.LeftHip), p.get(Joint.RightHip));
  const shoulders = midpoint(ls, rs);
  if (!ls || !rs || !hips || !shoulders) return null;
  const torso = Math.hypot(shoulders[0] - hips[0], shoulders[1] - hips[1]);
  if (torso === 0) return null;
  const ratio = Math.abs(ls[0] - rs[0]) / torso;
  if (view === ViewMode.Front && ratio < FACING_RATIO) return "face_camera";
  if (view === ViewMode.Side && ratio >= FACING_RATIO) return "turn_side";
  return null;
}

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

/** Both arms must rise together; one arm waving keeps the reading low. */
function armRaise(p: BodyPoints): Reading {
  const left = shoulderAngle(p, Joint.LeftElbow, Joint.LeftShoulder, Joint.LeftHip);
  const right = shoulderAngle(p, Joint.RightElbow, Joint.RightShoulder, Joint.RightHip);
  if (left === null || right === null) return blocked("not_visible");
  return { angle: Math.min(left, right) };
}

/** Elbow flexion on any arm whose upper arm stays by the side. */
function elbowCurl(p: BodyPoints): Reading {
  const arms: [Joint, Joint, Joint][] = [
    [Joint.LeftShoulder, Joint.LeftElbow, Joint.LeftWrist],
    [Joint.RightShoulder, Joint.RightElbow, Joint.RightWrist],
  ];
  let best: number | null = null;
  let anyVisible = false;
  for (const [shoulder, elbow, wrist] of arms) {
    const angle = jointAngle(p, shoulder, elbow, wrist);
    if (angle === null) continue;
    anyVisible = true;
    const upperArm = fromVertical(p.get(shoulder), p.get(elbow));
    if (upperArm === null || upperArm > CURL_UPPER_ARM_MAX_DEG) continue;
    best = Math.max(best ?? 0, 180 - angle);
  }
  if (!anyVisible) return blocked("not_visible");
  return { angle: best ?? 0 };
}

/**
 * Thigh lift from vertical on the higher leg, while the other leg stays
 * straight under the body. Leaning the trunk does not change the reading.
 */
function marching(p: BodyPoints): Reading {
  const left = fromVertical(p.get(Joint.LeftHip), p.get(Joint.LeftKnee));
  const right = fromVertical(p.get(Joint.RightHip), p.get(Joint.RightKnee));
  if (left === null && right === null) return blocked("not_visible");
  const lifted = Math.max(left ?? 0, right ?? 0);
  const standing = Math.min(left ?? Infinity, right ?? Infinity);
  if (left !== null && right !== null && standing > STANDING_LEG_MAX_DEG) return { angle: 0 };
  return { angle: lifted };
}

/** Leg abduction on the raised leg, while the standing leg stays vertical. */
function sideLegRaise(p: BodyPoints): Reading {
  const leg = (hip: Joint, ankle: Joint, knee: Joint) => fromVertical(p.get(hip), p.get(ankle) ?? p.get(knee));
  const left = leg(Joint.LeftHip, Joint.LeftAnkle, Joint.LeftKnee);
  const right = leg(Joint.RightHip, Joint.RightAnkle, Joint.RightKnee);
  if (left === null || right === null) return blocked("not_visible");
  if (Math.min(left, right) > STANDING_LEG_MAX_DEG) return { angle: 0 };
  return { angle: Math.max(left, right) };
}

/** Trunk lean: angle of the hip-midpoint-to-shoulder-midpoint line away from vertical. */
function sideBend(p: BodyPoints): Reading {
  const shoulders = midpoint(p.get(Joint.LeftShoulder), p.get(Joint.RightShoulder));
  const hips = midpoint(p.get(Joint.LeftHip), p.get(Joint.RightHip));
  if (!shoulders || !hips) return blocked("not_visible");
  return reading(calculateAngle(shoulders, hips, above(hips)));
}

function sitToStand(p: BodyPoints): Reading {
  return reading(
    safeAverage([
      jointAngle(p, Joint.LeftHip, Joint.LeftKnee, Joint.LeftAnkle),
      jointAngle(p, Joint.RightHip, Joint.RightKnee, Joint.RightAnkle),
    ]),
  );
}

const withOrientation =
  (mode: CountedExercise, measure: Measure): Measure =>
  (p) =>
    orientationBlock(p, BEST_VIEW[mode]) ? blocked(orientationBlock(p, BEST_VIEW[mode]) as BlockReason) : measure(p);

export const MEASURES: Record<CountedExercise, Measure> = {
  [ExerciseMode.ArmRaise]: withOrientation(ExerciseMode.ArmRaise, armRaise),
  [ExerciseMode.ElbowCurl]: withOrientation(ExerciseMode.ElbowCurl, elbowCurl),
  [ExerciseMode.Marching]: withOrientation(ExerciseMode.Marching, marching),
  [ExerciseMode.SideLegRaise]: withOrientation(ExerciseMode.SideLegRaise, sideLegRaise),
  [ExerciseMode.SideBend]: withOrientation(ExerciseMode.SideBend, sideBend),
  [ExerciseMode.SitToStand]: withOrientation(ExerciseMode.SitToStand, sitToStand),
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

type Zone = "low" | "mid" | "high";

/** Counts a repetition when the smoothed angle dwells low, then dwells high. */
export class RepCounter implements ExerciseCounter {
  reps = 0;
  phase = MovementPhase.Ready;
  lastAngle: number | null = null;
  private smoothed: number | null = null;
  private zone: Zone = "mid";
  private zoneSince = 0;
  private lastRepTime = -Infinity;

  constructor(
    readonly mode: CountedExercise,
    private readonly measure: Measure,
    private readonly t: RepThresholds,
    private readonly events: EventBus,
    private readonly clock: Clock,
  ) {}

  update(points: BodyPoints): string {
    const copy = EXERCISE_COPY[this.mode];
    const result = this.measure(points);
    if ("blocked" in result) {
      this.smoothed = null;
      this.lastAngle = null;
      this.zone = "mid";
      if (result.blocked === "face_camera") return GUIDANCE_TURN_FRONT;
      if (result.blocked === "turn_side") return GUIDANCE_TURN_SIDE;
      return copy.notVisible;
    }

    const now = this.clock();
    this.smoothed = this.smoothed === null ? result.angle : this.smoothed + SMOOTHING * (result.angle - this.smoothed);
    this.lastAngle = this.smoothed;

    const zone: Zone = this.smoothed < this.t.lowDeg ? "low" : this.smoothed > this.t.highDeg ? "high" : "mid";
    if (zone !== this.zone) {
      this.zone = zone;
      this.zoneSince = now;
    }
    const held = now - this.zoneSince;
    if (zone === "low" && held >= DWELL_LOW_S) {
      this.phase = MovementPhase.Low;
    } else if (zone === "high" && held >= DWELL_HIGH_S) {
      this.onHigh(now);
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

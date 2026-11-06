/**
 * Developer view of one frame: what the pose model saw, what the exercise
 * measured, and where the counter's state machine stands. Pure, so it can be
 * tested and computed in any routine phase.
 */
import { type BodyPoints, ExerciseMode, Joint, type MovementPhase } from "../domain/models";
import { getExercise } from "../exercises";
import type { Reading } from "../exercises/types";
import type { RepCounter, Zone } from "./counting";

export interface JointReading {
  readonly joint: Joint;
  /** Model confidence from 0 to 1, or null when the model gave none. */
  readonly visibility: number | null;
  /** Whether the joint passed the confidence cut-off and reached the exercise. */
  readonly kept: boolean;
}

export interface FrameInspection {
  readonly fps: number;
  readonly detected: boolean;
  readonly mode: ExerciseMode;
  readonly joints: readonly JointReading[];
  readonly reading: string;
  readonly smoothed: number | null;
  readonly lowDeg: number | null;
  /** Whether the thresholds are standard, being learned, or personal. */
  readonly rangeStatus: string;
  readonly highDeg: number | null;
  readonly zone: Zone;
  readonly phase: MovementPhase;
  readonly reps: number;
  readonly goal: number;
  readonly blockedForS: number | null;
  readonly details: readonly (readonly [string, string])[];
}

export interface InspectionInput {
  fps: number;
  mode: ExerciseMode;
  goal: number;
  counter: RepCounter;
  points: BodyPoints | null;
  visibility: (joint: Joint) => number | null;
  now: number;
  rangeStatus?: string;
}

const ORDER: Joint[] = [
  Joint.Nose,
  Joint.LeftShoulder,
  Joint.RightShoulder,
  Joint.LeftElbow,
  Joint.RightElbow,
  Joint.LeftWrist,
  Joint.RightWrist,
  Joint.LeftHip,
  Joint.RightHip,
  Joint.LeftKnee,
  Joint.RightKnee,
  Joint.LeftAnkle,
  Joint.RightAnkle,
];

/** Formats a number to one decimal place, a string as is, and null as a dash. */
export function formatValue(value: number | string | null): string {
  if (value === null) return "-";
  return typeof value === "number" ? value.toFixed(1) : value;
}

/** Describes a raw reading as an angle in degrees or the reason it was blocked. */
export function describeReading(reading: Reading | null): string {
  if (!reading) return "none";
  return "angle" in reading ? `${reading.angle.toFixed(1)}°` : `blocked: ${reading.blocked}`;
}

/**
 * Builds the inspection for the latest frame.
 *
 * Args:
 *   input: Frame rate, current exercise, counter, body points and raw joint confidence.
 *
 * Returns:
 *   Everything the developer panel shows for this frame.
 */
export function inspectFrame(input: InspectionInput): FrameInspection {
  const { counter, points, mode } = input;
  const exercise = getExercise(mode);
  const joints = ORDER.map((joint) => ({
    joint,
    visibility: input.visibility(joint),
    kept: points?.get(joint) != null,
  }));
  const details = exercise?.inspect && points ? Object.entries(exercise.inspect(points)) : [];
  return {
    fps: input.fps,
    detected: points !== null,
    mode,
    joints,
    reading: points ? describeReading(exercise ? exercise.measure(points) : null) : "no body",
    smoothed: counter.lastAngle,
    lowDeg: counter.thresholds?.lowDeg ?? null,
    highDeg: counter.thresholds?.highDeg ?? null,
    rangeStatus: input.rangeStatus ?? "standard",
    zone: counter.zone,
    phase: counter.phase,
    reps: counter.reps,
    goal: input.goal,
    blockedForS: counter.blockedSince === null ? null : input.now - counter.blockedSince,
    details: details.map(([key, value]) => [key, formatValue(value)] as const),
  };
}

/** Value objects shared by every layer. No browser APIs allowed here. */

export type Point = readonly [number, number];
/** Metric 3-D position from the pose model's world landmarks (hip-centred, y down). */
export type Point3 = readonly [number, number, number];

export enum Joint {
  Nose = "nose",
  LeftEar = "left_ear",
  RightEar = "right_ear",
  LeftShoulder = "left_shoulder",
  RightShoulder = "right_shoulder",
  LeftElbow = "left_elbow",
  RightElbow = "right_elbow",
  LeftWrist = "left_wrist",
  RightWrist = "right_wrist",
  LeftHip = "left_hip",
  RightHip = "right_hip",
  LeftKnee = "left_knee",
  RightKnee = "right_knee",
  LeftAnkle = "left_ankle",
  RightAnkle = "right_ankle",
}

export enum ViewMode {
  Front = "FRONT",
  Side = "SIDE",
}

export const toggledView = (view: ViewMode): ViewMode =>
  view === ViewMode.Front ? ViewMode.Side : ViewMode.Front;

export enum ExerciseMode {
  Posture = "POSTURE",
  ArmRaise = "ARM RAISE",
  SitToStand = "SIT-TO-STAND",
  ElbowCurl = "ELBOW CURL",
  Marching = "MARCHING",
  SideLegRaise = "SIDE LEG RAISE",
  SideBend = "SIDE BEND",
}

/** Counted exercises, in the order they are offered. */
export const COUNTED_EXERCISES = [
  ExerciseMode.ArmRaise,
  ExerciseMode.ElbowCurl,
  ExerciseMode.Marching,
  ExerciseMode.SideLegRaise,
  ExerciseMode.SideBend,
  ExerciseMode.SitToStand,
] as const;

export type CountedExercise = (typeof COUNTED_EXERCISES)[number];

export const isCounted = (mode: ExerciseMode): mode is CountedExercise => mode !== ExerciseMode.Posture;

/** URL-safe identifier for an exercise, e.g. "side-leg-raise". */
export const exerciseSlug = (mode: ExerciseMode): string => mode.toLowerCase().replace(/[^a-z0-9]+/g, "-");

export const exerciseFromSlug = (slug: string): ExerciseMode | null =>
  Object.values(ExerciseMode).find((mode) => exerciseSlug(mode) === slug) ?? null;

/** Phase of the current repetition. Each exercise names Low and High in its own words. */
export enum MovementPhase {
  Ready = "READY",
  Low = "LOW",
  High = "HIGH",
}

export type FindingId =
  | "shoulder_height"
  | "hip_height"
  | "trunk_shift"
  | "knee_alignment"
  | "head_forward"
  | "trunk_incline"
  | "knee_bent";

export interface Finding {
  readonly id: FindingId;
  readonly title: string;
  readonly correction: string;
  readonly exercise: string;
  readonly caveat: string;
}

export interface SessionRecord {
  date_time: string;
  duration_seconds: number;
  view_mode: string;
  exercise: string;
  repetitions: number;
  posture_observations: string;
}

export const SESSION_FIELDS: readonly (keyof SessionRecord)[] = [
  "date_time",
  "duration_seconds",
  "view_mode",
  "exercise",
  "repetitions",
  "posture_observations",
];

/**
 * Visible joints for one frame. Hidden joints are simply absent.
 *
 * `points` are image coordinates scaled to a 720 px tall frame with the
 * camera's true aspect ratio, used for anything relative to gravity or the
 * camera. `world` are optional 3-D coordinates, used for joint angles because
 * they are not foreshortened when a limb moves toward the camera.
 */
export class BodyPoints {
  constructor(
    private readonly points: ReadonlyMap<Joint, Point> = new Map(),
    private readonly world: ReadonlyMap<Joint, Point3> = new Map(),
  ) {}

  get3(joint: Joint): Point3 | null {
    return this.world.get(joint) ?? null;
  }

  get(joint: Joint): Point | null {
    return this.points.get(joint) ?? null;
  }

  firstVisible(...joints: Joint[]): Point | null {
    for (const joint of joints) {
      const point = this.get(joint);
      if (point) return point;
    }
    return null;
  }
}

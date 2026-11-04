/** Value objects shared by every layer. No browser APIs allowed here. */

export type Point = readonly [number, number];

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

/** Visible joints for one frame. Hidden joints are simply absent. */
export class BodyPoints {
  constructor(private readonly points: ReadonlyMap<Joint, Point> = new Map()) {}

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

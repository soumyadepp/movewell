import { type CountedExercise, ExerciseMode } from "./domain/models";

/**
 * Thresholds mirror the Python app. Pixel thresholds are measured on a
 * 960 x 720 reference frame so both versions behave the same at any camera
 * resolution.
 */
export const REFERENCE_FRAME = { width: 960, height: 720 } as const;

export const POSE = {
  visibilityThreshold: 0.6,
  modelUrl:
    "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
  wasmUrl: "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm",
  minDetectionConfidence: 0.65,
  minTrackingConfidence: 0.65,
} as const;

export interface PostureThresholds {
  shoulderHeightDiffPx: number;
  hipHeightDiffPx: number;
  trunkShiftPx: number;
  kneeAnkleOffsetPx: number;
  headForwardPx: number;
  trunkInclinePx: number;
  bentKneeDeg: number;
}

export interface RepThresholds {
  lowDeg: number;
  highDeg: number;
  minIntervalS: number;
}

export type ExerciseThresholds = Record<CountedExercise, RepThresholds>;

export const POSTURE: PostureThresholds = {
  shoulderHeightDiffPx: 28,
  hipHeightDiffPx: 32,
  trunkShiftPx: 35,
  kneeAnkleOffsetPx: 55,
  headForwardPx: 45,
  trunkInclinePx: 65,
  bentKneeDeg: 145,
};

/**
 * Hysteresis bands per exercise. The measured value must fall below lowDeg,
 * then rise above highDeg, for one repetition to count.
 */
export const EXERCISES: ExerciseThresholds = {
  [ExerciseMode.ArmRaise]: { lowDeg: 35, highDeg: 70, minIntervalS: 1.0 },
  [ExerciseMode.ElbowCurl]: { lowDeg: 40, highDeg: 100, minIntervalS: 1.0 },
  [ExerciseMode.Marching]: { lowDeg: 15, highDeg: 40, minIntervalS: 0.6 },
  [ExerciseMode.SideLegRaise]: { lowDeg: 8, highDeg: 20, minIntervalS: 1.0 },
  [ExerciseMode.SideBend]: { lowDeg: 5, highDeg: 15, minIntervalS: 1.2 },
  [ExerciseMode.SitToStand]: { lowDeg: 105, highDeg: 155, minIntervalS: 1.2 },
};

export const DEFAULT_GOAL = 10;
export const GOAL_OPTIONS = [5, 10, 15] as const;

export const VOICE = { rate: 0.9, volume: 1.0, cooldownS: 5.0 } as const;

export const PREFERENCES_KEY = "physio-assistant.preferences.v1";

export const STORAGE_KEY = "physio-assistant.sessions.v1";

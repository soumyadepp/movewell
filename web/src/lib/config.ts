/**
 * Thresholds mirror the Python app. Pixel thresholds are measured on a
 * 960 x 720 reference frame so both versions behave the same at any camera
 * resolution.
 */
/** Image points are scaled so the frame is this tall, keeping the camera's aspect ratio. */
export const REFERENCE_HEIGHT = 720;

export const POSE = {
  visibilityThreshold: 0.5,
  modelUrl:
    "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task",
  wasmUrl: "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm",
  minDetectionConfidence: 0.5,
  minPresenceConfidence: 0.5,
  minTrackingConfidence: 0.5,
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

export const POSTURE: PostureThresholds = {
  shoulderHeightDiffPx: 28,
  hipHeightDiffPx: 32,
  trunkShiftPx: 35,
  kneeAnkleOffsetPx: 55,
  headForwardPx: 45,
  trunkInclinePx: 65,
  bentKneeDeg: 145,
};

export const DEFAULT_GOAL = 10;
export const GOAL_OPTIONS = [5, 10, 15] as const;

export const VOICE = { rate: 0.9, volume: 1.0, cooldownS: 5.0 } as const;

export const PREFERENCES_KEY = "physio-assistant.preferences.v1";

export const STORAGE_KEY = "physio-assistant.sessions.v1";

export const PLAN_KEY = "physio-assistant.plan.v1";

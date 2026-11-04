/** MediaPipe Pose Landmarker adapter. Runs fully in the browser. */
import { DrawingUtils, FilesetResolver, type NormalizedLandmark, PoseLandmarker } from "@mediapipe/tasks-vision";
import { POSE, REFERENCE_FRAME } from "../config";
import { BodyPoints, Joint, type Point } from "../domain/models";

const LANDMARK_INDEX: Record<Joint, number> = {
  [Joint.Nose]: 0,
  [Joint.LeftEar]: 7,
  [Joint.RightEar]: 8,
  [Joint.LeftShoulder]: 11,
  [Joint.RightShoulder]: 12,
  [Joint.LeftElbow]: 13,
  [Joint.RightElbow]: 14,
  [Joint.LeftWrist]: 15,
  [Joint.RightWrist]: 16,
  [Joint.LeftHip]: 23,
  [Joint.RightHip]: 24,
  [Joint.LeftKnee]: 25,
  [Joint.RightKnee]: 26,
  [Joint.LeftAnkle]: 27,
  [Joint.RightAnkle]: 28,
};

export interface PoseDetection {
  points: BodyPoints;
  landmarks: NormalizedLandmark[];
}

export interface SkeletonStyle {
  joint: string;
  bone: string;
}

const inFrame = (lm: NormalizedLandmark) => lm.x >= 0 && lm.x <= 1 && lm.y >= 0 && lm.y <= 1;

/**
 * Converts normalized landmarks to reference-frame pixels, dropping low-visibility joints.
 * If the model reports no visibility for any joint, in-frame joints are kept instead.
 */
export function toBodyPoints(landmarks: NormalizedLandmark[], visibilityThreshold: number): BodyPoints {
  const points = new Map<Joint, Point>();
  const hasVisibility = landmarks.some((lm) => (lm.visibility ?? 0) > 0);
  const visible = (lm: NormalizedLandmark) =>
    hasVisibility ? (lm.visibility ?? 0) >= visibilityThreshold : inFrame(lm);
  for (const [joint, index] of Object.entries(LANDMARK_INDEX) as [Joint, number][]) {
    const lm = landmarks[index];
    if (lm && visible(lm)) {
      points.set(joint, [lm.x * REFERENCE_FRAME.width, lm.y * REFERENCE_FRAME.height]);
    }
  }
  return new BodyPoints(points);
}

export class BrowserPoseEstimator {
  private constructor(private readonly landmarker: PoseLandmarker) {}

  static async create(): Promise<BrowserPoseEstimator> {
    const fileset = await FilesetResolver.forVisionTasks(POSE.wasmUrl);
    const options = (delegate: "GPU" | "CPU") => ({
      baseOptions: { modelAssetPath: POSE.modelUrl, delegate },
      runningMode: "VIDEO" as const,
      numPoses: 1,
      minPoseDetectionConfidence: POSE.minDetectionConfidence,
      minTrackingConfidence: POSE.minTrackingConfidence,
    });
    try {
      return new BrowserPoseEstimator(await PoseLandmarker.createFromOptions(fileset, options("GPU")));
    } catch {
      return new BrowserPoseEstimator(await PoseLandmarker.createFromOptions(fileset, options("CPU")));
    }
  }

  detect(video: HTMLVideoElement, timestampMs: number): PoseDetection | null {
    const result = this.landmarker.detectForVideo(video, timestampMs);
    const landmarks = result.landmarks[0];
    if (!landmarks) return null;
    return { points: toBodyPoints(landmarks, POSE.visibilityThreshold), landmarks };
  }

  draw(canvas: HTMLCanvasElement, detection: PoseDetection | null, style: SkeletonStyle): void {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!detection) return;
    const utils = new DrawingUtils(ctx);
    utils.drawConnectors(detection.landmarks, PoseLandmarker.POSE_CONNECTIONS, { color: style.bone, lineWidth: 4 });
    utils.drawLandmarks(detection.landmarks, { color: style.joint, fillColor: style.joint, radius: 4 });
  }

  close(): void {
    this.landmarker.close();
  }
}

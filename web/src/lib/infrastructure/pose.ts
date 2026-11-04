/** MediaPipe Pose Landmarker adapter. Runs fully in the browser. */
import { DrawingUtils, FilesetResolver, type Landmark, type NormalizedLandmark, PoseLandmarker } from "@mediapipe/tasks-vision";
import { POSE, REFERENCE_HEIGHT } from "../config";
import { BodyPoints, Joint, type Point, type Point3 } from "../domain/models";

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
  world: Landmark[];
}

export interface SkeletonStyle {
  joint: string;
  bone: string;
}

const inFrame = (lm: NormalizedLandmark) => lm.x >= 0 && lm.x <= 1 && lm.y >= 0 && lm.y <= 1;

/**
 * Converts landmarks to body points, dropping low-visibility joints.
 *
 * Image points are scaled to a REFERENCE_HEIGHT-tall frame using the camera's
 * real aspect ratio, so horizontal and vertical distances stay comparable on
 * 16:9 and 4:3 cameras alike. World landmarks (metres, 3-D) are kept for the
 * same visible joints. If the model reports no visibility at all, in-frame
 * joints are kept instead.
 */
export function toBodyPoints(
  landmarks: NormalizedLandmark[],
  visibilityThreshold: number,
  aspect = 4 / 3,
  world: Landmark[] = [],
): BodyPoints {
  const points = new Map<Joint, Point>();
  const world3 = new Map<Joint, Point3>();
  const hasVisibility = landmarks.some((lm) => (lm.visibility ?? 0) > 0);
  const visible = (lm: NormalizedLandmark) =>
    hasVisibility ? (lm.visibility ?? 0) >= visibilityThreshold : inFrame(lm);
  for (const [joint, index] of Object.entries(LANDMARK_INDEX) as [Joint, number][]) {
    const lm = landmarks[index];
    if (!lm || !visible(lm)) continue;
    points.set(joint, [lm.x * REFERENCE_HEIGHT * aspect, lm.y * REFERENCE_HEIGHT]);
    const w = world[index];
    if (w) world3.set(joint, [w.x, w.y, w.z]);
  }
  return new BodyPoints(points, world3);
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
    const aspect = video.videoWidth && video.videoHeight ? video.videoWidth / video.videoHeight : 4 / 3;
    return {
      points: toBodyPoints(landmarks, POSE.visibilityThreshold, aspect, result.worldLandmarks[0] ?? []),
      landmarks,
      world: result.worldLandmarks[0] ?? [],
    };
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

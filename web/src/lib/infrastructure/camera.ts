/**
 * The camera and the per-frame pose detection loop.
 *
 * Opens the camera, runs MediaPipe on each new video frame, optionally draws
 * the tracking lines, and hands every detection to a callback. Knows nothing
 * about exercises or routines.
 */
import { BrowserPoseEstimator, type PoseDetection } from "./pose";

export type FrameHandler = (detection: PoseDetection | null, nowMs: number) => void;

/** Raised when the camera or the pose model cannot be started. */
export class CameraError extends Error {
  constructor(readonly reason: "camera" | "model") {
    super(reason === "camera" ? "Camera unavailable" : "Pose model failed to load");
  }
}

/**
 * Asks for camera permission once, then releases the camera straight away.
 *
 * Returns:
 *   True if access was granted.
 */
export async function requestCameraAccess(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    for (const track of stream.getTracks()) track.stop();
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks whether camera permission was granted earlier, without prompting.
 *
 * Returns:
 *   True if the browser reports camera permission as granted.
 */
export async function cameraAlreadyAllowed(): Promise<boolean> {
  try {
    const status = await navigator.permissions?.query({ name: "camera" as PermissionName });
    return status?.state === "granted";
  } catch {
    return false;
  }
}

/** One camera and the loop that runs pose detection on its frames. */
export class CameraFeed {
  /** Frames processed per second, measured over the last second. */
  fps = 0;
  /** Whether to draw the tracking lines over the video. */
  drawSkeleton = false;
  private estimator: BrowserPoseEstimator | null = null;
  private stream: MediaStream | null = null;
  private frameHandle = 0;
  private canvas: HTMLCanvasElement | null = null;

  /**
   * Opens the camera into a video element and loads the pose model.
   *
   * Args:
   *   video: Where to show the camera.
   *
   * Raises:
   *   CameraError: If the camera is refused or the model cannot load.
   */
  async open(video: HTMLVideoElement): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 960 }, height: { ideal: 720 }, facingMode: "user" },
        audio: false,
      });
    } catch {
      throw new CameraError("camera");
    }
    video.srcObject = this.stream;
    await video.play();
    try {
      this.estimator ??= await BrowserPoseEstimator.create();
    } catch {
      throw new CameraError("model");
    }
  }

  /**
   * Starts detecting poses on every new video frame.
   *
   * Args:
   *   video: The playing camera video.
   *   canvas: Where tracking lines are drawn.
   *   onTick: Called on every animation frame, even without a new video frame.
   *   onFrame: Called with each new frame's detection.
   */
  run(video: HTMLVideoElement, canvas: HTMLCanvasElement, onTick: () => void, onFrame: FrameHandler): void {
    const styles = getComputedStyle(document.documentElement);
    const skeleton = {
      joint: styles.getPropertyValue("--skeleton-joint").trim(),
      bone: styles.getPropertyValue("--skeleton-bone").trim(),
    };
    this.canvas = canvas;
    let lastVideoTime = -1;
    let frames = 0;
    let windowStart = performance.now();
    const tick = () => {
      this.frameHandle = requestAnimationFrame(tick);
      onTick();
      if (!this.estimator || video.readyState < 2 || video.currentTime === lastVideoTime) return;
      lastVideoTime = video.currentTime;
      this.fitCanvas(video, canvas);
      const now = performance.now();
      const detection = this.estimator.detect(video, now);
      if (this.drawSkeleton) this.estimator.draw(canvas, detection, skeleton);
      frames += 1;
      if (now - windowStart >= 1000) {
        this.fps = Math.round((frames * 1000) / (now - windowStart));
        frames = 0;
        windowStart = now;
      }
      onFrame(detection, now);
    };
    tick();
  }

  /** Stops the loop and releases the camera. */
  close(): void {
    cancelAnimationFrame(this.frameHandle);
    for (const track of this.stream?.getTracks() ?? []) track.stop();
    this.stream = null;
  }

  /** Removes any tracking lines currently drawn. */
  clearOverlay(): void {
    this.canvas?.getContext("2d")?.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private fitCanvas(video: HTMLVideoElement, canvas: HTMLCanvasElement): void {
    if (canvas.width === video.videoWidth) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
  }
}

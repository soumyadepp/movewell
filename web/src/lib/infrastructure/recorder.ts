/**
 * Records body landmarks (never video) during a session, for tuning the
 * counting thresholds, and saves them as a JSON file when stopped.
 */
import type { ExerciseMode } from "../domain/models";
import { downloadText } from "./files";

/** Recording stops by itself after this many frames (about one minute at 30 fps). */
const MAX_FRAMES = 1800;

interface RecordedFrame {
  t: number;
  mode: ExerciseMode;
  aspect: number;
  landmarks: number[][];
  world: number[][];
}

interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

const round = (n: number) => Math.round(n * 10000) / 10000;

/** Collects landmark frames while recording and downloads them on stop. */
export class LandmarkRecorder {
  recording = false;
  private frames: RecordedFrame[] = [];

  constructor(
    private readonly appName: string,
    private readonly filename: string,
  ) {}

  start(): void {
    this.frames = [];
    this.recording = true;
  }

  /**
   * Adds one frame while recording.
   *
   * Args:
   *   tMs: Frame time in milliseconds.
   *   mode: The exercise being done.
   *   aspect: Camera width divided by height.
   *   landmarks: Image landmarks with visibility.
   *   world: 3D world landmarks.
   */
  add(tMs: number, mode: ExerciseMode, aspect: number, landmarks: Landmark[], world: Landmark[]): void {
    if (!this.recording) return;
    this.frames.push({
      t: round(tMs / 1000),
      mode,
      aspect: round(aspect),
      landmarks: landmarks.map((l) => [round(l.x), round(l.y), round(l.z), round(l.visibility ?? 0)]),
      world: world.map((w) => [round(w.x), round(w.y), round(w.z)]),
    });
    if (this.frames.length >= MAX_FRAMES) this.stop();
  }

  /** Stops recording and downloads what was recorded, if anything. */
  stop(): void {
    if (!this.recording) return;
    this.recording = false;
    const payload = { app: this.appName, recordedAt: new Date().toISOString(), frames: this.frames };
    if (this.frames.length) downloadText(this.filename, JSON.stringify(payload), "application/json");
    this.frames = [];
  }
}

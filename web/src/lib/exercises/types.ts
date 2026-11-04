/**
 * The Exercise interface every exercise module implements, plus the value
 * types it exchanges with the counter and the UI.
 */
import type { BodyPoints, CountedExercise, ViewMode } from "../domain/models";
import type { VoiceLanguage } from "../i18n/speech";
import type { Illustration } from "../illustrations";

/**
 * Hysteresis band: the measured angle must stay below lowDeg and then above
 * highDeg for one repetition to count.
 */
export interface RepThresholds {
  lowDeg: number;
  highDeg: number;
  minIntervalS: number;
}

/** User-facing text for one exercise, on screen and in the library. */
export interface ExerciseCopy {
  label: string;
  summary: string;
  steps: readonly [string, string, string];
  benefit: string;
  safety: string;
  guidance: string;
  notVisible: string;
  low: string;
  high: string;
  angleLabel: string;
}

/**
 * Why a frame has no usable reading. "form" means the joints are visible but
 * the body is not in the exercise's shape; it is treated as unsure, never zero.
 */
export type BlockReason = "not_visible" | "face_camera" | "turn_side" | "form";

export type Reading = { angle: number } | { blocked: BlockReason };

/** Named intermediate values an exercise exposes for the developer panel. */
export type InspectionDetails = Record<string, number | string | null>;

export interface Exercise {
  readonly mode: CountedExercise;
  readonly bestView: ViewMode;
  readonly thresholds: RepThresholds;
  readonly copy: ExerciseCopy;
  /** Spoken when the exercise is selected, per voice language. */
  readonly announcement: Readonly<Record<VoiceLanguage, string>>;
  /**
   * Optional breakdown of how a frame was measured, shown only in dev mode.
   * Must be pure: it may be called on frames the counter never sees.
   */
  inspect?(p: BodyPoints): InspectionDetails;
  /** File name of a demonstration photo in public/img, if one exists. */
  readonly photo?: string;
  /** Start and end poses for the animated demo, used when there is no photo. */
  readonly illustration: Illustration;
  /** Reads the exercise's angle from one frame, or explains why it cannot. */
  measure(points: BodyPoints): Reading;
}

/**
 * Personal range of movement.
 *
 * Older adults often cannot reach textbook angles, so a fixed threshold can
 * make a genuine, full-effort movement never count. The tracker watches the
 * smoothed angle, finds each up-and-down cycle, and summarises the person's
 * usual low and high points. Counting thresholds are then placed inside that
 * range, but never made harder than the exercise's standard thresholds.
 */
import type { RepThresholds } from "../exercises/types";

export interface PersonalRange {
  readonly low: number;
  readonly high: number;
}

export interface Cycle {
  readonly trough: number;
  readonly peak: number;
}

/** Fraction of the standard band a movement must cover to be told apart from tracking noise. */
const MIN_SPAN_FRACTION = 0.6;
/** Where the low and high thresholds sit inside a personal range. */
const LOW_AT = 0.3;
const HIGH_AT = 0.7;
/** Minimum gap between the thresholds, as a fraction of the personal span. */
const MIN_GAP = 0.3;
/** Cycles needed before a first range is trusted. */
export const CALIBRATION_CYCLES = 2;

/** Smallest movement, in degrees, that counts as a real cycle for an exercise. */
export function minimumSpan(standard: RepThresholds): number {
  return (standard.highDeg - standard.lowDeg) * MIN_SPAN_FRACTION;
}

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

/**
 * Summarises cycles as a personal range.
 *
 * Returns:
 *   The median low and high points, or null when there are no cycles.
 */
export function rangeFromCycles(
  cycles: readonly Cycle[],
): PersonalRange | null {
  if (cycles.length === 0) return null;
  return {
    low: median(cycles.map((c) => c.trough)),
    high: median(cycles.map((c) => c.peak)),
  };
}

/**
 * Places counting thresholds inside a personal range.
 *
 * Args:
 *   standard: The exercise's standard thresholds.
 *   range: The person's measured range, or null if not yet known.
 *
 * Returns:
 *   Thresholds no harder to reach than the standard ones: the high threshold
 *   is never raised, and the low threshold is only lowered when needed to keep
 *   a clear gap below a lowered high threshold. Falls back to the standard
 *   thresholds when the range is unknown or too small to trust.
 */
export function thresholdsFor(
  standard: RepThresholds,
  range: PersonalRange | null,
): RepThresholds {
  if (!range) return standard;
  const span = range.high - range.low;
  if (span < minimumSpan(standard)) return standard;
  const highDeg = Math.min(standard.highDeg, range.low + span * HIGH_AT);
  const lowDeg = Math.min(
    Math.max(standard.lowDeg, range.low + span * LOW_AT),
    highDeg - span * MIN_GAP,
  );
  return { ...standard, lowDeg, highDeg };
}

/**
 * Finds up-and-down cycles in a stream of smoothed angles.
 *
 * A cycle is a rise of at least the minimum span from a trough to a peak,
 * confirmed once the angle falls back by half that span. Gaps in tracking
 * (null angles) are ignored rather than ending a cycle.
 */
export class RangeTracker {
  readonly cycles: Cycle[] = [];
  private rising = false;
  private trough = Infinity;
  private peak = -Infinity;
  private readonly hysteresis: number;

  constructor(private readonly minSpan: number) {
    this.hysteresis = minSpan / 2;
  }

  observe(angle: number | null): void {
    if (angle === null || !Number.isFinite(angle)) return;
    if (this.rising) {
      this.peak = Math.max(this.peak, angle);
      if (angle < this.peak - this.hysteresis) {
        if (this.peak - this.trough >= this.minSpan)
          this.cycles.push({ trough: this.trough, peak: this.peak });
        this.rising = false;
        this.trough = angle;
      }
    } else {
      this.trough = Math.min(this.trough, angle);
      if (angle > this.trough + this.hysteresis) {
        this.rising = true;
        this.peak = angle;
      }
    }
  }

  get range(): PersonalRange | null {
    return rangeFromCycles(this.cycles);
  }
}

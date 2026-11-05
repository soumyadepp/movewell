/**
 * Learns and applies a person's range of movement for the current exercise.
 *
 * When an exercise starts, a saved range (if any) sets the counter's
 * thresholds. Without one, the first movements are watched to learn it; those
 * movements count as reps. Every later movement refreshes the saved range.
 */
import type { EventBus } from "../events";
import { CALIBRATION_CYCLES, minimumSpan, type PersonalRange, RangeTracker, thresholdsFor } from "./range";
import { type ExerciseCounter, RepCounter } from "./counting";
import type { ExerciseMode } from "../domain/models";

/** Where each exercise's personal range of movement is kept. */
export interface RangeRepository {
  get(mode: ExerciseMode): PersonalRange | null;
  set(mode: ExerciseMode, range: PersonalRange): void;
  clear(): void;
}

/**
 * Where the counting thresholds for the current exercise come from.
 * learning: watching the first movements to learn the person's range.
 * personal: using a range learned earlier.
 * standard: using the exercise's standard thresholds.
 */
export type RangeStatus = "learning" | "personal" | "standard";

/** Applies, learns and saves the personal range for whichever exercise is running. */
export class RangeLearner {
  status: RangeStatus = "standard";
  private tracker: RangeTracker | null = null;
  private counter: RepCounter | null = null;
  private savedCycles = 0;

  constructor(
    private readonly events: EventBus,
    private readonly ranges?: RangeRepository,
  ) {}

  /**
   * Starts watching a new counter, applying any saved range to it.
   *
   * Args:
   *   counter: The counter for the exercise that is starting.
   */
  start(counter: ExerciseCounter): void {
    this.tracker = null;
    this.counter = null;
    this.savedCycles = 0;
    this.status = "standard";
    if (!(counter instanceof RepCounter) || !this.ranges) return;
    const standard = counter.exercise.thresholds;
    const saved = thresholdsFor(standard, this.ranges.get(counter.mode));
    counter.setThresholds(saved);
    this.counter = counter;
    this.tracker = new RangeTracker(minimumSpan(standard));
    this.status = saved === standard ? "learning" : "personal";
  }

  /**
   * Feeds the counter's latest smoothed angle to the tracker.
   *
   * Returns:
   *   True while the range is still being learned.
   */
  observe(): boolean {
    const { counter, tracker } = this;
    if (!counter || !tracker) return false;
    tracker.observe(counter.lastAngle);
    const cycles = tracker.cycles.length;
    const range = tracker.range;
    if (this.status === "learning" && cycles >= CALIBRATION_CYCLES && range) this.apply(counter, range, cycles);
    if (range && cycles >= CALIBRATION_CYCLES && cycles !== this.savedCycles) {
      this.savedCycles = cycles;
      this.ranges?.set(counter.mode, range);
    }
    return this.status === "learning";
  }

  /** Switches to personal thresholds and credits the movements that taught them. */
  private apply(counter: RepCounter, range: PersonalRange, cycles: number): void {
    counter.setThresholds(thresholdsFor(counter.exercise.thresholds, range));
    counter.credit(cycles);
    this.status = "personal";
    this.events.publish("rangeLearned", { mode: counter.mode });
  }
}

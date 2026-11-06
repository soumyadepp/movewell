/**
 * Exercise definitions.
 *
 * Each exercise lives in its own module and implements the Exercise interface
 * from ./types: measurement, thresholds, best camera view, copy, spoken
 * announcement and demo poses. Counting, screens and voice only depend on the
 * interface. Adding an exercise means adding one module and one registry entry.
 */
export { EXERCISES, getExercise, modeLabel } from "./registry";
export type { BlockReason, Exercise, ExerciseCopy, Reading, RepThresholds } from "./types";

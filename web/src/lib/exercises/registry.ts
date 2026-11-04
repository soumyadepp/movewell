/** Ordered registry of every counted exercise. */
import { type CountedExercise, ExerciseMode } from "../domain/models";
import { armRaise } from "./armRaise";
import { elbowCurl } from "./elbowCurl";
import { marching } from "./marching";
import { sideBend } from "./sideBend";
import { sideLegRaise } from "./sideLegRaise";
import { sitToStand } from "./sitToStand";
import type { Exercise } from "./types";

/** Counted exercises in display order. */
export const EXERCISES: readonly Exercise[] = [armRaise, elbowCurl, marching, sideLegRaise, sideBend, sitToStand];

const BY_MODE = new Map<ExerciseMode, Exercise>(EXERCISES.map((e) => [e.mode, e]));

export const POSTURE_LABEL = "Posture check";

/** Returns the exercise for a counted mode. Throws for posture or unknown modes. */
export function getExercise(mode: CountedExercise | ExerciseMode): Exercise {
  const exercise = BY_MODE.get(mode);
  if (!exercise) throw new Error(`No exercise registered for ${mode}`);
  return exercise;
}

/** Display name for any mode, including posture. */
export const modeLabel = (mode: ExerciseMode): string =>
  mode === ExerciseMode.Posture ? POSTURE_LABEL : getExercise(mode).copy.label;

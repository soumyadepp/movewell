/** Ordered registry of every counted exercise. */
import { ExerciseMode } from "../domain/models";
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

/** Returns the exercise for a mode. Throws for an unknown mode. */
export function getExercise(mode: ExerciseMode): Exercise {
  const exercise = BY_MODE.get(mode);
  if (!exercise) throw new Error(`No exercise registered for ${mode}`);
  return exercise;
}

/** Display name for an exercise. */
export const modeLabel = (mode: ExerciseMode): string => getExercise(mode).copy.label;

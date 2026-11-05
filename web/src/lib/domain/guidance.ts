/**
 * What the person should be told about the current frame, as a code.
 *
 * The counter and assistant decide which guidance applies; the screen turns
 * the code into words with guidanceText, so core logic never holds sentences
 * and the wording lives in one place.
 */
import type { CountedExercise, Finding } from "./models";

export type Guidance =
  | { readonly kind: "exercise"; readonly mode: CountedExercise }
  | { readonly kind: "notVisible"; readonly mode: CountedExercise }
  | { readonly kind: "turnFront" }
  | { readonly kind: "turnSide" }
  | { readonly kind: "learningRange" }
  | { readonly kind: "postureMode" }
  | { readonly kind: "finding"; readonly finding: Finding }
  | { readonly kind: "noFindings" }
  | { readonly kind: "noBody" }
  | { readonly kind: "gettingStarted" };

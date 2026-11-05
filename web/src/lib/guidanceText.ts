/** Turns guidance codes from the core into the words shown on screen. */
import type { Guidance } from "./domain/guidance";
import { getExercise } from "./exercises";
import * as msg from "./messages";

/**
 * Renders one guidance code as a sentence.
 *
 * Args:
 *   guidance: The code chosen by the counter or assistant.
 *
 * Returns:
 *   The sentence to show; for codes with several lines, the most important one.
 */
export function guidanceText(guidance: Guidance): string {
  switch (guidance.kind) {
    case "exercise":
      return getExercise(guidance.mode).copy.guidance;
    case "notVisible":
      return getExercise(guidance.mode).copy.notVisible;
    case "turnFront":
      return msg.GUIDANCE_TURN_FRONT;
    case "turnSide":
      return msg.GUIDANCE_TURN_SIDE;
    case "learningRange":
      return msg.LEARNING_RANGE;
    case "postureMode":
      return msg.GUIDANCE_POSTURE_MODE;
    case "finding":
      return guidance.finding.correction;
    case "noFindings":
      return msg.GUIDANCE_NO_FINDINGS;
    case "noBody":
      return msg.GUIDANCE_NO_BODY[0];
    case "gettingStarted":
      return msg.GUIDANCE_INITIAL[0];
  }
}

import { describe, expect, it } from "vitest";
import * as catalog from "./analysis/findings";
import { ExerciseMode } from "./domain/models";
import { getExercise } from "./exercises";
import { guidanceText } from "./guidanceText";
import * as msg from "./messages";

describe("guidance text", () => {
  it("uses each exercise's own wording", () => {
    const curl = getExercise(ExerciseMode.ElbowCurl).copy;
    expect(guidanceText({ kind: "exercise", mode: ExerciseMode.ElbowCurl })).toBe(curl.guidance);
    expect(guidanceText({ kind: "notVisible", mode: ExerciseMode.ElbowCurl })).toBe(curl.notVisible);
  });

  it("words position problems, range learning and posture corrections", () => {
    expect(guidanceText({ kind: "turnFront" })).toBe(msg.GUIDANCE_TURN_FRONT);
    expect(guidanceText({ kind: "learningRange" })).toBe(msg.LEARNING_RANGE);
    expect(guidanceText({ kind: "finding", finding: catalog.SHOULDER_HEIGHT })).toBe(
      catalog.SHOULDER_HEIGHT.correction,
    );
    expect(guidanceText({ kind: "noBody" })).toBe(msg.GUIDANCE_NO_BODY[0]);
  });
});

import { describe, expect, it } from "vitest";
import { ExerciseMode, Joint } from "../domain/models";
import { EventBus } from "../events";
import { body, curled, FakeClock, without } from "../testing/poses";
import { createCounter } from "./counting";
import { describeReading, formatValue, inspectFrame } from "./inspection";

function inspect(points: ReturnType<typeof body> | null, visibility = 0.9) {
  const clock = new FakeClock();
  const counter = createCounter(
    ExerciseMode.ElbowCurl,
    new EventBus(),
    clock.read,
  );
  return inspectFrame({
    fps: 30,
    mode: ExerciseMode.ElbowCurl,
    goal: 10,
    counter,
    points,
    visibility: () => visibility,
    now: clock.now,
  });
}

describe("frame inspection", () => {
  it("shows the raw angle and per-arm breakdown for a curl", () => {
    const result = inspect(curled(120));
    expect(result.reading).toMatch(/°$/);
    expect(result.lowDeg).toBe(30);
    expect(result.highDeg).toBe(75);
    const details = Object.fromEntries(result.details);
    expect(details["L arm used"]).toBe("yes");
    expect(Number(details["L bend 2D"])).toBeGreaterThan(75);
  });

  it("marks joints the confidence cut-off dropped", () => {
    const result = inspect(without(Joint.LeftWrist));
    const wrist = result.joints.find((j) => j.joint === Joint.LeftWrist);
    expect(wrist?.kept).toBe(false);
    expect(result.joints.find((j) => j.joint === Joint.RightWrist)?.kept).toBe(
      true,
    );
  });

  it("says when there is no body at all", () => {
    const result = inspect(null);
    expect(result.detected).toBe(false);
    expect(result.reading).toBe("no body");
    expect(result.details).toEqual([]);
  });

  it("formats values and blocked readings for display", () => {
    expect(formatValue(null)).toBe("-");
    expect(formatValue(12.345)).toBe("12.3");
    expect(describeReading({ blocked: "form" })).toBe("blocked: form");
  });
});

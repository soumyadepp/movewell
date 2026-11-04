import { describe, expect, it } from "vitest";
import {
  minimumSpan,
  RangeTracker,
  rangeFromCycles,
  thresholdsFor,
} from "./range";

const curl = { lowDeg: 30, highDeg: 75, minIntervalS: 0.8 };

function sweep(tracker: RangeTracker, from: number, to: number, steps = 20) {
  for (let i = 0; i <= steps; i++)
    tracker.observe(from + ((to - from) * i) / steps);
}

describe("personal range", () => {
  it("keeps the standard thresholds until a range is known", () => {
    expect(thresholdsFor(curl, null)).toBe(curl);
  });

  it("makes a limited but real movement count", () => {
    const t = thresholdsFor(curl, { low: 10, high: 65 });
    expect(t.highDeg).toBeLessThan(65);
    expect(t.highDeg).toBeLessThan(curl.highDeg);
    expect(t.lowDeg).toBeLessThan(t.highDeg);
    expect(t.minIntervalS).toBe(curl.minIntervalS);
  });

  it("counts for someone who cannot fully straighten the arm", () => {
    const t = thresholdsFor(curl, { low: 40, high: 90 });
    expect(t.lowDeg).toBeGreaterThan(40);
    expect(t.highDeg).toBeLessThanOrEqual(75);
    expect(t.highDeg - t.lowDeg).toBeGreaterThanOrEqual(15);
  });

  it("never makes counting harder than the standard", () => {
    const t = thresholdsFor(curl, { low: 0, high: 150 });
    expect(t.highDeg).toBe(curl.highDeg);
    expect(t.lowDeg).toBeGreaterThanOrEqual(curl.lowDeg);
  });

  it("ignores a range too small to tell apart from tracking noise", () => {
    expect(
      thresholdsFor(curl, { low: 20, high: 20 + minimumSpan(curl) - 1 }),
    ).toBe(curl);
  });

  it("finds each up-and-down movement and summarises it", () => {
    const tracker = new RangeTracker(minimumSpan(curl));
    sweep(tracker, 10, 70);
    sweep(tracker, 70, 12);
    sweep(tracker, 12, 66);
    sweep(tracker, 66, 8);
    expect(tracker.cycles).toHaveLength(2);
    expect(tracker.range).toEqual({ low: 11, high: 68 });
  });

  it("ignores wobbles smaller than a real movement", () => {
    const tracker = new RangeTracker(minimumSpan(curl));
    for (let i = 0; i < 10; i++) {
      sweep(tracker, 20, 35);
      sweep(tracker, 35, 20);
    }
    expect(tracker.cycles).toHaveLength(0);
  });

  it("does not end a cycle on a tracking gap", () => {
    const tracker = new RangeTracker(minimumSpan(curl));
    sweep(tracker, 10, 70);
    tracker.observe(null);
    sweep(tracker, 70, 10);
    expect(tracker.cycles).toHaveLength(1);
  });

  it("uses the middle of several movements, not one outlier", () => {
    expect(
      rangeFromCycles([
        { trough: 10, peak: 60 },
        { trough: 12, peak: 140 },
        { trough: 8, peak: 64 },
      ]),
    ).toEqual({ low: 10, high: 64 });
  });
});

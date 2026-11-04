import { describe, expect, it } from "vitest";
import { ALLURE, write } from "./handwriting";

describe("pencil writing", () => {
  it("writes a name as one path whose length is the sum of its letters", () => {
    const result = write("Asha.");
    const expected = [..."Asha."].reduce(
      (sum, c) => sum + ALLURE.glyphs[c].len,
      0,
    );
    expect(Math.abs(result!.length - expected)).toBeLessThan(5);
    expect(result!.strokes.every((s) => s.d.startsWith("M"))).toBe(true);
  });

  it("starts each stroke where the previous one ended, so the pencil never jumps ahead", () => {
    const { strokes, length } = write("Well done")!;
    strokes
      .slice(1)
      .forEach((stroke, i) =>
        expect(stroke.start).toBeCloseTo(strokes[i].start + strokes[i].length),
      );
    const last = strokes[strokes.length - 1];
    expect(last.start + last.length).toBeCloseTo(length);
  });

  it("gives spaces width but no ink", () => {
    expect(write("Well done")!.aspect).toBeGreaterThan(
      write("Welldone")!.aspect,
    );
    expect(write("Well done")!.length).toBeCloseTo(write("Welldone")!.length);
  });

  it("writes live numbers", () => {
    expect(write("12")?.length).toBeGreaterThan(0);
  });

  it("falls back for characters the font does not have", () => {
    expect(write("आशा")).toBeNull();
  });
});

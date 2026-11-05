import { describe, expect, it } from "vitest";
import { ExerciseMode } from "./domain/models";
import { href, parseRoute } from "./routing";

describe("routing", () => {
  it("round-trips every screen through its link", () => {
    expect(parseRoute(href.home)).toEqual({ name: "home" });
    expect(parseRoute(href.library)).toEqual({ name: "library" });
    expect(parseRoute(href.week)).toEqual({ name: "week" });
    expect(parseRoute(href.settings)).toEqual({ name: "settings" });
    expect(parseRoute(href.plan)).toEqual({ name: "plan" });
    expect(parseRoute(href.summary)).toEqual({ name: "summary" });
    expect(parseRoute(href.routine)).toEqual({ name: "workout", kind: "routine" });
    expect(parseRoute(href.detail(ExerciseMode.ElbowCurl))).toEqual({ name: "detail", mode: ExerciseMode.ElbowCurl });
    expect(parseRoute(href.setup("space"))).toEqual({ name: "setup", step: "space" });
  });

  it("reads a single exercise and its target", () => {
    expect(parseRoute(href.single(ExerciseMode.Marching, 15))).toEqual({
      name: "workout",
      kind: "single",
      mode: ExerciseMode.Marching,
      target: 15,
    });
  });

  it("falls back sensibly for unknown or old links", () => {
    expect(parseRoute("#/progress")).toEqual({ name: "week" });
    expect(parseRoute("#/setup/unknown")).toEqual({ name: "setup", step: "welcome" });
    expect(parseRoute("#/exercises/not-an-exercise")).toEqual({ name: "library" });
    expect(parseRoute("#/workout/not-an-exercise")).toEqual({ name: "home" });
    expect(parseRoute("#/nonsense")).toEqual({ name: "home" });
    expect(parseRoute("")).toEqual({ name: "home" });
  });
});

import { describe, expect, it } from "vitest";
import { commandAction, commandHints, parseCommand } from "./commands";

describe("voice commands", () => {
  it("understands short spoken commands", () => {
    expect(parseCommand("Next", "en")).toBe("next");
    expect(parseCommand("carry on.", "en")).toBe("resume");
    expect(parseCommand("  Pause! ", "en")).toBe("pause");
    expect(parseCommand("end session", "en")).toBe("end");
    expect(parseCommand("Yes", "en")).toBe("yes");
  });

  it("accepts short phrases with extra words and common mishearings", () => {
    expect(parseCommand("pause please", "en")).toBe("pause");
    expect(parseCommand("okay next", "en")).toBe("next");
    expect(parseCommand("Paws", "en")).toBe("pause");
    expect(parseCommand("carry-on", "en")).toBe("resume");
    expect(parseCommand("next one please", "en")).toBe("next");
  });

  it("prefers the longer phrase when one contains another", () => {
    expect(parseCommand("start again", "en")).toBe("resume");
    expect(parseCommand("go on", "en")).toBe("resume");
    expect(parseCommand("end now", "en")).toBe("end");
  });

  it("ignores sentences, including the app's own coaching", () => {
    expect(
      parseCommand("Elbow curl selected. Bend your elbows slowly", "en"),
    ).toBeNull();
    expect(parseCommand("Please move into the camera view", "en")).toBeNull();
    expect(
      parseCommand("Paused. Step back into view and we'll carry on.", "en"),
    ).toBeNull();
    expect(parseCommand("I think we should go next door", "en")).toBeNull();
    expect(parseCommand("hello there", "en")).toBeNull();
    expect(parseCommand("", "en")).toBeNull();
  });

  it("understands Hindi, English in Devanagari, and English while Hindi is selected", () => {
    expect(parseCommand("रुको", "hi")).toBe("pause");
    expect(parseCommand("अगला", "hi")).toBe("next");
    expect(parseCommand("नेक्स्ट", "hi")).toBe("next");
    expect(parseCommand("पॉज़", "hi")).toBe("pause");
    expect(parseCommand("pause", "hi")).toBe("pause");
    expect(parseCommand("रुको", "en")).toBeNull();
  });

  it("offers one hint per command", () => {
    expect(commandHints("en")).toMatchObject({
      next: "next",
      pause: "pause",
      resume: "carry on",
      end: "end session",
    });
  });
});

describe("what a command does", () => {
  it("moves the session forward with next, whatever it is doing", () => {
    expect(commandAction("next", "intro", false)).toBe("begin");
    expect(commandAction("next", "countdown", false)).toBe("skipExercise");
    expect(commandAction("next", "exercise", false)).toBe("skipExercise");
    expect(commandAction("next", "paused", false)).toBe("resume");
    expect(commandAction("next", "rest", false)).toBe("skipRest");
  });

  it("only pauses an exercise that is running or counting down", () => {
    expect(commandAction("pause", "exercise", false)).toBe("pause");
    expect(commandAction("pause", "countdown", false)).toBe("pause");
    expect(commandAction("pause", "rest", false)).toBe("none");
    expect(commandAction("resume", "paused", false)).toBe("resume");
    expect(commandAction("resume", "exercise", false)).toBe("none");
  });

  it("asks before ending, and yes or no answers the question", () => {
    expect(commandAction("end", "exercise", false)).toBe("requestEnd");
    expect(commandAction("yes", "exercise", true)).toBe("confirmEnd");
    expect(commandAction("no", "exercise", true)).toBe("cancelEnd");
    expect(commandAction("resume", "exercise", true)).toBe("cancelEnd");
    expect(commandAction("next", "exercise", true)).toBe("none");
  });

  it("ignores stray yes and no when nothing was asked", () => {
    expect(commandAction("yes", "exercise", false)).toBe("none");
    expect(commandAction("no", "exercise", false)).toBe("none");
    expect(commandAction("next", "done", false)).toBe("none");
  });
});

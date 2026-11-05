import { describe, expect, it } from "vitest";
import { AUTO_PAUSE_S, AUTO_RESUME_S, PresenceWatcher } from "./presence";

describe("presence", () => {
  it("pauses an exercise after the person has been out of view for a while", () => {
    const watcher = new PresenceWatcher();
    expect(watcher.observe(true, 0, "exercise", null)).toBeNull();
    expect(watcher.observe(false, AUTO_PAUSE_S - 0.1, "exercise", null)).toBeNull();
    expect(watcher.observe(false, AUTO_PAUSE_S, "exercise", null)).toBe("pause");
  });

  it("carries on once the person has been back for a moment", () => {
    const watcher = new PresenceWatcher();
    watcher.observe(true, 10, "paused", "away");
    expect(watcher.observe(true, 10 + AUTO_RESUME_S - 0.1, "paused", "away")).toBeNull();
    expect(watcher.observe(true, 10 + AUTO_RESUME_S, "paused", "away")).toBe("resume");
  });

  it("never resumes a pause the person asked for", () => {
    const watcher = new PresenceWatcher();
    watcher.observe(true, 0, "paused", "user");
    expect(watcher.observe(true, 5, "paused", "user")).toBeNull();
  });

  it("does not pause outside an exercise", () => {
    const watcher = new PresenceWatcher();
    expect(watcher.observe(false, 100, "rest", null)).toBeNull();
    expect(watcher.observe(false, 100, "intro", null)).toBeNull();
  });

  it("restarts the return timer if the person flickers out again", () => {
    const watcher = new PresenceWatcher();
    watcher.observe(true, 0, "paused", "away");
    watcher.observe(false, 0.5, "paused", "away");
    expect(watcher.observe(true, 1.2, "paused", "away")).toBeNull();
  });
});

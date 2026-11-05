import { describe, expect, it } from "vitest";
import { ExerciseMode } from "../domain/models";
import { DAILY_ROUTINE, setRest } from "../routine";
import { DEFAULT_PREFERENCES, PlanRepository, PreferencesRepository } from "./preferences";

class MemoryStore {
  values = new Map<string, string>();
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
}

describe("preferences", () => {
  it("fills anything not saved with the defaults", () => {
    const store = new MemoryStore();
    store.setItem("prefs", JSON.stringify({ name: "Asha" }));
    expect(new PreferencesRepository("prefs", store).load()).toEqual({ ...DEFAULT_PREFERENCES, name: "Asha" });
  });

  it("survives broken saved data", () => {
    const store = new MemoryStore();
    store.setItem("prefs", "{not json");
    expect(new PreferencesRepository("prefs", store).load()).toEqual(DEFAULT_PREFERENCES);
  });

  it("saves and loads the same preferences", () => {
    const repo = new PreferencesRepository("prefs", new MemoryStore());
    repo.save({ ...DEFAULT_PREFERENCES, voiceCommands: true, textSize: "xl" });
    expect(repo.load()).toMatchObject({ voiceCommands: true, textSize: "xl" });
  });
});

describe("plan storage", () => {
  it("uses the physiotherapist's plan until one is saved, and again after clearing", () => {
    const repo = new PlanRepository("plan", new MemoryStore());
    expect(repo.load()).toBe(DAILY_ROUTINE);
    repo.save(setRest(DAILY_ROUTINE, 30));
    expect(repo.load().restS).toBe(30);
    repo.clear();
    expect(repo.load()).toBe(DAILY_ROUTINE);
  });

  it("drops invalid saved steps", () => {
    const store = new MemoryStore();
    store.setItem("plan", JSON.stringify({ steps: [{ mode: ExerciseMode.Marching, target: 999 }] }));
    expect(new PlanRepository("plan", store).load()).toBe(DAILY_ROUTINE);
  });
});

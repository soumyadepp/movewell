import { describe, expect, it } from "vitest";
import { JsonStore } from "./jsonStore";

class MemoryStore {
  values = new Map<string, string>();
  full = false;
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    if (this.full) throw new Error("QuotaExceededError");
    this.values.set(key, value);
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
}

const numbers = (store: MemoryStore | null) =>
  new JsonStore<number[]>(
    "k",
    (raw) => (Array.isArray(raw) ? raw.filter((n) => typeof n === "number") : []),
    () => [],
    store,
  );

describe("json store", () => {
  it("saves and loads a value", () => {
    const store = numbers(new MemoryStore());
    expect(store.save([1, 2])).toBe(true);
    expect(store.load()).toEqual([1, 2]);
  });

  it("falls back when nothing is saved, the data is broken, or it was cleared", () => {
    const memory = new MemoryStore();
    const store = numbers(memory);
    expect(store.load()).toEqual([]);
    memory.setItem("k", "{oops");
    expect(store.load()).toEqual([]);
    store.save([3]);
    store.clear();
    expect(store.load()).toEqual([]);
  });

  it("validates what it reads", () => {
    const memory = new MemoryStore();
    memory.setItem("k", JSON.stringify([1, "two", 3]));
    expect(numbers(memory).load()).toEqual([1, 3]);
  });

  it("reports a failed save when storage is full or missing", () => {
    const memory = new MemoryStore();
    memory.full = true;
    expect(numbers(memory).save([1])).toBe(false);
    expect(numbers(null).save([1])).toBe(false);
    expect(numbers(null).load()).toEqual([]);
  });
});

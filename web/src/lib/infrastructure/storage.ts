/** Exercise history and learned ranges, saved in this browser. */
import type { RangeRepository, SessionRepository } from "../assistant";
import type { PersonalRange } from "../analysis/range";
import type { ExerciseMode, SessionRecord } from "../domain/models";
import { JsonStore, type KeyValueStore } from "./jsonStore";

type SavedRanges = Partial<Record<string, PersonalRange>>;

const isRange = (value: unknown): value is PersonalRange => {
  const range = value as Partial<PersonalRange> | null;
  return (
    typeof range?.low === "number" &&
    typeof range.high === "number" &&
    Number.isFinite(range.low) &&
    Number.isFinite(range.high) &&
    range.high > range.low
  );
};

/** Exercise history kept in this browser. */
export class LocalStorageRepository implements SessionRepository {
  private readonly store: JsonStore<SessionRecord[]>;

  /**
   * Args:
   *   key: The storage key.
   *   storage: Where to keep it; the browser's local storage by default.
   */
  constructor(key: string, storage?: KeyValueStore | null) {
    this.store = new JsonStore(
      key,
      (raw) => (Array.isArray(raw) ? (raw as SessionRecord[]) : []),
      () => [],
      storage,
    );
  }

  /**
   * Reads the whole history.
   *
   * Returns:
   *   Every saved record, or an empty list if none can be read.
   */
  loadAll(): SessionRecord[] {
    return this.store.load();
  }

  /**
   * Adds one record to the history.
   *
   * Args:
   *   record: The finished exercise.
   *
   * Returns:
   *   True if it was saved.
   */
  append(record: SessionRecord): boolean {
    return this.store.save([...this.loadAll(), record]);
  }

  /** Deletes the whole history. */
  clear(): void {
    this.store.clear();
  }
}

/** Saves each exercise's personal range of movement on this device. */
export class LocalStorageRangeRepository implements RangeRepository {
  private readonly store: JsonStore<SavedRanges>;

  /**
   * Args:
   *   key: The storage key.
   *   storage: Where to keep it; the browser's local storage by default.
   */
  constructor(key: string, storage?: KeyValueStore | null) {
    this.store = new JsonStore(
      key,
      (raw) => (raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as SavedRanges) : {}),
      () => ({}),
      storage,
    );
  }

  /**
   * Reads one exercise's saved range.
   *
   * Args:
   *   mode: The exercise.
   *
   * Returns:
   *   The range, or null if none is saved or it is invalid.
   */
  get(mode: ExerciseMode): PersonalRange | null {
    const range = this.store.load()[mode];
    return isRange(range) ? { low: range.low, high: range.high } : null;
  }

  /**
   * Saves one exercise's range, rounded to whole degrees.
   *
   * Args:
   *   mode: The exercise.
   *   range: Its measured range.
   */
  set(mode: ExerciseMode, range: PersonalRange): void {
    this.store.save({ ...this.store.load(), [mode]: { low: Math.round(range.low), high: Math.round(range.high) } });
  }

  /** Forgets every saved range. */
  clear(): void {
    this.store.clear();
  }
}

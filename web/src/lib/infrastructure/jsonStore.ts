/**
 * One value saved as JSON in browser storage.
 *
 * Storage can be missing (private windows, some embedded browsers), full, or
 * hold data from an older version or another tab. Every read goes through a
 * parser that validates the data and falls back to a default, and every write
 * reports whether it worked, so the rest of the app never handles those cases.
 */

export type KeyValueStore = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/**
 * Returns the browser's local storage if it can be used.
 *
 * Returns:
 *   Local storage, or null when the browser blocks it or there is none.
 */
export function browserStorage(): KeyValueStore | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export class JsonStore<T> {
  /**
   * Args:
   *   key: The storage key.
   *   parse: Turns parsed JSON of unknown shape into a valid value.
   *   fallback: The value to use when nothing usable is saved.
   *   storage: Where to keep it; the browser's local storage by default.
   */
  constructor(
    private readonly key: string,
    private readonly parse: (raw: unknown) => T,
    private readonly fallback: () => T,
    private readonly storage: KeyValueStore | null = browserStorage(),
  ) {}

  /**
   * Reads the saved value.
   *
   * Returns:
   *   The validated value, or the fallback when nothing usable is saved.
   */
  load(): T {
    try {
      const raw = this.storage?.getItem(this.key);
      return raw ? this.parse(JSON.parse(raw)) : this.fallback();
    } catch {
      return this.fallback();
    }
  }

  /**
   * Saves a value as JSON.
   *
   * Args:
   *   value: What to save.
   *
   * Returns:
   *   True if it was saved.
   */
  save(value: unknown): boolean {
    if (!this.storage) return false;
    try {
      this.storage.setItem(this.key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  /** Removes the saved value, so the fallback is used again. */
  clear(): void {
    try {
      this.storage?.removeItem(this.key);
    } catch {
      return;
    }
  }
}

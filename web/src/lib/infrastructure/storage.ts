/** Session history in localStorage, plus CSV export compatible with the Python app. */
import type { RangeRepository, SessionRepository } from "../assistant";
import type { PersonalRange } from "../analysis/range";
import {
  type ExerciseMode,
  SESSION_FIELDS,
  type SessionRecord,
} from "../domain/models";

export class LocalStorageRepository implements SessionRepository {
  constructor(
    private readonly key: string,
    private readonly storage: Pick<
      Storage,
      "getItem" | "setItem" | "removeItem"
    > | null = safeLocalStorage(),
  ) {}

  loadAll(): SessionRecord[] {
    try {
      const raw = this.storage?.getItem(this.key);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? (parsed as SessionRecord[]) : [];
    } catch {
      return [];
    }
  }

  append(record: SessionRecord): boolean {
    if (!this.storage) return false;
    try {
      this.storage.setItem(
        this.key,
        JSON.stringify([...this.loadAll(), record]),
      );
      return true;
    } catch {
      return false;
    }
  }

  clear(): void {
    try {
      this.storage?.removeItem(this.key);
    } catch {
      return;
    }
  }
}

function safeLocalStorage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

const csvCell = (value: unknown): string => {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export function toCsv(records: SessionRecord[]): string {
  const rows = records.map((r) =>
    SESSION_FIELDS.map((f) => csvCell(r[f])).join(","),
  );
  return [SESSION_FIELDS.join(","), ...rows].join("\n") + "\n";
}

export function downloadText(
  filename: string,
  text: string,
  type = "text/csv",
): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = Object.assign(document.createElement("a"), {
    href: url,
    download: filename,
  });
  link.click();
  URL.revokeObjectURL(url);
}

/** Saves each exercise's personal range of movement on this device. */
export class LocalStorageRangeRepository implements RangeRepository {
  constructor(
    private readonly key: string,
    private readonly storage: Pick<
      Storage,
      "getItem" | "setItem" | "removeItem"
    > | null = safeLocalStorage(),
  ) {}

  get(mode: ExerciseMode): PersonalRange | null {
    const range = this.readAll()[mode];
    if (
      !range ||
      !Number.isFinite(range.low) ||
      !Number.isFinite(range.high) ||
      range.high <= range.low
    )
      return null;
    return { low: range.low, high: range.high };
  }

  set(mode: ExerciseMode, range: PersonalRange): void {
    try {
      this.storage?.setItem(
        this.key,
        JSON.stringify({
          ...this.readAll(),
          [mode]: { low: Math.round(range.low), high: Math.round(range.high) },
        }),
      );
    } catch {
      return;
    }
  }

  clear(): void {
    try {
      this.storage?.removeItem(this.key);
    } catch {
      return;
    }
  }

  private readAll(): Partial<Record<string, PersonalRange>> {
    try {
      const raw = this.storage?.getItem(this.key);
      const parsed: unknown = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Partial<Record<string, PersonalRange>>)
        : {};
    } catch {
      return {};
    }
  }
}

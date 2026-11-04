/** Session history in localStorage, plus CSV export compatible with the Python app. */
import type { SessionRepository } from "../assistant";
import { SESSION_FIELDS, type SessionRecord } from "../domain/models";

export class LocalStorageRepository implements SessionRepository {
  constructor(
    private readonly key: string,
    private readonly storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null = safeLocalStorage(),
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
      this.storage.setItem(this.key, JSON.stringify([...this.loadAll(), record]));
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
  const rows = records.map((r) => SESSION_FIELDS.map((f) => csvCell(r[f])).join(","));
  return [SESSION_FIELDS.join(","), ...rows].join("\n") + "\n";
}

export function downloadText(filename: string, text: string, type = "text/csv"): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = Object.assign(document.createElement("a"), { href: url, download: filename });
  link.click();
  URL.revokeObjectURL(url);
}

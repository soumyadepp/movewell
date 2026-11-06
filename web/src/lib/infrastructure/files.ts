/** Files the person can save: the history as CSV, and recorded landmarks as JSON. */
import { SESSION_FIELDS, type SessionRecord } from "../domain/models";

const csvCell = (value: unknown): string => {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/**
 * Formats the history as CSV with the same columns as the desktop app.
 *
 * Args:
 *   records: The history to export.
 *
 * Returns:
 *   The CSV text, with a header row.
 */
export function toCsv(records: SessionRecord[]): string {
  const rows = records.map((r) => SESSION_FIELDS.map((f) => csvCell(r[f])).join(","));
  return [SESSION_FIELDS.join(","), ...rows].join("\n") + "\n";
}

/**
 * Saves text as a file on the person's computer.
 *
 * Args:
 *   filename: The suggested file name.
 *   text: The file's contents.
 *   type: The file's media type.
 */
export function downloadText(filename: string, text: string, type = "text/csv"): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = Object.assign(document.createElement("a"), { href: url, download: filename });
  link.click();
  URL.revokeObjectURL(url);
}

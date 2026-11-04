/** Progress statistics derived from saved session records. */
import type { ExerciseMode, SessionRecord } from "../domain/models";

const DAY_MS = 86_400_000;

/** Local calendar day key, e.g. "2026-11-04". */
export function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Local ISO timestamp without timezone, matching the Python app's CSV format. */
export function localIso(date: Date): string {
  const time = [date.getHours(), date.getMinutes(), date.getSeconds()].map((n) => String(n).padStart(2, "0"));
  return `${dayKey(date)}T${time.join(":")}`;
}

const recordDay = (record: SessionRecord) => record.date_time.slice(0, 10);

const daysAgo = (today: Date, n: number) => dayKey(new Date(today.getTime() - n * DAY_MS));

/** Consecutive active days ending today (or yesterday, so a streak is not lost before today's session). */
export function dayStreak(history: SessionRecord[], today: Date): number {
  const active = new Set(history.map(recordDay));
  let start = active.has(dayKey(today)) ? 0 : 1;
  let streak = 0;
  while (active.has(daysAgo(today, start + streak))) streak++;
  return streak;
}

export interface WeekSummary {
  activeDays: number;
  reps: number;
  minutes: number;
}

/** Totals for the last seven days including today. */
export function weekSummary(history: SessionRecord[], today: Date): WeekSummary {
  const window = new Set(Array.from({ length: 7 }, (_, i) => daysAgo(today, i)));
  const recent = history.filter((r) => window.has(recordDay(r)));
  return {
    activeDays: new Set(recent.map(recordDay)).size,
    reps: recent.reduce((sum, r) => sum + (Number(r.repetitions) || 0), 0),
    minutes: Math.round(recent.reduce((sum, r) => sum + (Number(r.duration_seconds) || 0), 0) / 60),
  };
}

export interface DailyPoint {
  day: string;
  reps: number;
}

/** Repetitions per day for one exercise, oldest first, including empty days. */
export function dailyReps(history: SessionRecord[], mode: ExerciseMode, today: Date, days = 14): DailyPoint[] {
  const totals = new Map<string, number>();
  for (const r of history) {
    if (r.exercise !== mode) continue;
    totals.set(recordDay(r), (totals.get(recordDay(r)) ?? 0) + (Number(r.repetitions) || 0));
  }
  return Array.from({ length: days }, (_, i) => {
    const day = daysAgo(today, days - 1 - i);
    return { day, reps: totals.get(day) ?? 0 };
  });
}

export interface WeekDay {
  key: string;
  date: Date;
  isToday: boolean;
  isFuture: boolean;
  done: boolean;
  minutes: number;
}

/** The current Monday-to-Sunday week with activity per day. */
export function currentWeek(history: SessionRecord[], today: Date): WeekDay[] {
  const offset = (today.getDay() + 6) % 7;
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset);
  const seconds = new Map<string, number>();
  for (const r of history) {
    const day = recordDay(r);
    seconds.set(day, (seconds.get(day) ?? 0) + (Number(r.duration_seconds) || 0));
  }
  const todayKey = dayKey(today);
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    const key = dayKey(date);
    return {
      key,
      date,
      isToday: key === todayKey,
      isFuture: key > todayKey,
      done: seconds.has(key),
      minutes: Math.max(seconds.has(key) ? 1 : 0, Math.round((seconds.get(key) ?? 0) / 60)),
    };
  });
}

export interface DaySession {
  key: string;
  date: Date;
  minutes: number;
  exercises: number;
  movements: number;
}

/** Recent active days, newest first, each summarising that day's exercises. */
export function recentDays(history: SessionRecord[], limit = 6): DaySession[] {
  const byDay = new Map<string, SessionRecord[]>();
  for (const r of history) {
    const day = recordDay(r);
    byDay.set(day, [...(byDay.get(day) ?? []), r]);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .slice(0, limit)
    .map(([key, records]) => {
      const [y, m, d] = key.split("-").map(Number);
      return {
        key,
        date: new Date(y, m - 1, d),
        minutes: Math.max(1, Math.round(records.reduce((s, r) => s + (Number(r.duration_seconds) || 0), 0) / 60)),
        exercises: new Set(records.map((r) => r.exercise)).size,
        movements: records.reduce((s, r) => s + (Number(r.repetitions) || 0), 0),
      };
    });
}

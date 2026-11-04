import { describe, expect, it } from "vitest";
import { dailyReps, dayStreak, localIso, weekSummary } from "./analysis/progress";
import { ExerciseMode, type SessionRecord } from "./domain/models";
import { DAILY_ROUTINE, estimatedMinutes, RoutineRun, singleExercise } from "./routine";
import { FakeClock } from "./testing/poses";

describe("RoutineRun", () => {
  it("moves through exercise, rest and the next exercise", () => {
    const clock = new FakeClock();
    const run = new RoutineRun(DAILY_ROUTINE, clock.read);
    expect(run.phase).toBe("intro");
    expect(run.current?.mode).toBe(ExerciseMode.ArmRaise);
    run.begin();
    clock.advance(30);
    expect(run.completeStep(10, true)).toBe("rest");
    expect(run.restRemainingS()).toBe(15);
    clock.advance(14);
    expect(run.tick()).toBe(false);
    clock.advance(1);
    expect(run.tick()).toBe(true);
    expect(run.phase).toBe("intro");
    expect(run.current?.mode).toBe(ExerciseMode.ElbowCurl);
    expect(run.results[0]).toEqual({ mode: ExerciseMode.ArmRaise, target: 10, reps: 10, durationS: 30, completed: true });
  });

  it("skips rest and finishes after the last step", () => {
    const run = new RoutineRun(DAILY_ROUTINE, new FakeClock().read);
    for (let i = 0; i < DAILY_ROUTINE.steps.length - 1; i++) {
      run.begin();
      run.completeStep(3, false);
      run.skipRest();
    }
    run.begin();
    expect(run.completeStep(5, true)).toBe("done");
    expect(run.current).toBeNull();
    expect(run.results).toHaveLength(DAILY_ROUTINE.steps.length);
  });

  it("treats a single exercise as a one-step routine without rest", () => {
    const run = new RoutineRun(singleExercise(ExerciseMode.ElbowCurl, 8), new FakeClock().read);
    expect(run.isSingle).toBe(true);
    expect(run.completeStep(8, true)).toBe("done");
  });

  it("keeps partial progress when finished early", () => {
    const run = new RoutineRun(DAILY_ROUTINE, new FakeClock().read);
    run.begin();
    run.finish(4);
    expect(run.phase).toBe("done");
    expect(run.results).toEqual([expect.objectContaining({ reps: 4, completed: false })]);
  });

  it("estimates routine length", () => {
    expect(estimatedMinutes(DAILY_ROUTINE)).toBeGreaterThan(3);
  });
});

describe("progress", () => {
  const today = new Date(2026, 10, 4, 18, 0, 0);
  const rec = (day: string, reps: number, exercise = "ARM RAISE"): SessionRecord => ({
    date_time: `${day}T09:00:00`,
    duration_seconds: 60,
    view_mode: "FRONT",
    exercise,
    repetitions: reps,
    posture_observations: "",
  });

  it("formats local timestamps", () => {
    expect(localIso(new Date(2026, 0, 2, 3, 4, 5))).toBe("2026-01-02T03:04:05");
  });

  it("counts a streak ending today or yesterday", () => {
    const history = [rec("2026-11-02", 5), rec("2026-11-03", 5), rec("2026-11-04", 5), rec("2026-10-30", 5)];
    expect(dayStreak(history, today)).toBe(3);
    expect(dayStreak(history.slice(0, 2), today)).toBe(2);
    expect(dayStreak([rec("2026-11-01", 5)], today)).toBe(0);
  });

  it("summarizes the last seven days", () => {
    const history = [rec("2026-11-04", 5), rec("2026-11-04", 7), rec("2026-10-29", 3), rec("2026-10-28", 100)];
    expect(weekSummary(history, today)).toEqual({ activeDays: 2, reps: 15, minutes: 3 });
  });

  it("returns daily totals with empty days filled", () => {
    const points = dailyReps([rec("2026-11-04", 5), rec("2026-11-04", 2), rec("2026-11-03", 9, "MARCHING")], ExerciseMode.ArmRaise, today, 3);
    expect(points).toEqual([
      { day: "2026-11-02", reps: 0 },
      { day: "2026-11-03", reps: 0 },
      { day: "2026-11-04", reps: 7 },
    ]);
  });
});

describe("week views", () => {
  const rec = (day: string, seconds: number, exercise = "ARM RAISE"): SessionRecord => ({
    date_time: `${day}T09:00:00`,
    duration_seconds: seconds,
    view_mode: "FRONT",
    exercise,
    repetitions: 10,
    posture_observations: "",
  });

  it("builds a Monday-to-Sunday week with minutes", async () => {
    const { currentWeek } = await import("./analysis/progress");
    const wednesday = new Date(2026, 10, 4, 18, 0, 0);
    const week = currentWeek([rec("2026-11-02", 300), rec("2026-11-04", 480), rec("2026-11-04", 60)], wednesday);
    expect(week.map((d) => d.key)).toEqual([
      "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07", "2026-11-08",
    ]);
    expect(week.map((d) => d.done)).toEqual([true, false, true, false, false, false, false]);
    expect(week[2]).toMatchObject({ isToday: true, minutes: 9 });
    expect(week[3].isFuture).toBe(true);
  });

  it("groups recent days newest first", async () => {
    const { recentDays } = await import("./analysis/progress");
    const days = recentDays([rec("2026-11-02", 300), rec("2026-11-04", 240), rec("2026-11-04", 240, "MARCHING")]);
    expect(days.map((d) => d.key)).toEqual(["2026-11-04", "2026-11-02"]);
    expect(days[0]).toMatchObject({ minutes: 8, exercises: 2, movements: 20 });
  });
});

import { describe, expect, it } from "vitest";
import * as catalog from "./analysis/findings";
import { Assistant, type RangeRepository, type SessionRepository } from "./assistant";
import type { PersonalRange } from "./analysis/range";
import { POSTURE } from "./config";
import { ExerciseMode, Joint, type SessionRecord, ViewMode } from "./domain/models";
import { getExercise } from "./exercises";
import { EventBus, type EventMap } from "./events";
import { LocalStorageRepository, toCsv } from "./infrastructure/storage";
import { armsAt, body, curled, FakeClock, hold } from "./testing/poses";

class MemoryRepo implements SessionRepository {
  records: SessionRecord[] = [];
  constructor(private readonly fail = false) {}
  loadAll() {
    return [...this.records];
  }
  append(record: SessionRecord) {
    if (this.fail) return false;
    this.records.push(record);
    return true;
  }
  clear() {
    this.records = [];
  }
}

function setup(repo: SessionRepository = new MemoryRepo()) {
  const events = new EventBus();
  const clock = new FakeClock();
  const seen: { type: keyof EventMap; payload: unknown }[] = [];
  for (const type of ["repCounted", "goalReached", "findingChanged", "bodyFound", "bodyLost", "modeChanged"] as const) {
    events.subscribe(type, (payload) => seen.push({ type, payload }));
  }
  const assistant = new Assistant({
    posture: POSTURE,
    events,
    repository: repo,
    clock: clock.read,
    now: () => new Date(2026, 10, 4, 9, 30, 0),
  });
  const of = (type: keyof EventMap) => seen.filter((e) => e.type === type).map((e) => e.payload);
  return { assistant, clock, of, repo, seen };
}

describe("Assistant", () => {
  it("ignores single-frame posture flickers", () => {
    const { assistant, clock, of } = setup();
    const tilted = body({ [Joint.LeftShoulder]: [420, 240] });
    for (let i = 0; i < 10; i++) {
      assistant.process(i % 2 ? tilted : body());
      clock.advance(0.1);
    }
    expect(assistant.frame.findings).toEqual([]);
    expect(of("findingChanged")).toEqual([]);
  });

  it("tolerates brief tracking dropouts and announces a real loss once", () => {
    const { assistant, clock, of } = setup();
    assistant.process(body());
    clock.advance(0.5);
    expect(assistant.process(null).bodyDetected).toBe(true);
    clock.advance(1);
    assistant.process(null);
    assistant.process(null);
    expect(assistant.frame.bodyDetected).toBe(false);
    expect(of("bodyLost")).toHaveLength(1);
  });

  it("announces the body once on arrival and again only after a real loss", () => {
    const { assistant, clock, of } = setup();
    assistant.process(body());
    clock.advance(0.3);
    assistant.process(null);
    assistant.process(body());
    expect(of("bodyFound")).toHaveLength(1);
    clock.advance(2);
    assistant.process(null);
    assistant.process(body());
    expect(of("bodyFound")).toHaveLength(2);
  });

  it("starts in arm raise mode for the quickest first win", () => {
    expect(setup().assistant.mode).toBe(ExerciseMode.ArmRaise);
  });

  it("reports when nobody is in frame", () => {
    const { assistant, of } = setup();
    expect(assistant.process(null).guidance).toEqual([{ kind: "noBody" }]);
    expect(of("bodyLost")).toHaveLength(1);
  });

  it("publishes a new leading finding once until it clears", () => {
    const { assistant, clock, of } = setup();
    const tilted = body({ [Joint.LeftShoulder]: [420, 240] });
    const hold = (points: ReturnType<typeof body>) => {
      assistant.process(points);
      clock.advance(1);
      assistant.process(points);
    };
    hold(tilted);
    hold(tilted);
    hold(body());
    hold(tilted);
    expect(of("findingChanged")).toEqual([{ finding: catalog.SHOULDER_HEIGHT }, { finding: catalog.SHOULDER_HEIGHT }]);
  });

  it("announces the target once, after the final count", () => {
    const { assistant, clock, seen } = setup();
    assistant.setGoal(2);
    for (let i = 0; i < 3; i++) {
      hold((p) => assistant.process(p), armsAt(10), clock, 0.8);
      hold((p) => assistant.process(p), armsAt(100), clock, 0.8);
    }
    expect(assistant.counter.reps).toBe(3);
    const order = seen.filter((e) => e.type === "repCounted" || e.type === "goalReached").map((e) => e.type);
    expect(order).toEqual(["repCounted", "repCounted", "goalReached", "repCounted"]);
  });

  it("matches the camera view each exercise needs and announces the change", () => {
    const { assistant, of } = setup();
    assistant.selectMode(ExerciseMode.SitToStand);
    expect(assistant.view).toBe(getExercise(ExerciseMode.SitToStand).bestView);
    assistant.selectMode(ExerciseMode.Marching);
    expect(assistant.view).toBe(ViewMode.Front);
    expect(of("modeChanged")).toEqual([{ mode: ExerciseMode.SitToStand }, { mode: ExerciseMode.Marching }]);
  });

  it("gives the exercise's own instruction as a code, with posture corrections after it", () => {
    const { assistant, clock } = setup();
    const tilted = body({ [Joint.LeftShoulder]: [420, 240] });
    assistant.process(tilted);
    clock.advance(1);
    const { guidance } = assistant.process(tilted);
    expect(guidance[0]).toEqual({ kind: "exercise", mode: ExerciseMode.ArmRaise });
    expect(guidance[1]).toEqual({ kind: "finding", finding: catalog.SHOULDER_HEIGHT });
  });

  it("saves a finished exercise to the history", () => {
    const { assistant, repo } = setup();
    expect(assistant.logExercise(ExerciseMode.ArmRaise, 10, 45)).toBe(true);
    expect((repo as MemoryRepo).records[0]).toMatchObject({
      date_time: "2026-11-04T09:30:00",
      duration_seconds: 45,
      exercise: "ARM RAISE",
      repetitions: 10,
    });
    expect(assistant.history).toHaveLength(1);
  });

  it("reports a failed save without adding to the history", () => {
    const { assistant } = setup(new MemoryRepo(true));
    expect(assistant.logExercise(ExerciseMode.ArmRaise, 10, 45)).toBe(false);
    expect(assistant.history).toHaveLength(0);
  });
});

describe("storage", () => {
  const record: SessionRecord = {
    date_time: "2026-11-04T09:30:00",
    duration_seconds: 60,
    view_mode: "FRONT",
    exercise: "ARM RAISE",
    repetitions: 7,
    posture_observations: 'Leaning, "a bit"',
  };

  it("round-trips through a storage backend", () => {
    const backing = new Map<string, string>();
    const storage = {
      getItem: (k: string) => backing.get(k) ?? null,
      setItem: (k: string, v: string) => void backing.set(k, v),
      removeItem: (k: string) => void backing.delete(k),
    };
    const repo = new LocalStorageRepository("k", storage);
    expect(repo.append(record)).toBe(true);
    expect(repo.loadAll()).toEqual([record]);
    repo.clear();
    expect(repo.loadAll()).toEqual([]);
  });

  it("fails gracefully with no storage", () => {
    expect(new LocalStorageRepository("k", null).append(record)).toBe(false);
  });

  it("writes CSV with the Python app's columns and escaping", () => {
    expect(toCsv([record])).toBe(
      'date_time,duration_seconds,view_mode,exercise,repetitions,posture_observations\n2026-11-04T09:30:00,60,FRONT,ARM RAISE,7,"Leaning, ""a bit"""\n',
    );
  });
});

describe("personal range", () => {
  class MemoryRanges implements RangeRepository {
    saved = new Map<ExerciseMode, PersonalRange>();
    get(mode: ExerciseMode) {
      return this.saved.get(mode) ?? null;
    }
    set(mode: ExerciseMode, range: PersonalRange) {
      this.saved.set(mode, range);
    }
    clear() {
      this.saved.clear();
    }
  }

  function curlSession(ranges?: RangeRepository) {
    const events = new EventBus();
    const clock = new FakeClock();
    const assistant = new Assistant({
      posture: POSTURE,
      events,
      repository: new MemoryRepo(),
      clock: clock.read,
      ranges,
    });
    assistant.selectMode(ExerciseMode.ElbowCurl);
    assistant.setGoal(10);
    const curls = (times: number) => {
      for (let i = 0; i < times; i++) {
        hold((p) => assistant.process(p), curled(5), clock, 1);
        hold((p) => assistant.process(p), curled(60), clock, 1);
      }
      hold((p) => assistant.process(p), curled(5), clock, 1);
    };
    return { assistant, curls };
  }

  it("misses a limited curl with standard thresholds", () => {
    const { assistant, curls } = curlSession();
    curls(4);
    expect(assistant.counter.reps).toBe(0);
  });

  it("learns the range from the first two curls, counts them, and keeps counting", () => {
    const ranges = new MemoryRanges();
    const { assistant, curls } = curlSession(ranges);
    expect(assistant.rangeStatus).toBe("learning");
    curls(2);
    expect(assistant.rangeStatus).toBe("personal");
    expect(assistant.counter.reps).toBe(2);
    curls(3);
    expect(assistant.counter.reps).toBe(5);
    expect(ranges.saved.get(ExerciseMode.ElbowCurl)).toBeDefined();
  });

  it("uses a saved range from the first curl next time", () => {
    const ranges = new MemoryRanges();
    curlSession(ranges).curls(3);
    const { assistant, curls } = curlSession(ranges);
    expect(assistant.rangeStatus).toBe("personal");
    curls(1);
    expect(assistant.counter.reps).toBe(1);
  });
});

import { describe, expect, it } from "vitest";
import * as catalog from "./analysis/findings";
import { Assistant, type SessionRepository } from "./assistant";
import { EXERCISES, POSTURE } from "./config";
import { ExerciseMode, Joint, type SessionRecord, ViewMode } from "./domain/models";
import { EventBus, type EventMap } from "./events";
import { LocalStorageRepository, toCsv } from "./infrastructure/storage";
import * as msg from "./messages";
import { armsAt, body, FakeClock, hold } from "./testing/poses";

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
  for (const type of ["repCounted", "goalReached", "findingChanged", "bodyLost", "viewChanged", "modeChanged"] as const) {
    events.subscribe(type, (payload) => seen.push({ type, payload }));
  }
  const assistant = new Assistant({
    posture: POSTURE,
    exercises: EXERCISES,
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

  it("starts in arm raise mode for the quickest first win", () => {
    expect(setup().assistant.mode).toBe(ExerciseMode.ArmRaise);
  });

  it("reports when nobody is in frame", () => {
    const { assistant, of } = setup();
    expect(assistant.process(null).guidance).toEqual(msg.GUIDANCE_NO_BODY);
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

  it("publishes semantic events for view and mode changes", () => {
    const { assistant, of } = setup();
    assistant.toggleView();
    expect(assistant.view).toBe(ViewMode.Side);
    expect(of("viewChanged")).toEqual([{ view: ViewMode.Side }]);
    assistant.selectMode(ExerciseMode.Marching);
    expect(of("modeChanged")).toEqual([{ mode: ExerciseMode.Marching }]);
    expect(assistant.view).toBe(ViewMode.Front);
  });

  it("saves a session with paused time excluded", () => {
    const { assistant, clock, repo } = setup();
    assistant.toggleTimer();
    clock.advance(30);
    assistant.toggleTimer();
    clock.advance(100);
    assistant.toggleTimer();
    clock.advance(15);
    expect(assistant.saveSession()).toBe(true);
    expect((repo as MemoryRepo).records[0]).toMatchObject({
      date_time: "2026-11-04T09:30:00",
      duration_seconds: 45,
      exercise: "ARM RAISE",
    });
    expect(assistant.progress.totalSessions).toBe(1);
    expect(assistant.statusMessage).toBe(msg.SAVED);
  });

  it("reports a failed save", () => {
    const { assistant } = setup(new MemoryRepo(true));
    expect(assistant.saveSession()).toBe(false);
    expect(assistant.statusMessage).toBe(msg.SAVE_FAILED);
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

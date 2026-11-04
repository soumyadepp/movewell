import { describe, expect, it } from "vitest";
import { createCounter } from "./analysis/exercises";
import * as catalog from "./analysis/findings";
import { createPostureAnalyzer } from "./analysis/posture";
import { EXERCISES, POSTURE } from "./config";
import { calculateAngle, jointAngle, safeAverage } from "./domain/geometry";
import { BodyPoints, ExerciseMode, Joint, MovementPhase, ViewMode } from "./domain/models";
import { EventBus } from "./events";
import { toBodyPoints } from "./infrastructure/pose";
import { armsAt, body, FakeClock, kneesAt, without } from "./testing/poses";

describe("geometry", () => {
  it.each([
    [[1, 0], [0, 0], [0, 1], 90],
    [[1, 0], [0, 0], [-1, 0], 180],
    [[1, 0], [0, 0], [1, 1], 45],
  ] as const)("angle %j %j %j is %d", (a, b, c, expected) => {
    expect(calculateAngle(a, b, c)).toBeCloseTo(expected);
  });

  it("returns null for a zero-length arm", () => {
    expect(calculateAngle([0, 0], [0, 0], [1, 1])).toBeNull();
  });

  it("averages only finite values", () => {
    expect(safeAverage([10, null, Number.NaN, 20])).toBe(15);
    expect(safeAverage([null])).toBeNull();
  });

  it("measures the constructed arm angle", () => {
    expect(jointAngle(armsAt(60), Joint.LeftElbow, Joint.LeftShoulder, Joint.LeftHip)).toBeCloseTo(60, 0);
  });
});

describe("posture rules", () => {
  const front = (p: BodyPoints) => createPostureAnalyzer(ViewMode.Front, POSTURE).analyze(p);
  const side = (p: BodyPoints) => createPostureAnalyzer(ViewMode.Side, POSTURE).analyze(p);

  it("finds nothing on an upright pose", () => {
    expect(front(body())).toEqual([]);
  });

  it("flags uneven shoulders and hips in rule order", () => {
    const result = front(body({ [Joint.LeftShoulder]: [420, 240], [Joint.LeftHip]: [440, 440] }));
    expect(result.slice(0, 2)).toEqual([catalog.SHOULDER_HEIGHT, catalog.HIP_HEIGHT]);
  });

  it("flags knee drift", () => {
    expect(front(body({ [Joint.LeftKnee]: [380, 530] }))).toContain(catalog.KNEE_ALIGNMENT);
  });

  it("skips rules whose joints are hidden", () => {
    expect(front(without(Joint.RightShoulder, Joint.RightHip, Joint.RightKnee))).toEqual([]);
  });

  it("flags a forward head from either side in side view", () => {
    const sidePose = (ear: [number, number]) =>
      new BodyPoints(new Map([[Joint.RightEar, ear], [Joint.RightShoulder, [500, 200]]]));
    expect(side(sidePose([560, 120]))).toEqual([catalog.HEAD_FORWARD]);
    expect(side(sidePose([440, 120]))).toEqual([catalog.HEAD_FORWARD]);
  });
});

describe("rep counters", () => {
  const setup = (mode: ExerciseMode) => {
    const events = new EventBus();
    const clock = new FakeClock();
    const counted: number[] = [];
    events.subscribe("repCounted", ({ total }) => counted.push(total));
    return { counter: createCounter(mode, EXERCISES, events, clock.read), clock, counted };
  };

  it("counts a full arm raise and publishes it", () => {
    const { counter, clock, counted } = setup(ExerciseMode.ArmRaise);
    counter.update(armsAt(10));
    clock.advance(2);
    counter.update(armsAt(90));
    expect(counter.reps).toBe(1);
    expect(counter.phase).toBe(MovementPhase.High);
    expect(counted).toEqual([1]);
  });

  it("does not count a raise that never started low", () => {
    const { counter, clock } = setup(ExerciseMode.ArmRaise);
    clock.advance(2);
    counter.update(armsAt(90));
    expect(counter.reps).toBe(0);
  });

  it("counts held arms only once", () => {
    const { counter, clock } = setup(ExerciseMode.ArmRaise);
    counter.update(armsAt(10));
    for (let i = 0; i < 5; i++) {
      clock.advance(2);
      counter.update(armsAt(90));
    }
    expect(counter.reps).toBe(1);
  });

  it("defers reps faster than the minimum interval", () => {
    const { counter, clock } = setup(ExerciseMode.ArmRaise);
    counter.update(armsAt(10));
    clock.advance(2);
    counter.update(armsAt(90));
    counter.update(armsAt(10));
    clock.advance(0.3);
    counter.update(armsAt(90));
    expect(counter.reps).toBe(1);
    clock.advance(1);
    counter.update(armsAt(90));
    expect(counter.reps).toBe(2);
  });

  it("counts arm raises when the hips are out of frame", () => {
    const { counter, clock } = setup(ExerciseMode.ArmRaise);
    const cropped = (deg: number) => {
      const full = armsAt(deg);
      const kept = new Map(
        [Joint.LeftShoulder, Joint.RightShoulder, Joint.LeftElbow, Joint.RightElbow].map((j) => [j, full.get(j)!]),
      );
      return new BodyPoints(kept);
    };
    counter.update(cropped(10));
    clock.advance(2);
    counter.update(cropped(120));
    expect(counter.reps).toBe(1);
    expect(counter.lastAngle).toBeCloseTo(120, 0);
  });

  it("counts sit-to-stand cycles", () => {
    const { counter, clock } = setup(ExerciseMode.SitToStand);
    for (let i = 0; i < 3; i++) {
      counter.update(kneesAt(90));
      clock.advance(2);
      counter.update(kneesAt(175));
    }
    expect(counter.reps).toBe(3);
  });
});

describe("landmark conversion", () => {
  it("scales to the reference frame and drops low-visibility joints", () => {
    const landmarks = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 0.9 }));
    landmarks[13] = { x: 0.5, y: 0.5, z: 0, visibility: 0.1 };
    const points = toBodyPoints(landmarks, 0.6);
    expect(points.get(Joint.LeftShoulder)).toEqual([480, 360]);
    expect(points.get(Joint.LeftElbow)).toBeNull();
  });

  it("keeps in-frame joints when the model reports no visibility", () => {
    const landmarks = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 0 }));
    landmarks[13] = { x: 1.4, y: 0.5, z: 0, visibility: 0 };
    const points = toBodyPoints(landmarks, 0.6);
    expect(points.get(Joint.LeftShoulder)).toEqual([480, 360]);
    expect(points.get(Joint.LeftElbow)).toBeNull();
  });
});

describe("speech catalogs", () => {
  it("cover every finding, mode and view in every language", async () => {
    const { SPEECH_CATALOGS } = await import("./i18n/speech");
    const findingIds = Object.values(catalog).map((f) => f.id);
    for (const speech of Object.values(SPEECH_CATALOGS)) {
      for (const id of findingIds) expect(speech.corrections[id]).toBeTruthy();
      for (const mode of Object.values(ExerciseMode)) expect(speech.mode[mode]).toBeTruthy();
      for (const view of Object.values(ViewMode)) expect(speech.view[view]).toBeTruthy();
    }
  });

  it("prefers enhanced voices, then Google voices online, over basic ones", async () => {
    const { pickVoice } = await import("./infrastructure/voice");
    const voice = (name: string, lang: string) => ({ name, lang }) as SpeechSynthesisVoice;
    const installed = [voice("Lekha", "hi-IN"), voice("Google हिन्दी", "hi-IN"), voice("Rishi", "en-IN")];
    expect(pickVoice(installed, "hi-IN", true)?.name).toBe("Google हिन्दी");
    expect(pickVoice(installed, "hi-IN", false)?.name).toBe("Lekha");
    expect(pickVoice([...installed, voice("Lekha (Enhanced)", "hi-IN")], "hi-IN", true)?.name).toBe("Lekha (Enhanced)");
    expect(pickVoice([voice("Lekha", "hi_IN")], "hi-IN")?.name).toBe("Lekha");
    expect(pickVoice([voice("Rishi", "en-IN")], "hi-IN")).toBeNull();
  });
});

describe("new exercises", () => {
  const run = (mode: ExerciseMode, low: BodyPoints, high: BodyPoints) => {
    const events = new EventBus();
    const clock = new FakeClock();
    const counter = createCounter(mode, EXERCISES, events, clock.read);
    for (let i = 0; i < 2; i++) {
      counter.update(low);
      clock.advance(2);
      counter.update(high);
    }
    return counter;
  };

  const withJoints = (overrides: Partial<Record<Joint, readonly [number, number]>>) => body(overrides);

  it("counts elbow curls from either arm", () => {
    const straight = body();
    const curled = withJoints({ [Joint.LeftWrist]: [440, 220] });
    expect(run(ExerciseMode.ElbowCurl, straight, curled).reps).toBe(2);
  });

  it("counts marching knee lifts", () => {
    const standing = body();
    const lifted = withJoints({ [Joint.RightKnee]: [600, 420], [Joint.RightAnkle]: [600, 540] });
    expect(run(ExerciseMode.Marching, standing, lifted).reps).toBe(2);
  });

  it("counts side leg raises", () => {
    const together = body();
    const raised = withJoints({ [Joint.RightAnkle]: [640, 630] });
    expect(run(ExerciseMode.SideLegRaise, together, raised).reps).toBe(2);
  });

  it("counts side bends", () => {
    const upright = body();
    const leaning = withJoints({ [Joint.LeftShoulder]: [360, 215], [Joint.RightShoulder]: [480, 190] });
    expect(run(ExerciseMode.SideBend, upright, leaning).reps).toBe(2);
  });

  it("has thresholds, copy and spoken phrases for every counted exercise", async () => {
    const { EXERCISE_COPY } = await import("./messages");
    const { COUNTED_EXERCISES } = await import("./domain/models");
    const { SPEECH_CATALOGS } = await import("./i18n/speech");
    for (const mode of COUNTED_EXERCISES) {
      expect(EXERCISES[mode].highDeg).toBeGreaterThan(EXERCISES[mode].lowDeg);
      expect(EXERCISE_COPY[mode].label).toBeTruthy();
      for (const speech of Object.values(SPEECH_CATALOGS)) expect(speech.mode[mode]).toBeTruthy();
    }
  });
});

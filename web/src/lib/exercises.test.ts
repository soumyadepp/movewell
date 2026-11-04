import { describe, expect, it } from "vitest";
import { createCounter, type ExerciseCounter } from "./analysis/exercises";
import { EXERCISES } from "./config";
import { BodyPoints, COUNTED_EXERCISES, ExerciseMode, Joint, MovementPhase, type Point3 } from "./domain/models";
import { EventBus } from "./events";
import * as msg from "./messages";
import {
  armsAt,
  body,
  curled,
  FakeClock,
  hold,
  kneeLifted,
  leaning,
  legsOut,
  oneArmUp,
  sideBody,
  sideKneesAt,
} from "./testing/poses";

function setup(mode: ExerciseMode) {
  const events = new EventBus();
  const clock = new FakeClock();
  const counted: number[] = [];
  events.subscribe("repCounted", ({ total }) => counted.push(total));
  const counter = createCounter(mode, EXERCISES, events, clock.read);
  const holdPose = (points: BodyPoints, seconds = 0.5) => hold((p) => counter.update(p), points, clock, seconds);
  const reps = (low: BodyPoints, high: BodyPoints, cycles = 1) => {
    for (let i = 0; i < cycles; i++) {
      holdPose(low, 0.8);
      holdPose(high, 0.8);
    }
    return counter.reps;
  };
  return { counter, clock, counted, holdPose, reps };
}

describe("rep counting state machine", () => {
  it("counts a held low-to-high movement and publishes it", () => {
    const { counter, counted, reps } = setup(ExerciseMode.ArmRaise);
    expect(reps(armsAt(10), armsAt(100))).toBe(1);
    expect(counter.phase).toBe(MovementPhase.High);
    expect(counted).toEqual([1]);
  });

  it("ignores a single-frame spike past the high threshold", () => {
    const { counter, holdPose } = setup(ExerciseMode.ArmRaise);
    holdPose(armsAt(10), 1);
    counter.update(armsAt(120));
    holdPose(armsAt(10), 1);
    expect(counter.reps).toBe(0);
  });

  it("does not count a movement that never started low", () => {
    const { holdPose, counter } = setup(ExerciseMode.ArmRaise);
    holdPose(armsAt(100), 2);
    expect(counter.reps).toBe(0);
  });

  it("counts a held position only once", () => {
    const { holdPose, counter } = setup(ExerciseMode.ArmRaise);
    holdPose(armsAt(10));
    holdPose(armsAt(100), 5);
    expect(counter.reps).toBe(1);
  });

  it("does not count movement inside the hysteresis band", () => {
    const { reps } = setup(ExerciseMode.ArmRaise);
    expect(reps(armsAt(45), armsAt(65), 3)).toBe(0);
  });
});

describe("shoulder raise", () => {
  it("counts both arms rising, even with hips out of frame", () => {
    const { reps } = setup(ExerciseMode.ArmRaise);
    const cropped = (deg: number) => {
      const full = armsAt(deg);
      return new BodyPoints(
        new Map([Joint.LeftShoulder, Joint.RightShoulder, Joint.LeftElbow, Joint.RightElbow].map((j) => [j, full.get(j)!])),
      );
    };
    expect(reps(cropped(10), cropped(110), 2)).toBe(2);
  });

  it("does not count one arm waving", () => {
    const { reps } = setup(ExerciseMode.ArmRaise);
    expect(reps(armsAt(10), oneArmUp(170), 3)).toBe(0);
  });
});

describe("elbow curl", () => {
  it("counts curls with the upper arm by the side", () => {
    const { reps } = setup(ExerciseMode.ElbowCurl);
    expect(reps(curled(5), curled(130), 2)).toBe(2);
  });

  it("does not count a bent arm raised away from the body", () => {
    const { reps } = setup(ExerciseMode.ElbowCurl);
    const raisedBent = body({ [Joint.LeftElbow]: [330, 200], [Joint.LeftWrist]: [330, 120] });
    expect(reps(curled(5), raisedBent, 3)).toBe(0);
  });
});

describe("marching", () => {
  it("counts knee lifts when side-on", () => {
    const { reps } = setup(ExerciseMode.Marching);
    expect(reps(kneeLifted(0), kneeLifted(70), 3)).toBe(3);
  });

  it("does not count leaning the trunk forward", () => {
    const { reps } = setup(ExerciseMode.Marching);
    const lean = sideBody({ [Joint.LeftShoulder]: [580, 230], [Joint.RightShoulder]: [590, 230] });
    expect(reps(kneeLifted(0), lean, 3)).toBe(0);
  });

  it("does not count sitting down", () => {
    const { reps } = setup(ExerciseMode.Marching);
    expect(reps(kneeLifted(0), sideKneesAt(90), 2)).toBe(0);
  });

  it("asks to turn side-on when facing the camera", () => {
    const { counter, holdPose } = setup(ExerciseMode.Marching);
    holdPose(body());
    expect(counter.update(body())).toBe(msg.GUIDANCE_TURN_SIDE);
    expect(counter.lastAngle).toBeNull();
  });
});

describe("side leg raise", () => {
  it("counts one leg lifting while the other stays straight", () => {
    const { reps } = setup(ExerciseMode.SideLegRaise);
    expect(reps(legsOut(0), legsOut(30), 2)).toBe(2);
  });

  it("does not count a wide stance or a step to the side", () => {
    const { reps } = setup(ExerciseMode.SideLegRaise);
    expect(reps(legsOut(0), legsOut(30, 25), 3)).toBe(0);
  });
});

describe("side bend", () => {
  it("counts a lean and return", () => {
    const { reps } = setup(ExerciseMode.SideBend);
    expect(reps(leaning(0), leaning(25), 2)).toBe(2);
  });

  it("does not count normal sway", () => {
    const { reps } = setup(ExerciseMode.SideBend);
    expect(reps(leaning(0), leaning(12), 4)).toBe(0);
  });

  it("asks to face the camera when side-on", () => {
    const { counter } = setup(ExerciseMode.SideBend);
    expect(counter.update(sideBody())).toBe(msg.GUIDANCE_TURN_FRONT);
  });
});

describe("sit-to-stand", () => {
  it("counts each stand from a seat when side-on", () => {
    const { reps } = setup(ExerciseMode.SitToStand);
    expect(reps(sideKneesAt(90), sideKneesAt(175), 3)).toBe(3);
  });
});

describe("registry", () => {
  it("has thresholds, copy and spoken phrases for every counted exercise", async () => {
    const { SPEECH_CATALOGS } = await import("./i18n/speech");
    for (const mode of COUNTED_EXERCISES) {
      expect(EXERCISES[mode].highDeg).toBeGreaterThan(EXERCISES[mode].lowDeg);
      expect(msg.EXERCISE_COPY[mode].label).toBeTruthy();
      for (const speech of Object.values(SPEECH_CATALOGS)) expect(speech.mode[mode]).toBeTruthy();
    }
  });

  it("posture mode never counts", () => {
    const counter: ExerciseCounter = createCounter(ExerciseMode.Posture, EXERCISES, new EventBus(), () => 0);
    expect(counter.update(armsAt(100))).toBe(msg.GUIDANCE_POSTURE_MODE);
    expect(counter.reps).toBe(0);
  });
});

describe("measurement fidelity", () => {
  it("keeps true proportions on 16:9 cameras", async () => {
    const { toBodyPoints } = await import("./infrastructure/pose");
    const landmarks = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 0.9 }));
    landmarks[11] = { x: 0.25, y: 0.5, z: 0, visibility: 0.9 };
    const wide = toBodyPoints(landmarks, 0.6, 16 / 9);
    expect(wide.get(Joint.LeftShoulder)).toEqual([0.25 * 720 * (16 / 9), 360]);
  });

  it("measures an elbow curl toward the camera using 3-D landmarks", () => {
    const { reps } = setup(ExerciseMode.ElbowCurl);
    const flat = body();
    const world = (bentTowardCamera: boolean) =>
      new BodyPoints(
        new Map([...[Joint.LeftShoulder, Joint.RightShoulder, Joint.LeftElbow, Joint.LeftWrist, Joint.LeftHip, Joint.RightHip].map((j) => [j, flat.get(j)!] as const)]),
        new Map<Joint, Point3>([
          [Joint.LeftShoulder, [-0.18, -0.45, 0]],
          [Joint.LeftElbow, [-0.2, -0.17, 0]],
          [Joint.LeftWrist, bentTowardCamera ? [-0.2, -0.2, -0.26] : [-0.2, 0.08, 0]],
        ]),
      );
    expect(reps(world(false), world(true), 2)).toBe(2);
  });
});

describe("elbow curl sensitivity", () => {
  it("counts a quick partial curl that only briefly passes the top", () => {
    const { counter, clock, holdPose } = setup(ExerciseMode.ElbowCurl);
    for (let i = 0; i < 3; i++) {
      holdPose(curled(10), 0.6);
      for (const deg of [40, 70, 85, 90, 85, 70, 40]) {
        counter.update(curled(deg));
        clock.advance(1 / 20);
      }
    }
    expect(counter.reps).toBe(3);
  });
});

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

  it("counts knee lifts facing the camera using 3-D landmarks", () => {
    const { reps } = setup(ExerciseMode.Marching);
    const facing = (liftRight: boolean) =>
      new BodyPoints(
        new Map([...[Joint.LeftShoulder, Joint.RightShoulder, Joint.LeftHip, Joint.RightHip, Joint.LeftKnee, Joint.RightKnee].map((j) => [j, body().get(j)!] as const)]),
        new Map<Joint, Point3>([
          [Joint.LeftShoulder, [-0.18, -0.5, 0]],
          [Joint.RightShoulder, [0.18, -0.5, 0]],
          [Joint.LeftHip, [-0.1, 0, 0]],
          [Joint.RightHip, [0.1, 0, 0]],
          [Joint.LeftKnee, [-0.1, 0.45, 0]],
          [Joint.RightKnee, liftRight ? [0.1, 0.1, -0.4] : [0.1, 0.45, 0]],
        ]),
      );
    expect(reps(facing(false), facing(true), 3)).toBe(3);
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
    const { counter, holdPose } = setup(ExerciseMode.SideBend);
    holdPose(sideBody(), 1);
    expect(counter.update(sideBody())).toBe(msg.GUIDANCE_TURN_FRONT);
  });
});

describe("sit-to-stand", () => {
  const seatedSide = (withAnkles = true) => {
    const points = new Map<Joint, readonly [number, number]>([
      [Joint.LeftShoulder, [470, 230]],
      [Joint.RightShoulder, [478, 230]],
      [Joint.LeftHip, [480, 430]],
      [Joint.RightHip, [488, 430]],
      [Joint.LeftKnee, [610, 432]],
      [Joint.RightKnee, [618, 432]],
    ]);
    if (withAnkles) {
      points.set(Joint.LeftAnkle, [612, 560]);
      points.set(Joint.RightAnkle, [620, 560]);
    }
    return new BodyPoints(points);
  };
  const standingSide = (withAnkles = true) => {
    const full = sideBody();
    const joints = [Joint.LeftShoulder, Joint.RightShoulder, Joint.LeftHip, Joint.RightHip, Joint.LeftKnee, Joint.RightKnee];
    if (withAnkles) joints.push(Joint.LeftAnkle, Joint.RightAnkle);
    return new BodyPoints(new Map(joints.map((j) => [j, full.get(j)!] as const)));
  };

  it("counts each stand from a seat when side-on", () => {
    const { reps } = setup(ExerciseMode.SitToStand);
    expect(reps(seatedSide(), standingSide(), 3)).toBe(3);
  });

  it("counts when the ankles are hidden", () => {
    const { reps } = setup(ExerciseMode.SitToStand);
    expect(reps(seatedSide(false), standingSide(false), 2)).toBe(2);
  });

  it("counts facing the camera using 3-D landmarks", () => {
    const { reps } = setup(ExerciseMode.SitToStand);
    const facing = (seated: boolean) =>
      new BodyPoints(
        new Map([...[Joint.LeftShoulder, Joint.RightShoulder, Joint.LeftHip, Joint.RightHip, Joint.LeftKnee, Joint.RightKnee].map((j) => [j, body().get(j)!] as const)]),
        new Map<Joint, Point3>([
          [Joint.LeftShoulder, [-0.18, -0.5, 0]],
          [Joint.RightShoulder, [0.18, -0.5, 0]],
          [Joint.LeftHip, [-0.1, 0, 0]],
          [Joint.RightHip, [0.1, 0, 0]],
          [Joint.LeftKnee, seated ? [-0.1, 0, -0.45] : [-0.1, 0.45, 0]],
          [Joint.RightKnee, seated ? [0.1, 0, -0.45] : [0.1, 0.45, 0]],
        ]),
      );
    expect(reps(facing(true), facing(false), 3)).toBe(3);
  });

  it("does not count leaning forward while seated", () => {
    const { reps } = setup(ExerciseMode.SitToStand);
    const leanForward = new BodyPoints(
      new Map([
        ...[...[Joint.LeftHip, Joint.RightHip, Joint.LeftKnee, Joint.RightKnee, Joint.LeftAnkle, Joint.RightAnkle]].map(
          (j) => [j, seatedSide().get(j)!] as const,
        ),
        [Joint.LeftShoulder, [560, 300] as const],
        [Joint.RightShoulder, [568, 300] as const],
      ]),
    );
    expect(reps(seatedSide(), leanForward, 3)).toBe(0);
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

describe("tracking dropouts", () => {
  const dropWrists = (points: BodyPoints) => {
    const kept = new Map<Joint, readonly [number, number]>();
    for (const joint of Object.values(Joint)) {
      const p = points.get(joint);
      if (p && joint !== Joint.LeftWrist && joint !== Joint.RightWrist) kept.set(joint, p);
    }
    return new BodyPoints(kept);
  };

  it("keeps counting when joints drop out every few frames", () => {
    const { counter, clock } = setup(ExerciseMode.ElbowCurl);
    let frame = 0;
    const flicker = (points: BodyPoints, seconds: number) => {
      for (let t = 0; t < seconds; t += 1 / 30) {
        counter.update(frame++ % 3 === 2 ? dropWrists(points) : points);
        clock.advance(1 / 30);
      }
    };
    for (let i = 0; i < 3; i++) {
      flicker(curled(5), 0.8);
      flicker(curled(110), 0.8);
    }
    expect(counter.reps).toBe(3);
  });

  it("still reports a sustained loss of the needed joints", () => {
    const { counter, holdPose } = setup(ExerciseMode.ElbowCurl);
    holdPose(curled(5));
    holdPose(dropWrists(curled(5)), 1);
    expect(counter.update(dropWrists(curled(5)))).toBe(msg.EXERCISE_COPY[ExerciseMode.ElbowCurl].notVisible);
  });
});

describe("form checks never fake a zero reading", () => {
  it("counts a curl whose elbow briefly drifts out at the top", () => {
    const { counter, clock, holdPose } = setup(ExerciseMode.ElbowCurl);
    const driftedTop = body({ [Joint.LeftElbow]: [340, 250], [Joint.LeftWrist]: [380, 190] });
    for (let i = 0; i < 3; i++) {
      holdPose(curled(5), 0.6);
      for (const pose of [curled(60), curled(100), curled(110), driftedTop, driftedTop, curled(110), curled(60)]) {
        counter.update(pose);
        clock.advance(1 / 20);
      }
    }
    expect(counter.reps).toBe(3);
  });
});

/** Synthetic poses in reference-frame pixels for tests. */
import { BodyPoints, Joint, type Point } from "../domain/models";

export function uprightFront(): Map<Joint, Point> {
  return new Map<Joint, Point>([
    [Joint.Nose, [480, 120]],
    [Joint.LeftEar, [460, 120]],
    [Joint.RightEar, [500, 120]],
    [Joint.LeftShoulder, [420, 200]],
    [Joint.RightShoulder, [540, 200]],
    [Joint.LeftElbow, [410, 290]],
    [Joint.RightElbow, [550, 290]],
    [Joint.LeftWrist, [405, 370]],
    [Joint.RightWrist, [555, 370]],
    [Joint.LeftHip, [440, 400]],
    [Joint.RightHip, [520, 400]],
    [Joint.LeftKnee, [440, 530]],
    [Joint.RightKnee, [520, 530]],
    [Joint.LeftAnkle, [440, 660]],
    [Joint.RightAnkle, [520, 660]],
  ]);
}

export function body(overrides: Partial<Record<Joint, Point>> = {}): BodyPoints {
  const points = uprightFront();
  for (const [joint, point] of Object.entries(overrides) as [Joint, Point][]) points.set(joint, point);
  return new BodyPoints(points);
}

export function without(...joints: Joint[]): BodyPoints {
  const points = uprightFront();
  for (const joint of joints) points.delete(joint);
  return new BodyPoints(points);
}

export function armsAt(angleDeg: number): BodyPoints {
  const points = uprightFront();
  const rad = (angleDeg * Math.PI) / 180;
  const sides: [Joint, Joint, Joint, number][] = [
    [Joint.LeftShoulder, Joint.LeftElbow, Joint.LeftHip, -1],
    [Joint.RightShoulder, Joint.RightElbow, Joint.RightHip, 1],
  ];
  for (const [shoulder, elbow, hip, sign] of sides) {
    const [sx, sy] = points.get(shoulder)!;
    points.set(hip, [sx, sy + 200]);
    points.set(elbow, [sx + sign * 90 * Math.sin(rad), sy + 90 * Math.cos(rad)]);
  }
  return new BodyPoints(points);
}

export function kneesAt(angleDeg: number): BodyPoints {
  const points = uprightFront();
  const rad = ((180 - angleDeg) * Math.PI) / 180;
  const sides: [Joint, Joint, Joint][] = [
    [Joint.LeftHip, Joint.LeftKnee, Joint.LeftAnkle],
    [Joint.RightHip, Joint.RightKnee, Joint.RightAnkle],
  ];
  for (const [hip, knee, ankle] of sides) {
    const [kx, ky] = points.get(knee)!;
    points.set(hip, [kx, ky - 130]);
    points.set(ankle, [kx + 130 * Math.sin(rad), ky + 130 * Math.cos(rad)]);
  }
  return new BodyPoints(points);
}

export class FakeClock {
  now = 1000;
  readonly read = () => this.now;
  advance(seconds: number) {
    this.now += seconds;
  }
}

/** Simulates a pose held still for `seconds` at 30 frames per second. */
export function hold(update: (points: BodyPoints) => unknown, points: BodyPoints, clock: FakeClock, seconds = 0.5) {
  for (let t = 0; t < seconds; t += 1 / 30) {
    update(points);
    clock.advance(1 / 30);
  }
}

const rad = (deg: number) => (deg * Math.PI) / 180;

/** A person standing side-on to the camera, facing right. */
export function sideStanding(): Map<Joint, Point> {
  return new Map<Joint, Point>([
    [Joint.LeftEar, [486, 120]],
    [Joint.RightEar, [486, 120]],
    [Joint.LeftShoulder, [480, 200]],
    [Joint.RightShoulder, [490, 200]],
    [Joint.LeftElbow, [480, 290]],
    [Joint.RightElbow, [490, 290]],
    [Joint.LeftWrist, [482, 370]],
    [Joint.RightWrist, [492, 370]],
    [Joint.LeftHip, [480, 400]],
    [Joint.RightHip, [490, 400]],
    [Joint.LeftKnee, [480, 530]],
    [Joint.RightKnee, [490, 530]],
    [Joint.LeftAnkle, [480, 660]],
    [Joint.RightAnkle, [490, 660]],
  ]);
}

export function sideBody(overrides: Partial<Record<Joint, Point>> = {}): BodyPoints {
  const points = sideStanding();
  for (const [joint, point] of Object.entries(overrides) as [Joint, Point][]) points.set(joint, point);
  return new BodyPoints(points);
}

/** Side-on pose with the right thigh lifted `deg` degrees from vertical. */
export function kneeLifted(deg: number): BodyPoints {
  const [hx, hy] = [490, 400];
  const knee: Point = [hx + 130 * Math.sin(rad(deg)), hy + 130 * Math.cos(rad(deg))];
  return sideBody({ [Joint.RightKnee]: knee, [Joint.RightAnkle]: [knee[0], knee[1] + 130] });
}

/** Side-on pose with both knees at `deg` (90 seated, 180 standing). */
export function sideKneesAt(deg: number): BodyPoints {
  const points = sideStanding();
  const r = rad(180 - deg);
  for (const [hip, knee, ankle] of [
    [Joint.LeftHip, Joint.LeftKnee, Joint.LeftAnkle],
    [Joint.RightHip, Joint.RightKnee, Joint.RightAnkle],
  ] as const) {
    const [kx, ky] = points.get(knee)!;
    points.set(hip, [kx, ky - 130]);
    points.set(ankle, [kx + 130 * Math.sin(r), ky + 130 * Math.cos(r)]);
  }
  return new BodyPoints(points);
}

/** Front pose with the right leg abducted `deg` degrees and the left leg at `standDeg`. */
export function legsOut(deg: number, standDeg = 0): BodyPoints {
  const leg = (hx: number, sign: number, d: number): [Point, Point] => [
    [hx + sign * 130 * Math.sin(rad(d)), 400 + 130 * Math.cos(rad(d))],
    [hx + sign * 260 * Math.sin(rad(d)), 400 + 260 * Math.cos(rad(d))],
  ];
  const [rk, ra] = leg(520, 1, deg);
  const [lk, la] = leg(440, -1, standDeg);
  return body({ [Joint.RightKnee]: rk, [Joint.RightAnkle]: ra, [Joint.LeftKnee]: lk, [Joint.LeftAnkle]: la });
}

/** Front pose with the trunk leaning `deg` degrees sideways about the hips. */
export function leaning(deg: number): BodyPoints {
  const [cx, cy] = [480, 400 - 200 * Math.cos(rad(deg))];
  const mx = 480 + 200 * Math.sin(rad(deg));
  return body({ [Joint.LeftShoulder]: [mx - 60, cy], [Joint.RightShoulder]: [mx + 60, cy] });
}

/** Front pose with the left elbow flexed `deg` degrees and the upper arm by the side. */
export function curled(deg: number): BodyPoints {
  return body({ [Joint.LeftWrist]: [410 + 80 * Math.sin(rad(deg)), 290 + 80 * Math.cos(rad(deg))] });
}

/** Front pose with only the left arm raised to `deg`, the right arm down. */
export function oneArmUp(deg: number): BodyPoints {
  const both = armsAt(deg);
  const down = armsAt(5);
  return new BodyPoints(
    new Map([...uprightFront()].map(([j, p]) => {
      if (j === Joint.LeftElbow || j === Joint.LeftHip) return [j, both.get(j)!];
      if (j === Joint.RightElbow || j === Joint.RightHip) return [j, down.get(j)!];
      return [j, p];
    })),
  );
}

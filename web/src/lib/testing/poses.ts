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

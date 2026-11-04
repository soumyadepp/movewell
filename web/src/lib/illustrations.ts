/**
 * Stick-figure building blocks for exercise demos, in a 120 x 150 viewBox.
 * Each exercise module defines its own start and end pose from these bases;
 * the Pictogram component eases between them.
 */

export type FigureJoint =
  | "head"
  | "lShoulder"
  | "rShoulder"
  | "lElbow"
  | "rElbow"
  | "lWrist"
  | "rWrist"
  | "lHip"
  | "rHip"
  | "lKnee"
  | "rKnee"
  | "lAnkle"
  | "rAnkle";

export type FigurePose = Record<FigureJoint, [number, number]>;

export interface Illustration {
  start: FigurePose;
  end: FigurePose;
  chair?: boolean;
}

export const FRONT_POSE: FigurePose = {
  head: [60, 20],
  lShoulder: [47, 40],
  rShoulder: [73, 40],
  lElbow: [44, 64],
  rElbow: [76, 64],
  lWrist: [43, 86],
  rWrist: [77, 86],
  lHip: [52, 86],
  rHip: [68, 86],
  lKnee: [52, 114],
  rKnee: [68, 114],
  lAnkle: [52, 142],
  rAnkle: [68, 142],
};

export const SIDE_POSE: FigurePose = {
  head: [60, 20],
  lShoulder: [60, 40],
  rShoulder: [60, 40],
  lElbow: [60, 64],
  rElbow: [61, 64],
  lWrist: [62, 86],
  rWrist: [63, 86],
  lHip: [60, 86],
  rHip: [60, 86],
  lKnee: [60, 114],
  rKnee: [61, 114],
  lAnkle: [60, 142],
  rAnkle: [61, 142],
};

export const pose = (base: FigurePose, overrides: Partial<FigurePose>): FigurePose => ({ ...base, ...overrides });

/** Rotates the upper body about the hip midpoint to show a side bend. */
export function leanUpperBody(base: FigurePose, degrees: number): FigurePose {
  const [px, py] = [(base.lHip[0] + base.rHip[0]) / 2, (base.lHip[1] + base.rHip[1]) / 2];
  const rad = (degrees * Math.PI) / 180;
  const rotate = ([x, y]: [number, number]): [number, number] => [
    px + (x - px) * Math.cos(rad) - (y - py) * Math.sin(rad),
    py + (x - px) * Math.sin(rad) + (y - py) * Math.cos(rad),
  ];
  const upper: FigureJoint[] = ["head", "lShoulder", "rShoulder", "lElbow", "rElbow", "lWrist", "rWrist"];
  return { ...base, ...Object.fromEntries(upper.map((j) => [j, rotate(base[j])])) } as FigurePose;
}

export const POSTURE_ILLUSTRATION: Illustration = { start: FRONT_POSE, end: FRONT_POSE };

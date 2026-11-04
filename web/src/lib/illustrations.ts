/**
 * Stick-figure poses for the exercise demos, in a 120 x 150 viewBox.
 * Each exercise has a start and end pose; the Pictogram component eases
 * between them.
 */
import { type CountedExercise, ExerciseMode } from "./domain/models";

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

const front: FigurePose = {
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

const side: FigurePose = {
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

const pose = (base: FigurePose, overrides: Partial<FigurePose>): FigurePose => ({ ...base, ...overrides });

/** Rotates the upper body about the hip midpoint to show a side bend. */
function leanUpperBody(base: FigurePose, degrees: number): FigurePose {
  const [px, py] = [(base.lHip[0] + base.rHip[0]) / 2, (base.lHip[1] + base.rHip[1]) / 2];
  const rad = (degrees * Math.PI) / 180;
  const rotate = ([x, y]: [number, number]): [number, number] => [
    px + (x - px) * Math.cos(rad) - (y - py) * Math.sin(rad),
    py + (x - px) * Math.sin(rad) + (y - py) * Math.cos(rad),
  ];
  const upper: FigureJoint[] = ["head", "lShoulder", "rShoulder", "lElbow", "rElbow", "lWrist", "rWrist"];
  return { ...base, ...Object.fromEntries(upper.map((j) => [j, rotate(base[j])])) } as FigurePose;
}

export const ILLUSTRATIONS: Record<CountedExercise, Illustration> = {
  [ExerciseMode.ArmRaise]: {
    start: front,
    end: pose(front, { lElbow: [24, 40], rElbow: [96, 40], lWrist: [4, 40], rWrist: [116, 40] }),
  },
  [ExerciseMode.ElbowCurl]: {
    start: front,
    end: pose(front, { lWrist: [47, 44], rWrist: [73, 44] }),
  },
  [ExerciseMode.Marching]: {
    start: side,
    end: pose(side, { rKnee: [84, 88], rAnkle: [84, 116], lElbow: [52, 62], lWrist: [56, 80] }),
  },
  [ExerciseMode.SideLegRaise]: {
    start: front,
    end: pose(front, { rKnee: [78, 112], rAnkle: [88, 138] }),
  },
  [ExerciseMode.SideBend]: {
    start: front,
    end: pose(leanUpperBody(front, -16), {}),
  },
  [ExerciseMode.SitToStand]: {
    chair: true,
    start: pose(side, {
      head: [70, 50],
      lShoulder: [66, 70],
      rShoulder: [66, 70],
      lElbow: [74, 88],
      rElbow: [75, 88],
      lWrist: [86, 92],
      rWrist: [87, 92],
      lHip: [52, 104],
      rHip: [52, 104],
      lKnee: [80, 106],
      rKnee: [81, 106],
      lAnkle: [80, 142],
      rAnkle: [81, 142],
    }),
    end: pose(side, {
      head: [64, 20],
      lShoulder: [62, 40],
      rShoulder: [62, 40],
      lElbow: [62, 64],
      rElbow: [63, 64],
      lWrist: [64, 86],
      rWrist: [65, 86],
      lHip: [62, 86],
      rHip: [62, 86],
      lKnee: [66, 114],
      rKnee: [67, 114],
      lAnkle: [68, 142],
      rAnkle: [69, 142],
    }),
  },
};

export const POSTURE_ILLUSTRATION: Illustration = { start: front, end: front };

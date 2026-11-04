/** Shoulder raise: both arms lift out to the side and lower again. */
import { ExerciseMode, Joint, ViewMode } from "../domain/models";
import { FRONT_POSE, pose } from "../illustrations";
import { blocked, orientationBlock, shoulderAngle } from "./measures";
import type { Exercise } from "./types";

export const armRaise: Exercise = {
  mode: ExerciseMode.ArmRaise,
  bestView: ViewMode.Front,
  photo: "arm-raise.webp",
  thresholds: { lowDeg: 35, highDeg: 75, minIntervalS: 1.0 },
  copy: {
    label: "Shoulder raise",
    summary: "Lifts both arms out to the side to keep shoulders mobile.",
    steps: [
      "Stand tall with arms relaxed by your sides.",
      "Raise both arms out to the side to shoulder height.",
      "Lower them slowly and repeat.",
    ],
    benefit: "Shoulder mobility for reaching and dressing.",
    safety: "Stop below any point of shoulder pain.",
    guidance: "Raise both arms out to the side slowly, then lower them.",
    notVisible: "Show both shoulders and elbows to the camera.",
    low: "Arms down",
    high: "Arms raised",
    angleLabel: "Shoulder angle",
  },
  announcement: {
    en: "Shoulder raise selected. Raise your arms slowly.",
    hi: "कंधा उठाने का व्यायाम चुना गया। बाँहें धीरे-धीरे उठाइए।",
  },
  illustration: {
    start: FRONT_POSE,
    end: pose(FRONT_POSE, { lElbow: [24, 40], rElbow: [96, 40], lWrist: [4, 40], rWrist: [116, 40] }),
  },

  /** Smaller of the two shoulder angles: both arms must rise; one arm waving stays low. */
  measure(p) {
    const orientation = orientationBlock(p, this.bestView);
    if (orientation) return blocked(orientation);
    const left = shoulderAngle(p, Joint.LeftElbow, Joint.LeftShoulder, Joint.LeftHip);
    const right = shoulderAngle(p, Joint.RightElbow, Joint.RightShoulder, Joint.RightHip);
    if (left === null || right === null) return blocked("not_visible");
    return { angle: Math.min(left, right) };
  },
};

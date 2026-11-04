/** Side bend: the trunk leans gently to one side and returns upright. */
import { calculateAngle, midpoint } from "../domain/geometry";
import { ExerciseMode, Joint, ViewMode } from "../domain/models";
import { FRONT_POSE, leanUpperBody } from "../illustrations";
import { above, blocked, orientationBlock, reading } from "./measures";
import type { Exercise } from "./types";

export const sideBend: Exercise = {
  mode: ExerciseMode.SideBend,
  bestView: ViewMode.Front,
  photo: "side-bend.webp",
  thresholds: { lowDeg: 6, highDeg: 18, minIntervalS: 1.2 },
  copy: {
    label: "Side bend",
    summary: "Leans gently to one side to stretch the waist.",
    steps: [
      "Stand tall with feet hip-width apart and one hand on your hip.",
      "Reach the other arm over your head and lean gently to the side.",
      "Come back upright and repeat on the other side.",
    ],
    benefit: "Flexibility in the trunk and lower back.",
    safety: "Bend only as far as is comfortable; do not twist.",
    guidance: "Reach one arm over your head and lean gently to the side, then come back upright.",
    notVisible: "Face the camera so it can see your shoulders and hips.",
    low: "Upright",
    high: "Leaning",
    angleLabel: "Trunk lean",
  },
  announcement: {
    en: "Side bend selected. Lean gently to one side, then return.",
    hi: "बगल में झुकने का व्यायाम चुना गया। धीरे से एक ओर झुकिए, फिर सीधे होइए।",
  },
  illustration: {
    start: FRONT_POSE,
    end: leanUpperBody(FRONT_POSE, -16),
  },

  /** Angle of the hip-midpoint-to-shoulder-midpoint line away from vertical. */
  measure(p) {
    const orientation = orientationBlock(p, this.bestView);
    if (orientation) return blocked(orientation);
    const shoulders = midpoint(p.get(Joint.LeftShoulder), p.get(Joint.RightShoulder));
    const hips = midpoint(p.get(Joint.LeftHip), p.get(Joint.RightHip));
    if (!shoulders || !hips) return blocked("not_visible");
    return reading(calculateAngle(shoulders, hips, above(hips)));
  },
};

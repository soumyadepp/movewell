/** Side leg raise: one leg lifts out to the side while holding a chair. */
import { type BodyPoints, ExerciseMode, Joint, ViewMode } from "../domain/models";
import { FRONT_POSE, pose } from "../illustrations";
import { blocked, fromVertical, orientationBlock, STANDING_LEG_MAX_DEG } from "./measures";
import type { Exercise } from "./types";

const legAngle = (p: BodyPoints, hip: Joint, ankle: Joint, knee: Joint) =>
  fromVertical(p.get(hip), p.get(ankle) ?? p.get(knee));

export const sideLegRaise: Exercise = {
  mode: ExerciseMode.SideLegRaise,
  bestView: ViewMode.Front,
  photo: "side-leg-raise.webp",
  thresholds: { lowDeg: 8, highDeg: 22, minIntervalS: 1.0 },
  copy: {
    label: "Side leg raise",
    summary: "Lifts one leg out to the side while holding a chair.",
    steps: [
      "Face the camera and hold the back of a sturdy chair.",
      "Keep your back straight and lift one leg out to the side.",
      "Lower it slowly and switch legs.",
    ],
    benefit: "Hip strength that supports balance and helps prevent falls.",
    safety: "Keep the movement small and controlled.",
    guidance: "Hold a chair, keep your back straight and lift one leg out to the side.",
    notVisible: "Face the camera so it can see your hips and ankles.",
    low: "Feet together",
    high: "Leg raised",
    angleLabel: "Leg angle",
  },
  announcement: {
    en: "Side leg raise selected. Hold a chair for support.",
    hi: "पैर बगल में उठाने का व्यायाम चुना गया। सहारे के लिए कुर्सी पकड़िए।",
  },
  illustration: {
    start: FRONT_POSE,
    end: pose(FRONT_POSE, { rKnee: [78, 112], rAnkle: [88, 138] }),
  },

  /** Raised leg's angle from vertical while the standing leg stays vertical. */
  measure(p) {
    const orientation = orientationBlock(p, this.bestView);
    if (orientation) return blocked(orientation);
    const left = legAngle(p, Joint.LeftHip, Joint.LeftAnkle, Joint.LeftKnee);
    const right = legAngle(p, Joint.RightHip, Joint.RightAnkle, Joint.RightKnee);
    if (left === null || right === null) return blocked("not_visible");
    if (Math.min(left, right) > STANDING_LEG_MAX_DEG) return blocked("form");
    return { angle: Math.max(left, right) };
  },
};

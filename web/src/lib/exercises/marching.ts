/** Marching: one knee lifts at a time, like marching on the spot. */
import { jointAngle3 } from "../domain/geometry";
import { ExerciseMode, Joint, ViewMode } from "../domain/models";
import { pose, SIDE_POSE } from "../illustrations";
import { blocked } from "./measures";
import type { Exercise } from "./types";

export const marching: Exercise = {
  mode: ExerciseMode.Marching,
  bestView: ViewMode.Front,
  thresholds: { lowDeg: 15, highDeg: 40, minIntervalS: 0.6 },
  copy: {
    label: "Marching",
    summary: "Lifts one knee at a time, like marching on the spot.",
    steps: [
      "Stand facing the camera, holding a chair if needed.",
      "Lift one knee as high as is comfortable.",
      "Lower it and lift the other knee.",
    ],
    benefit: "Hip strength and balance for walking.",
    safety: "Keep a hand on a sturdy chair for balance.",
    guidance: "Lift one knee at a time, as high as is comfortable. Hold a chair if needed.",
    notVisible: "Make sure both hips and knees are in view of the camera.",
    low: "Feet down",
    high: "Knee lifted",
    angleLabel: "Knee lift",
  },
  announcement: {
    en: "Marching selected. Lift one knee at a time.",
    hi: "कदमताल चुना गया। एक-एक करके घुटने उठाइए।",
  },
  illustration: {
    start: SIDE_POSE,
    end: pose(SIDE_POSE, { rKnee: [84, 88], rAnkle: [84, 116], lElbow: [52, 62], lWrist: [56, 80] }),
  },

  /**
   * Difference between the two legs' 3-D hip flexion. Lifting one knee bends
   * one hip; leaning or sitting bends both equally and cancels out, so this
   * works facing the camera or side-on.
   */
  measure(p) {
    const flexion = (shoulder: Joint, hip: Joint, knee: Joint) => {
      const angle = jointAngle3(p, shoulder, hip, knee);
      return angle === null ? null : 180 - angle;
    };
    const left = flexion(Joint.LeftShoulder, Joint.LeftHip, Joint.LeftKnee);
    const right = flexion(Joint.RightShoulder, Joint.RightHip, Joint.RightKnee);
    if (left === null || right === null) return blocked("not_visible");
    return { angle: Math.abs(left - right) };
  },
};

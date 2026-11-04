/** Sit-to-stand: stand up from a chair and sit back down with control. */
import { jointAngle3, safeAverage } from "../domain/geometry";
import { ExerciseMode, Joint, ViewMode } from "../domain/models";
import { pose, SIDE_POSE } from "../illustrations";
import { reading } from "./measures";
import type { Exercise } from "./types";

export const sitToStand: Exercise = {
  mode: ExerciseMode.SitToStand,
  bestView: ViewMode.Front,
  thresholds: { lowDeg: 120, highDeg: 155, minIntervalS: 1.2 },
  copy: {
    label: "Sit-to-stand",
    summary: "Stands up from a chair and sits back down with control.",
    steps: [
      "Sit near the front of a sturdy chair, facing the camera.",
      "Lean forward slightly and stand up, using your hands if needed.",
      "Sit back down slowly.",
    ],
    benefit: "Leg strength for everyday independence.",
    safety: "Use a chair that cannot slide, ideally against a wall.",
    guidance: "Stand up slowly from a sturdy chair, then sit back down with control.",
    notVisible: "Make sure your hips and knees are in view of the camera.",
    low: "Seated",
    high: "Standing",
    angleLabel: "Knee angle",
  },
  announcement: {
    en: "Sit to stand selected. Use a sturdy chair for support.",
    hi: "बैठकर खड़े होने का व्यायाम चुना गया। सहारे के लिए मज़बूत कुर्सी रखिए।",
  },
  illustration: {
    chair: true,
    start: pose(SIDE_POSE, {
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
    end: pose(SIDE_POSE, {
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

  /**
   * Average of 3-D knee and hip angles: about 90 seated and 170 or more
   * standing. Hip angles carry the reading when the ankles are hidden, and
   * 3-D angles work facing the camera or side-on.
   */
  measure(p) {
    return reading(
      safeAverage([
        jointAngle3(p, Joint.LeftHip, Joint.LeftKnee, Joint.LeftAnkle),
        jointAngle3(p, Joint.RightHip, Joint.RightKnee, Joint.RightAnkle),
        jointAngle3(p, Joint.LeftShoulder, Joint.LeftHip, Joint.LeftKnee),
        jointAngle3(p, Joint.RightShoulder, Joint.RightHip, Joint.RightKnee),
      ]),
    );
  },
};

/** Sit-to-stand: stand up from a chair and sit back down with control. */
import { jointAngle3, safeAverage } from "../domain/geometry";
import { ExerciseMode, Joint, ViewMode } from "../domain/models";
import { reading } from "./measures";
import type { Exercise } from "./types";

export const sitToStand: Exercise = {
  mode: ExerciseMode.SitToStand,
  bestView: ViewMode.Front,
  photo: "sit-to-stand.webp",
  thresholds: { lowDeg: 120, highDeg: 155, minIntervalS: 1.2 },
  copy: {
    label: "Sit to stand",
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

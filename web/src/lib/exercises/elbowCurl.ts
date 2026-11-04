/** Elbow curl: hands come up toward the shoulders with the elbows by the sides. */
import { jointAngle, jointAngle3 } from "../domain/geometry";
import { ExerciseMode, Joint, ViewMode } from "../domain/models";
import { FRONT_POSE, pose } from "../illustrations";
import { blocked, fromVertical, orientationBlock } from "./measures";
import type { Exercise } from "./types";

/** The upper arm must stay within this many degrees of vertical for a curl to count. */
const UPPER_ARM_MAX_DEG = 60;

const ARMS: [Joint, Joint, Joint][] = [
  [Joint.LeftShoulder, Joint.LeftElbow, Joint.LeftWrist],
  [Joint.RightShoulder, Joint.RightElbow, Joint.RightWrist],
];

export const elbowCurl: Exercise = {
  mode: ExerciseMode.ElbowCurl,
  bestView: ViewMode.Front,
  photo: "elbow-curl.webp",
  thresholds: { lowDeg: 30, highDeg: 75, minIntervalS: 0.8 },
  copy: {
    label: "Elbow curl",
    summary: "Bends the elbows to strengthen the front of the arms.",
    steps: [
      "Stand or sit with arms straight down.",
      "Keep elbows by your sides and lift your hands towards your shoulders.",
      "Lower slowly and repeat.",
    ],
    benefit: "Arm strength for lifting and carrying.",
    safety: "Hold light objects only if your physiotherapist agrees.",
    guidance:
      "Keep elbows by your sides and bring your hands up towards your shoulders.",
    notVisible: "Show your shoulders, elbows and wrists to the camera.",
    low: "Arm straight",
    high: "Elbow bent",
    angleLabel: "Elbow bend",
  },
  announcement: {
    en: "Elbow curl selected. Bend your elbows slowly towards your shoulders.",
    hi: "कोहनी मोड़ने का व्यायाम चुना गया। हाथ धीरे-धीरे कंधे की ओर लाइए।",
  },
  illustration: {
    start: FRONT_POSE,
    end: pose(FRONT_POSE, { lWrist: [47, 44], rWrist: [73, 44] }),
  },

  /** Per-arm flexion in 3-D and 2-D, and how far each upper arm is from vertical. */
  inspect(p) {
    const details: Record<string, number | string | null> = {
      orientation: orientationBlock(p, this.bestView) ?? "ok",
    };
    for (const [shoulder, elbow, wrist] of ARMS) {
      const side = shoulder === Joint.LeftShoulder ? "L" : "R";
      const angle3 = jointAngle3(p, shoulder, elbow, wrist);
      const angle2 = jointAngle(p, shoulder, elbow, wrist);
      const upperArm = fromVertical(p.get(shoulder), p.get(elbow));
      details[`${side} bend 3D`] = angle3 === null ? null : 180 - angle3;
      details[`${side} bend 2D`] = angle2 === null ? null : 180 - angle2;
      details[`${side} upper arm`] = upperArm;
      details[`${side} arm used`] =
        angle3 === null
          ? "no joints"
          : upperArm === null || upperArm > UPPER_ARM_MAX_DEG
            ? "upper arm too high"
            : "yes";
    }
    return details;
  },

  /**
   * 3-D elbow flexion on any arm whose upper arm stays down. A bent arm raised
   * away from the body is a form failure (unsure), never a zero reading.
   */
  measure(p) {
    const orientation = orientationBlock(p, this.bestView);
    if (orientation) return blocked(orientation);
    let best: number | null = null;
    let anyVisible = false;
    for (const [shoulder, elbow, wrist] of ARMS) {
      const angle = jointAngle3(p, shoulder, elbow, wrist);
      if (angle === null) continue;
      anyVisible = true;
      const upperArm = fromVertical(p.get(shoulder), p.get(elbow));
      if (upperArm === null || upperArm > UPPER_ARM_MAX_DEG) continue;
      best = Math.max(best ?? 0, 180 - angle);
    }
    if (!anyVisible) return blocked("not_visible");
    return best === null ? blocked("form") : { angle: best };
  },
};

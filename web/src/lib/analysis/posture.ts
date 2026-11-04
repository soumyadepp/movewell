/**
 * Heuristic posture analysis, one rule list per camera view (Strategy).
 * A rule takes the visible joints and returns a finding or null.
 */
import type { PostureThresholds } from "../config";
import { calculateAngle, midpoint } from "../domain/geometry";
import { type BodyPoints, type Finding, Joint, ViewMode } from "../domain/models";
import * as catalog from "./findings";

export type Rule = (points: BodyPoints) => Finding | null;

export interface PostureAnalyzer {
  analyze(points: BodyPoints): Finding[];
}

export function frontViewRules(t: PostureThresholds): Rule[] {
  const shoulderLevel: Rule = (p) => {
    const ls = p.get(Joint.LeftShoulder);
    const rs = p.get(Joint.RightShoulder);
    return ls && rs && Math.abs(ls[1] - rs[1]) > t.shoulderHeightDiffPx ? catalog.SHOULDER_HEIGHT : null;
  };

  const hipLevel: Rule = (p) => {
    const lh = p.get(Joint.LeftHip);
    const rh = p.get(Joint.RightHip);
    return lh && rh && Math.abs(lh[1] - rh[1]) > t.hipHeightDiffPx ? catalog.HIP_HEIGHT : null;
  };

  const trunkShift: Rule = (p) => {
    const shoulders = midpoint(p.get(Joint.LeftShoulder), p.get(Joint.RightShoulder));
    const hips = midpoint(p.get(Joint.LeftHip), p.get(Joint.RightHip));
    return shoulders && hips && Math.abs(shoulders[0] - hips[0]) > t.trunkShiftPx ? catalog.TRUNK_SHIFT : null;
  };

  const kneeTracking: Rule = (p) => {
    const lk = p.get(Joint.LeftKnee);
    const rk = p.get(Joint.RightKnee);
    const la = p.get(Joint.LeftAnkle);
    const ra = p.get(Joint.RightAnkle);
    if (!(lk && rk && la && ra)) return null;
    const limit = t.kneeAnkleOffsetPx;
    return Math.abs(lk[0] - la[0]) > limit || Math.abs(rk[0] - ra[0]) > limit ? catalog.KNEE_ALIGNMENT : null;
  };

  return [shoulderLevel, hipLevel, trunkShift, kneeTracking];
}

export function sideViewRules(t: PostureThresholds): Rule[] {
  const headForward: Rule = (p) => {
    const ear = p.firstVisible(Joint.LeftEar, Joint.RightEar);
    const shoulder = p.firstVisible(Joint.LeftShoulder, Joint.RightShoulder);
    return ear && shoulder && Math.abs(ear[0] - shoulder[0]) > t.headForwardPx ? catalog.HEAD_FORWARD : null;
  };

  const trunkIncline: Rule = (p) => {
    const shoulder = p.firstVisible(Joint.LeftShoulder, Joint.RightShoulder);
    const hip = p.firstVisible(Joint.LeftHip, Joint.RightHip);
    return shoulder && hip && Math.abs(shoulder[0] - hip[0]) > t.trunkInclinePx ? catalog.TRUNK_INCLINE : null;
  };

  const kneeBent: Rule = (p) => {
    const hip = p.firstVisible(Joint.LeftHip, Joint.RightHip);
    const knee = p.firstVisible(Joint.LeftKnee, Joint.RightKnee);
    const ankle = p.firstVisible(Joint.LeftAnkle, Joint.RightAnkle);
    if (!(hip && knee && ankle)) return null;
    const angle = calculateAngle(hip, knee, ankle);
    return angle !== null && angle < t.bentKneeDeg ? catalog.KNEE_BENT : null;
  };

  return [headForward, trunkIncline, kneeBent];
}

const RULE_FACTORIES: Record<ViewMode, (t: PostureThresholds) => Rule[]> = {
  [ViewMode.Front]: frontViewRules,
  [ViewMode.Side]: sideViewRules,
};

export function createPostureAnalyzer(view: ViewMode, thresholds: PostureThresholds): PostureAnalyzer {
  const rules = RULE_FACTORIES[view](thresholds);
  return {
    analyze: (points) => rules.map((rule) => rule(points)).filter((f): f is Finding => f !== null),
  };
}

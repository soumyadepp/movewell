/** Measurement helpers shared by several exercises. */
import { calculateAngle, jointAngle3, midpoint } from "../domain/geometry";
import { type BodyPoints, Joint, type Point, ViewMode } from "../domain/models";
import type { BlockReason, Reading } from "./types";

/** Shoulder width relative to torso length that separates facing the camera from side-on. */
export const FACING_RATIO = 0.45;
/** The supporting leg must stay within this many degrees of vertical. */
export const STANDING_LEG_MAX_DEG = 15;

export const below = (p: Point): Point => [p[0], p[1] + 100];
export const above = (p: Point): Point => [p[0], p[1] - 100];
export const blocked = (reason: BlockReason): Reading => ({ blocked: reason });
export const reading = (angle: number | null): Reading => (angle === null ? blocked("not_visible") : { angle });

/** Angle of the segment from `from` to `to`, measured from straight down, in degrees. */
export function fromVertical(from: Point | null, to: Point | null): number | null {
  if (!from || !to) return null;
  return calculateAngle(to, from, below(from));
}

/**
 * Checks that the person faces the camera (front) or stands side-on (side).
 * Returns null when the hips are hidden, since torso length is then unknown.
 */
export function orientationBlock(p: BodyPoints, view: ViewMode): BlockReason | null {
  const ls = p.get(Joint.LeftShoulder);
  const rs = p.get(Joint.RightShoulder);
  const hips = midpoint(p.get(Joint.LeftHip), p.get(Joint.RightHip));
  const shoulders = midpoint(ls, rs);
  if (!ls || !rs || !hips || !shoulders) return null;
  const torso = Math.hypot(shoulders[0] - hips[0], shoulders[1] - hips[1]);
  if (torso === 0) return null;
  const ratio = Math.abs(ls[0] - rs[0]) / torso;
  if (view === ViewMode.Front && ratio < FACING_RATIO) return "face_camera";
  if (view === ViewMode.Side && ratio >= FACING_RATIO) return "turn_side";
  return null;
}

/**
 * Upper-arm angle at the shoulder. Uses the hip as the reference (in 3-D when
 * available) when it is visible, otherwise a point straight below the
 * shoulder, so it still works when the hips are cropped out of frame.
 */
export function shoulderAngle(p: BodyPoints, elbow: Joint, shoulder: Joint, hip: Joint): number | null {
  if (p.get(hip)) return jointAngle3(p, elbow, shoulder, hip);
  const e = p.get(elbow);
  const s = p.get(shoulder);
  if (!e || !s) return null;
  return calculateAngle(e, s, below(s));
}

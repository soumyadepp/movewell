/** 2-D geometry helpers on pixel coordinates. */
import type { BodyPoints, Joint, Point } from "./models";

/** Angle ABC in degrees for 2-D or 3-D points, or null when an arm has zero length. */
export function calculateAngle(a: readonly number[], b: readonly number[], c: readonly number[]): number | null {
  let dot = 0;
  let ba2 = 0;
  let bc2 = 0;
  for (let i = 0; i < Math.min(a.length, b.length, c.length); i++) {
    const u = a[i] - b[i];
    const v = c[i] - b[i];
    dot += u * v;
    ba2 += u * u;
    bc2 += v * v;
  }
  const denom = Math.sqrt(ba2 * bc2);
  if (denom === 0) return null;
  const cosine = Math.max(-1, Math.min(1, dot / denom));
  return (Math.acos(cosine) * 180) / Math.PI;
}

/**
 * Finds the point halfway between two points.
 *
 * Args:
 *   p1: The first point, or null if not visible.
 *   p2: The second point, or null if not visible.
 *
 * Returns:
 *   The midpoint, or null if either point is missing.
 */
export function midpoint(p1: Point | null, p2: Point | null): Point | null {
  if (!p1 || !p2) return null;
  return [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
}

/**
 * Averages the values that are present and finite.
 *
 * Args:
 *   values: Numbers, some of which may be null or not finite.
 *
 * Returns:
 *   Their average, or null if none are usable.
 */
export function safeAverage(values: (number | null)[]): number | null {
  const finite = values.filter((v): v is number => v !== null && Number.isFinite(v));
  return finite.length ? finite.reduce((s, v) => s + v, 0) / finite.length : null;
}

/**
 * Joint angle preferring 3-D world landmarks, falling back to image points.
 * World angles are not shortened when the limb moves toward the camera.
 */
export function jointAngle3(points: BodyPoints, a: Joint, vertex: Joint, c: Joint): number | null {
  const wa = points.get3(a);
  const wb = points.get3(vertex);
  const wc = points.get3(c);
  if (wa && wb && wc) return calculateAngle(wa, wb, wc);
  return jointAngle(points, a, vertex, c);
}

/**
 * Measures the angle at a joint in the image plane.
 *
 * Args:
 *   points: The detected body points.
 *   a: The joint on one side of the angle.
 *   vertex: The joint where the angle is measured.
 *   c: The joint on the other side of the angle.
 *
 * Returns:
 *   The angle in degrees, or null if any joint is missing.
 */
export function jointAngle(points: BodyPoints, a: Joint, vertex: Joint, c: Joint): number | null {
  const pa = points.get(a);
  const pb = points.get(vertex);
  const pc = points.get(c);
  if (!pa || !pb || !pc) return null;
  return calculateAngle(pa, pb, pc);
}

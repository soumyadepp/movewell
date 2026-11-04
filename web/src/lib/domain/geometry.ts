/** 2-D geometry helpers on pixel coordinates. */
import type { BodyPoints, Joint, Point } from "./models";

export function calculateAngle(a: Point, b: Point, c: Point): number | null {
  const bax = a[0] - b[0];
  const bay = a[1] - b[1];
  const bcx = c[0] - b[0];
  const bcy = c[1] - b[1];
  const denom = Math.hypot(bax, bay) * Math.hypot(bcx, bcy);
  if (denom === 0) return null;
  const cosine = Math.max(-1, Math.min(1, (bax * bcx + bay * bcy) / denom));
  return (Math.acos(cosine) * 180) / Math.PI;
}

export function midpoint(p1: Point | null, p2: Point | null): Point | null {
  if (!p1 || !p2) return null;
  return [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
}

export function safeAverage(values: (number | null)[]): number | null {
  const finite = values.filter((v): v is number => v !== null && Number.isFinite(v));
  return finite.length ? finite.reduce((s, v) => s + v, 0) / finite.length : null;
}

export function jointAngle(points: BodyPoints, a: Joint, vertex: Joint, c: Joint): number | null {
  const pa = points.get(a);
  const pb = points.get(vertex);
  const pc = points.get(c);
  if (!pa || !pb || !pc) return null;
  return calculateAngle(pa, pb, pc);
}

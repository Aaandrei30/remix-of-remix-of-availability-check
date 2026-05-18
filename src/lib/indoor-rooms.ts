import { INDOOR_LABELS, type IndoorLabel } from "@/data/indoor-labels";

export type { IndoorLabel };
export const ROOMS: IndoorLabel[] = INDOOR_LABELS;

export function getRoom(id: string) {
  return ROOMS.find((r) => r.id === id);
}

/** Default "start" position = main entrance / stairs anchor. */
export const DEFAULT_START_ID =
  ROOMS.find((r) => /stair/i.test(r.name))?.id ?? ROOMS[0]?.id ?? "";

/**
 * Bearing in degrees [0, 360) from start → target in the XZ plane.
 * Convention: 0° = +Z forward (model "north"), increasing clockwise.
 * Device compass heading also uses 0° = north, clockwise — so subtracting
 * the heading gives the on-screen rotation for the arrow.
 */
export function bearingXZ(
  from: [number, number, number],
  to: [number, number, number],
): number {
  const dx = to[0] - from[0];
  const dz = to[2] - from[2];
  // atan2(dx, dz): 0 when dz>0 (target in +Z), +90 when dx>0 (target in +X = east-ish)
  let deg = (Math.atan2(dx, dz) * 180) / Math.PI;
  if (deg < 0) deg += 360;
  return deg;
}

/** Planar XZ distance, treated as meters (model is roughly to scale). */
export function distanceXZ(
  from: [number, number, number],
  to: [number, number, number],
): number {
  const dx = to[0] - from[0];
  const dz = to[2] - from[2];
  return Math.sqrt(dx * dx + dz * dz);
}

/** Normalize an angle delta to [-180, 180]. */
export function shortestAngle(delta: number): number {
  let d = ((delta + 180) % 360) - 180;
  if (d < -180) d += 360;
  return d;
}

export function directionLabel(relative: number): string {
  const a = Math.abs(relative);
  if (a < 20) return "Walk straight ahead";
  if (a > 150) return "Turn around";
  if (a > 60) return relative > 0 ? "Turn right" : "Turn left";
  return relative > 0 ? "Bear right" : "Bear left";
}
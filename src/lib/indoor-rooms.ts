import { INDOOR_LABELS, type IndoorLabel } from "@/data/indoor-labels";

export type { IndoorLabel };
export const ROOMS: IndoorLabel[] = INDOOR_LABELS;

/** Virtual start where field compass bearings were measured (2F hallway center). */
export const HALLWAY_2F_ID = "2f-hallway-center";

/**
 * Real-world compass bearings (0° = N, clockwise) from 2F hallway center
 * toward each landmark — used only when `from.id === HALLWAY_2F_ID`.
 */
export const MEASURED_BEARINGS_FROM_HALLWAY: Record<string, number> = {
  "80a84654-693c-4309-9997-ff1ca67de2e3": 110, // CL1
  "23d9bcaf-454f-4f51-a6d2-1efabac657d9": 110, // CL2
  "34682ca6-e252-4c82-8146-cf2415b79b96": 110, // CL3
  "f3b70d77-d1ca-4818-af6a-6d6fb9293abb": 110, // CL4
  "3302b6aa-3577-4f43-af1a-81fdb9a3c04f": 204, // Information Office
  "f09d30b1-a2d7-4781-a067-bbf2d793e6e6": 283, // Stairs
};

/** 3F landing at top of stairs (XZ aligned with 2F stairs anchor, 3F floor height). */
export const STAIRS_3F_POSITION: [number, number, number] = [
  11.027266030164538, -1.2214145748269711, -13.955178667852337,
];

export function getRoom(id: string) {
  return ROOMS.find((r) => r.id === id);
}

export function getStairsRoom(): IndoorLabel | undefined {
  return ROOMS.find((r) => /stair/i.test(r.name));
}

/** After user confirms they're on the upper floor, treat start as 3F stairs landing. */
export function getEffectiveStart(start: IndoorLabel, stairsCleared: boolean): IndoorLabel {
  if (stairsCleared && /stair/i.test(start.name)) {
    return { ...start, floor: "3F", position: STAIRS_3F_POSITION };
  }
  return start;
}

export function resolveRouteBearing(from: IndoorLabel, waypoint: IndoorLabel): number {
  if (from.id === HALLWAY_2F_ID) {
    const measured = MEASURED_BEARINGS_FROM_HALLWAY[waypoint.id];
    if (measured != null) return measured;
  }
  return bearingXZ(from.position, waypoint.position);
}

export function resolveRouteDistance(
  start: IndoorLabel,
  waypoint: IndoorLabel,
  stairsCleared: boolean,
): number {
  const effectiveStart = getEffectiveStart(start, stairsCleared);
  return distanceXZ(effectiveStart.position, waypoint.position);
}

/** Default start = 2F hallway center (field-measured bearing reference). */
export const DEFAULT_START_ID =
  ROOMS.find((r) => r.id === HALLWAY_2F_ID)?.id ??
  getStairsRoom()?.id ??
  ROOMS[0]?.id ??
  "";

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

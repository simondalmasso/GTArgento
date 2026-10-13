import type { Point } from "../missions/MissionDirector";

export type WorldPoint = { x: number; z: number };

// MissionDirector keeps the documented x-along-Corrientes map. The recovered
// renderer runs the avenue along world -Z; this affine transform joins them.
const SIDE_OFFSET = 5.7;
const SIDE_SCALE = 0.4;
const AXIS_OFFSET = 2;
const AXIS_SCALE = 6 / 7;

export function missionToWorld([x, z]: Point): WorldPoint {
  return {
    x: SIDE_OFFSET + SIDE_SCALE * z,
    z: AXIS_OFFSET - AXIS_SCALE * x,
  };
}

export function worldToMission(x: number, z: number): Point {
  return [
    (AXIS_OFFSET - z) / AXIS_SCALE,
    (x - SIDE_OFFSET) / SIDE_SCALE,
  ];
}

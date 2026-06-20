import type { RoadSegment } from './RoadGraph';

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export interface RoadInfluence {
  // 0 = on the road centerline, 1 = fully outside the flatten margin.
  blend: number;
  closestX: number;
  closestZ: number;
  // Raw distance in meters to the nearest segment's centerline, usable for
  // lane-marking stripes independent of the flatten blend.
  distance: number;
}

export function closestPointOnSegment(
  px: number,
  pz: number,
  seg: RoadSegment,
): { x: number; z: number; distance: number } {
  const dx = seg.bx - seg.ax;
  const dz = seg.bz - seg.az;
  const lenSq = dx * dx + dz * dz;
  const t = lenSq > 0 ? clamp01(((px - seg.ax) * dx + (pz - seg.az) * dz) / lenSq) : 0;
  const x = seg.ax + t * dx;
  const z = seg.az + t * dz;
  return { x, z, distance: Math.hypot(px - x, pz - z) };
}

// Finds the nearest road segment to (worldX, worldZ) and returns a 0-1 blend
// factor: 0 inside the road half-width, ramping to 1 over `flattenMargin`
// meters beyond it, used to flatten terrain height and tint vertex color
// near roads.
export function roadInfluence(
  worldX: number,
  worldZ: number,
  segments: RoadSegment[],
  roadHalfWidth: number,
  flattenMargin: number,
): RoadInfluence {
  let best = { x: worldX, z: worldZ, distance: Infinity };
  for (const seg of segments) {
    const candidate = closestPointOnSegment(worldX, worldZ, seg);
    if (candidate.distance < best.distance) best = candidate;
  }
  const blend = clamp01((best.distance - roadHalfWidth) / flattenMargin);
  return { blend, closestX: best.x, closestZ: best.z, distance: best.distance };
}

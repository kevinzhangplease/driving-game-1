import type { RoadGraph, RoadSegment } from '../roads/RoadGraph';
import { hash01 } from './PlacementHash';

export interface BuildingInstance {
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  rotationY: number;
}

export interface BuildingPlacerParams {
  seed: number;
  spacing: number;
  setback: number;
  existenceProbability: number;
  minWidth: number;
  maxWidth: number;
  minDepth: number;
  maxDepth: number;
  minHeight: number;
  maxHeight: number;
}

export const defaultBuildingPlacerParams: BuildingPlacerParams = {
  seed: 9001,
  spacing: 22,
  setback: 10,
  existenceProbability: 0.55,
  minWidth: 8,
  maxWidth: 16,
  minDepth: 8,
  maxDepth: 16,
  minHeight: 6,
  maxHeight: 28,
};

const ROAD_DIRECTION_SALT = { horizontal: 100, vertical: 200 } as const;

// Candidates are generated per-segment at fixed arc-length intervals, with
// existence/size/rotation hashed from the segment's stable macro-cell
// identity (not floats), so the candidate list for a given segment is
// identical no matter which chunk's neighborhood query discovered it. Each
// candidate is only kept by the one chunk whose AABB actually contains it,
// so buildings near a chunk border are rendered exactly once.
export function placeBuildings(
  roadGraph: RoadGraph,
  centerX: number,
  centerZ: number,
  chunkSize: number,
  params: BuildingPlacerParams,
): BuildingInstance[] {
  const halfSize = chunkSize / 2;
  const minX = centerX - halfSize;
  const maxX = centerX + halfSize;
  const minZ = centerZ - halfSize;
  const maxZ = centerZ + halfSize;

  const result: BuildingInstance[] = [];
  const segments = roadGraph.segmentsNear(centerX, centerZ);

  for (const seg of segments) {
    placeAlongSegment(seg, params, result, minX, maxX, minZ, maxZ);
  }
  return result;
}

function placeAlongSegment(
  seg: RoadSegment,
  params: BuildingPlacerParams,
  result: BuildingInstance[],
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number,
): void {
  const dx = seg.bx - seg.ax;
  const dz = seg.bz - seg.az;
  const length = Math.hypot(dx, dz);
  if (length < 1e-3) return;
  const dirX = dx / length;
  const dirZ = dz / length;
  // Perpendicular (rotated 90°), used to offset buildings to the road side.
  const perpX = -dirZ;
  const perpZ = dirX;
  const rotationY = Math.atan2(dirX, dirZ);

  const dirSalt = ROAD_DIRECTION_SALT[seg.direction];
  const count = Math.max(1, Math.floor(length / params.spacing));

  for (const side of [-1, 1]) {
    const sideSalt = dirSalt + (side === -1 ? 10 : 20);
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count;
      if (t * length < 1 || t * length > length - 1) continue;

      // Fold the within-segment index into the first hash coordinate (count
      // is always small) so the key stays unique per (macroX, macroZ, i).
      const a = seg.macroX * 64 + i;
      const b = seg.macroZ;
      if (hash01(a, b, sideSalt + 1, params.seed) >= params.existenceProbability) continue;

      const width =
        params.minWidth + hash01(a, b, sideSalt + 2, params.seed) * (params.maxWidth - params.minWidth);
      const depth =
        params.minDepth + hash01(a, b, sideSalt + 3, params.seed) * (params.maxDepth - params.minDepth);
      const height =
        params.minHeight + hash01(a, b, sideSalt + 4, params.seed) * (params.maxHeight - params.minHeight);

      const onRoadX = seg.ax + dirX * t * length;
      const onRoadZ = seg.az + dirZ * t * length;
      const offset = params.setback + depth / 2;
      const x = onRoadX + perpX * offset * side;
      const z = onRoadZ + perpZ * offset * side;

      if (x < minX || x >= maxX || z < minZ || z >= maxZ) continue;
      result.push({ x, z, width, depth, height, rotationY });
    }
  }
}

import type { RoadGraph, RoadSegment } from '../roads/RoadGraph';
import { hash01 } from './PlacementHash';

export type FurnitureKind =
  | 'lamp'
  | 'bench'
  | 'trashCan'
  | 'fireHydrant'
  | 'busStop'
  | 'billboard'
  | 'fence';

export interface FurnitureInstance {
  x: number;
  z: number;
  kind: FurnitureKind;
  rotationY: number;
}

export interface StreetFurnitureParams {
  seed: number;
  spacing: number;
  roadsideOffset: number;
  lampPostDensity: number;
  benchDensity: number;
  trashCanDensity: number;
  fireHydrantDensity: number;
  busStopChance: number;
  billboardChance: number;
  fenceDensity: number;
}

export const defaultStreetFurnitureParams: StreetFurnitureParams = {
  seed: 5151,
  spacing: 18,
  roadsideOffset: 5,
  lampPostDensity: 0.4,
  benchDensity: 0.15,
  trashCanDensity: 0.15,
  fireHydrantDensity: 0.1,
  busStopChance: 0.05,
  billboardChance: 0.03,
  fenceDensity: 0.1,
};

const KIND_SALT: Record<FurnitureKind, number> = {
  lamp: 300,
  bench: 310,
  trashCan: 320,
  fireHydrant: 330,
  busStop: 340,
  billboard: 350,
  fence: 360,
};

// Same per-segment candidate-slot approach as BuildingPlacer/TreePlacer:
// existence/kind is hashed from the segment's stable macro-cell identity, so
// candidates near a chunk border are identical no matter which chunk's
// neighborhood query discovered them, and are kept by exactly one chunk.
export function placeStreetFurniture(
  roadGraph: RoadGraph,
  centerX: number,
  centerZ: number,
  chunkSize: number,
  params: StreetFurnitureParams,
): FurnitureInstance[] {
  const halfSize = chunkSize / 2;
  const minX = centerX - halfSize;
  const maxX = centerX + halfSize;
  const minZ = centerZ - halfSize;
  const maxZ = centerZ + halfSize;

  const result: FurnitureInstance[] = [];
  const segments = roadGraph.segmentsNear(centerX, centerZ);
  const kinds: FurnitureKind[] = [
    'lamp',
    'bench',
    'trashCan',
    'fireHydrant',
    'busStop',
    'billboard',
    'fence',
  ];
  const densities: Record<FurnitureKind, number> = {
    lamp: params.lampPostDensity,
    bench: params.benchDensity,
    trashCan: params.trashCanDensity,
    fireHydrant: params.fireHydrantDensity,
    busStop: params.busStopChance,
    billboard: params.billboardChance,
    fence: params.fenceDensity,
  };

  for (const seg of segments) {
    placeAlongSegment(seg, params, kinds, densities, result, minX, maxX, minZ, maxZ);
  }
  return result;
}

function placeAlongSegment(
  seg: RoadSegment,
  params: StreetFurnitureParams,
  kinds: FurnitureKind[],
  densities: Record<FurnitureKind, number>,
  result: FurnitureInstance[],
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
  const perpX = -dirZ;
  const perpZ = dirX;
  const rotationY = Math.atan2(dirX, dirZ);

  const count = Math.max(1, Math.floor(length / params.spacing));

  for (const side of [-1, 1] as const) {
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count;
      if (t * length < 1 || t * length > length - 1) continue;

      const a = seg.macroX * 64 + i;
      const b = seg.macroZ;

      for (const kind of kinds) {
        const salt = KIND_SALT[kind] + (side === -1 ? 1 : 2);
        if (hash01(a, b, salt, params.seed) >= densities[kind]) continue;

        const onRoadX = seg.ax + dirX * t * length;
        const onRoadZ = seg.az + dirZ * t * length;
        const x = onRoadX + perpX * params.roadsideOffset * side;
        const z = onRoadZ + perpZ * params.roadsideOffset * side;

        if (x < minX || x >= maxX || z < minZ || z >= maxZ) continue;
        result.push({ x, z, kind, rotationY });
        // Only one furniture kind per slot, to avoid stacking a lamp and a
        // bench on the same spot.
        break;
      }
    }
  }
}

import type { HeightField } from '../terrain/HeightField';
import type { RoadGraph } from '../roads/RoadGraph';
import { roadInfluence } from '../roads/RoadSampler';
import type { BuildingInstance } from './BuildingPlacer';
import { hash01 } from './PlacementHash';

export type GroundCoverKind = 'grass' | 'shrub' | 'flower';

export interface GroundCoverInstance {
  x: number;
  z: number;
  kind: GroundCoverKind;
  scale: number;
  // Flowers pick one of a few palette colors; ignored for grass/shrub.
  colorIndex: number;
}

export interface GroundCoverParams {
  seed: number;
  cellSize: number;
  grassDensity: number;
  shrubDensity: number;
  flowerChance: number;
  roadClearance: number;
  buildingClearance: number;
  maxSlope: number;
}

export const defaultGroundCoverParams: GroundCoverParams = {
  seed: 2468,
  cellSize: 4,
  grassDensity: 0.5,
  shrubDensity: 0.2,
  flowerChance: 0.05,
  roadClearance: 2,
  buildingClearance: 1,
  maxSlope: 0.7,
};

const SLOPE_SAMPLE_OFFSET = 1.2;

// Sparse ground cover (grass tufts, shrubs, flowers) sampled one item per
// jittered grid cell, sharing the same road/building/slope rejection as the
// tree placer. At most one kind per cell so the three instanced meshes never
// stack on the same spot. Kept cheap: a coarse grid and modest densities keep
// the per-chunk instance count bounded.
export function placeGroundCover(
  heightField: HeightField,
  roadGraph: RoadGraph,
  buildings: BuildingInstance[],
  centerX: number,
  centerZ: number,
  chunkSize: number,
  params: GroundCoverParams,
): GroundCoverInstance[] {
  if (params.grassDensity <= 0 && params.shrubDensity <= 0 && params.flowerChance <= 0) return [];

  const halfSize = chunkSize / 2;
  const cellsPerSide = Math.floor(chunkSize / params.cellSize);
  const nearbySegments = roadGraph.segmentsNear(centerX, centerZ);
  const result: GroundCoverInstance[] = [];

  for (let row = 0; row < cellsPerSide; row++) {
    for (let col = 0; col < cellsPerSide; col++) {
      const cellMinX = centerX - halfSize + row * params.cellSize;
      const cellMinZ = centerZ - halfSize + col * params.cellSize;

      const a = Math.round(cellMinX * 8);
      const b = Math.round(cellMinZ * 8);

      // Decide the kind for this cell first (grass most common, then shrub,
      // then flower), so a single roll keeps it to one instance per cell.
      const roll = hash01(a, b, 1, params.seed);
      let kind: GroundCoverKind | null = null;
      if (roll < params.grassDensity) kind = 'grass';
      else if (roll < params.grassDensity + params.shrubDensity) kind = 'shrub';
      else if (roll < params.grassDensity + params.shrubDensity + params.flowerChance) kind = 'flower';
      if (kind === null) continue;

      const jitterX = (hash01(a, b, 2, params.seed) - 0.5) * params.cellSize;
      const jitterZ = (hash01(a, b, 3, params.seed) - 0.5) * params.cellSize;
      const x = cellMinX + params.cellSize / 2 + jitterX;
      const z = cellMinZ + params.cellSize / 2 + jitterZ;

      const { blend } = roadInfluence(x, z, nearbySegments, 0, params.roadClearance + 4);
      if (blend < 1) continue;
      if (overlapsAnyBuilding(x, z, buildings, params.buildingClearance)) continue;
      if (slopeTooSteep(heightField, x, z, params.maxSlope)) continue;

      const scale = 0.7 + hash01(a, b, 4, params.seed) * 0.6;
      const colorIndex = Math.floor(hash01(a, b, 5, params.seed) * 4);
      result.push({ x, z, kind, scale, colorIndex });
    }
  }
  return result;
}

function overlapsAnyBuilding(
  x: number,
  z: number,
  buildings: BuildingInstance[],
  clearance: number,
): boolean {
  for (const bld of buildings) {
    const halfW = bld.width / 2 + clearance;
    const halfD = bld.depth / 2 + clearance;
    if (Math.abs(x - bld.x) < halfW && Math.abs(z - bld.z) < halfD) return true;
  }
  return false;
}

function slopeTooSteep(heightField: HeightField, x: number, z: number, maxSlope: number): boolean {
  const h0 = heightField.sample(x - SLOPE_SAMPLE_OFFSET, z);
  const h1 = heightField.sample(x + SLOPE_SAMPLE_OFFSET, z);
  const h2 = heightField.sample(x, z - SLOPE_SAMPLE_OFFSET);
  const h3 = heightField.sample(x, z + SLOPE_SAMPLE_OFFSET);
  const slopeX = Math.abs(h1 - h0) / (2 * SLOPE_SAMPLE_OFFSET);
  const slopeZ = Math.abs(h3 - h2) / (2 * SLOPE_SAMPLE_OFFSET);
  return Math.max(slopeX, slopeZ) > maxSlope;
}

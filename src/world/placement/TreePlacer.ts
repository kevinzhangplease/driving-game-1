import type { HeightField } from '../terrain/HeightField';
import type { RoadGraph } from '../roads/RoadGraph';
import { roadInfluence } from '../roads/RoadSampler';
import type { BuildingInstance } from './BuildingPlacer';
import { hash01 } from './PlacementHash';

export interface TreeInstance {
  x: number;
  z: number;
  height: number;
  radius: number;
}

export interface TreePlacerParams {
  seed: number;
  cellSize: number;
  existenceProbability: number;
  minHeight: number;
  maxHeight: number;
  minRadius: number;
  maxRadius: number;
  roadClearance: number;
  buildingClearance: number;
  maxSlope: number;
}

export const defaultTreePlacerParams: TreePlacerParams = {
  seed: 7331,
  cellSize: 7,
  existenceProbability: 0.3,
  minHeight: 4,
  maxHeight: 9,
  minRadius: 1.2,
  maxRadius: 2.2,
  roadClearance: 3,
  buildingClearance: 2,
  maxSlope: 0.6,
};

const SLOPE_SAMPLE_OFFSET = 1.5;

// Rejection-samples one candidate per jittered grid cell across the chunk,
// rejecting positions still within a road's flatten zone, inside a
// building's footprint (with clearance), or on too steep a slope.
export function placeTrees(
  heightField: HeightField,
  roadGraph: RoadGraph,
  buildings: BuildingInstance[],
  centerX: number,
  centerZ: number,
  chunkSize: number,
  params: TreePlacerParams,
): TreeInstance[] {
  const halfSize = chunkSize / 2;
  const cellsPerSide = Math.floor(chunkSize / params.cellSize);
  const nearbySegments = roadGraph.segmentsNear(centerX, centerZ);
  const result: TreeInstance[] = [];

  for (let row = 0; row < cellsPerSide; row++) {
    for (let col = 0; col < cellsPerSide; col++) {
      const cellMinX = centerX - halfSize + row * params.cellSize;
      const cellMinZ = centerZ - halfSize + col * params.cellSize;

      const a = Math.round(cellMinX * 4);
      const b = Math.round(cellMinZ * 4);
      if (hash01(a, b, 1, params.seed) >= params.existenceProbability) continue;

      const jitterX = (hash01(a, b, 2, params.seed) - 0.5) * params.cellSize;
      const jitterZ = (hash01(a, b, 3, params.seed) - 0.5) * params.cellSize;
      const x = cellMinX + params.cellSize / 2 + jitterX;
      const z = cellMinZ + params.cellSize / 2 + jitterZ;

      const { blend } = roadInfluence(x, z, nearbySegments, 0, params.roadClearance + 6);
      if (blend < 1) continue;

      if (overlapsAnyBuilding(x, z, buildings, params.buildingClearance)) continue;

      if (slopeTooSteep(heightField, x, z, params.maxSlope)) continue;

      const height =
        params.minHeight + hash01(a, b, 4, params.seed) * (params.maxHeight - params.minHeight);
      const radius =
        params.minRadius + hash01(a, b, 5, params.seed) * (params.maxRadius - params.minRadius);
      result.push({ x, z, height, radius });
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
  for (const b of buildings) {
    const halfW = b.width / 2 + clearance;
    const halfD = b.depth / 2 + clearance;
    if (Math.abs(x - b.x) < halfW && Math.abs(z - b.z) < halfD) return true;
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

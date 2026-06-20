import * as THREE from 'three';
import type { HeightField } from './HeightField';
import type { RoadGraph } from '../roads/RoadGraph';
import { roadInfluence } from '../roads/RoadSampler';

export interface TerrainGrid {
  positions: Float32Array;
  colors: Float32Array;
  indices: Uint32Array;
}

const ROAD_COLOR: [number, number, number] = [0.1, 0.1, 0.11];
const MARKING_COLOR: [number, number, number] = [0.85, 0.8, 0.3];
const MARKING_STRIPE_HALF_WIDTH = 0.12;

export interface RoadStyleParams {
  width: number;
  shoulderWidth: number;
  markingsEnabled: boolean;
  laneCount: number;
  intersectionRadius: number;
}

export const defaultRoadStyleParams: RoadStyleParams = {
  width: 8,
  shoulderWidth: 1,
  markingsEnabled: true,
  laneCount: 2,
  intersectionRadius: 10,
};

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Samples a (segments+1)^2 grid of world-space heights for a chunk centered
// at (centerX, centerZ), flattened under nearby road segments, shared by
// both the Three.js mesh and the Rapier trimesh collider so they always
// match exactly.
export function buildTerrainGrid(
  heightField: HeightField,
  roadGraph: RoadGraph,
  centerX: number,
  centerZ: number,
  size: number,
  segments: number,
  baseColor: [number, number, number],
  roadStyle: RoadStyleParams = defaultRoadStyleParams,
): TerrainGrid {
  const verticesPerSide = segments + 1;
  const positions = new Float32Array(verticesPerSide * verticesPerSide * 3);
  const colors = new Float32Array(verticesPerSide * verticesPerSide * 3);
  const nearbySegments = roadGraph.segmentsNear(centerX, centerZ);
  const nearbyNodes = roadGraph.nodesNear(centerX, centerZ);
  const roadHalfWidth = roadStyle.width / 2;
  const laneHalfWidth = roadStyle.laneCount > 1 ? roadHalfWidth / roadStyle.laneCount : 0;

  for (let row = 0; row < verticesPerSide; row++) {
    const localX = (row / segments - 0.5) * size;
    const worldX = centerX + localX;
    for (let col = 0; col < verticesPerSide; col++) {
      const localZ = (col / segments - 0.5) * size;
      const worldZ = centerZ + localZ;
      const natural = heightField.sample(worldX, worldZ);

      const { blend, closestX, closestZ, distance } = roadInfluence(
        worldX,
        worldZ,
        nearbySegments,
        roadHalfWidth,
        roadStyle.shoulderWidth,
      );

      // Intersection nodes get their own (larger) flattened radius, since the
      // segment-based flatten alone can leave a step where multiple roads meet.
      let nodeBlend = 1;
      for (const node of nearbyNodes) {
        const d = Math.hypot(worldX - node.x, worldZ - node.z);
        nodeBlend = Math.min(nodeBlend, Math.max(0, Math.min(1, (d - roadHalfWidth) / roadStyle.intersectionRadius)));
      }
      const combinedBlend = Math.min(blend, nodeBlend);

      const flattened = combinedBlend < 1 ? heightField.sample(closestX, closestZ) : natural;
      const height = lerp(flattened, natural, combinedBlend);

      const vIndex = row * verticesPerSide + col;
      positions[vIndex * 3] = localX;
      positions[vIndex * 3 + 1] = height;
      positions[vIndex * 3 + 2] = localZ;

      let r = lerp(ROAD_COLOR[0], baseColor[0], combinedBlend);
      let g = lerp(ROAD_COLOR[1], baseColor[1], combinedBlend);
      let b = lerp(ROAD_COLOR[2], baseColor[2], combinedBlend);

      if (roadStyle.markingsEnabled && blend < 0.05) {
        const onCenterline = distance < MARKING_STRIPE_HALF_WIDTH;
        const onLaneDivider =
          laneHalfWidth > 0 && Math.abs(distance - laneHalfWidth) < MARKING_STRIPE_HALF_WIDTH;
        if (onCenterline || onLaneDivider) {
          r = MARKING_COLOR[0];
          g = MARKING_COLOR[1];
          b = MARKING_COLOR[2];
        }
      }
      colors[vIndex * 3] = r;
      colors[vIndex * 3 + 1] = g;
      colors[vIndex * 3 + 2] = b;
    }
  }

  const indices: number[] = [];
  for (let row = 0; row < segments; row++) {
    for (let col = 0; col < segments; col++) {
      const a = row * verticesPerSide + col;
      const b = a + 1;
      const c = a + verticesPerSide;
      const d = c + 1;
      indices.push(a, b, c, b, d, c);
    }
  }

  return { positions, colors, indices: new Uint32Array(indices) };
}

export function buildTerrainMesh(grid: TerrainGrid): THREE.Mesh {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(grid.positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(grid.colors, 3));
  geometry.setIndex(new THREE.BufferAttribute(grid.indices, 1));
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({ vertexColors: true });
  return new THREE.Mesh(geometry, material);
}

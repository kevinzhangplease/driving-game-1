import * as THREE from 'three';
import type { HeightField } from './HeightField';
import type { RoadGraph } from '../roads/RoadGraph';
import { roadInfluence } from '../roads/RoadSampler';

export interface TerrainGrid {
  positions: Float32Array;
  colors: Float32Array;
  indices: Uint32Array;
}

const ROAD_HALF_WIDTH = 4;
const ROAD_FLATTEN_MARGIN = 6;
const ROAD_COLOR: [number, number, number] = [0.1, 0.1, 0.11];

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
): TerrainGrid {
  const verticesPerSide = segments + 1;
  const positions = new Float32Array(verticesPerSide * verticesPerSide * 3);
  const colors = new Float32Array(verticesPerSide * verticesPerSide * 3);
  const nearbySegments = roadGraph.segmentsNear(centerX, centerZ);

  for (let row = 0; row < verticesPerSide; row++) {
    const localX = (row / segments - 0.5) * size;
    const worldX = centerX + localX;
    for (let col = 0; col < verticesPerSide; col++) {
      const localZ = (col / segments - 0.5) * size;
      const worldZ = centerZ + localZ;
      const natural = heightField.sample(worldX, worldZ);

      const { blend, closestX, closestZ } = roadInfluence(
        worldX,
        worldZ,
        nearbySegments,
        ROAD_HALF_WIDTH,
        ROAD_FLATTEN_MARGIN,
      );
      const flattened = blend < 1 ? heightField.sample(closestX, closestZ) : natural;
      const height = lerp(flattened, natural, blend);

      const vIndex = row * verticesPerSide + col;
      positions[vIndex * 3] = localX;
      positions[vIndex * 3 + 1] = height;
      positions[vIndex * 3 + 2] = localZ;

      colors[vIndex * 3] = lerp(ROAD_COLOR[0], baseColor[0], blend);
      colors[vIndex * 3 + 1] = lerp(ROAD_COLOR[1], baseColor[1], blend);
      colors[vIndex * 3 + 2] = lerp(ROAD_COLOR[2], baseColor[2], blend);
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

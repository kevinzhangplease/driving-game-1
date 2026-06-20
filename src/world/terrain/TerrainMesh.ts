import * as THREE from 'three';
import type { HeightField } from './HeightField';

export interface TerrainGrid {
  positions: Float32Array;
  indices: Uint32Array;
}

// Samples a (segments+1)^2 grid of world-space heights for a chunk centered
// at (centerX, centerZ), shared by both the Three.js mesh and the Rapier
// trimesh collider so they always match exactly.
export function buildTerrainGrid(
  heightField: HeightField,
  centerX: number,
  centerZ: number,
  size: number,
  segments: number,
): TerrainGrid {
  const verticesPerSide = segments + 1;
  const positions = new Float32Array(verticesPerSide * verticesPerSide * 3);

  for (let row = 0; row < verticesPerSide; row++) {
    const localX = (row / segments - 0.5) * size;
    const worldX = centerX + localX;
    for (let col = 0; col < verticesPerSide; col++) {
      const localZ = (col / segments - 0.5) * size;
      const worldZ = centerZ + localZ;
      const height = heightField.sample(worldX, worldZ);

      const vIndex = row * verticesPerSide + col;
      positions[vIndex * 3] = localX;
      positions[vIndex * 3 + 1] = height;
      positions[vIndex * 3 + 2] = localZ;
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

  return { positions, indices: new Uint32Array(indices) };
}

export function buildTerrainMesh(grid: TerrainGrid, material: THREE.Material): THREE.Mesh {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(grid.positions, 3));
  geometry.setIndex(new THREE.BufferAttribute(grid.indices, 1));
  geometry.computeVertexNormals();

  return new THREE.Mesh(geometry, material);
}

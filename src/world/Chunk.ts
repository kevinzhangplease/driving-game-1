import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import type { ChunkCoord } from './ChunkKey';
import type { HeightField } from './terrain/HeightField';
import { buildTerrainGrid, buildTerrainMesh } from './terrain/TerrainMesh';

const COLOR_EVEN = 0x4a7c59;
const COLOR_ODD = 0x457355;
const TERRAIN_SEGMENTS = 12;

export class Chunk {
  readonly coord: ChunkCoord;
  private mesh: THREE.Mesh;
  private body: RAPIER.RigidBody;
  private collider: RAPIER.Collider;
  private scene: THREE.Scene;
  private world: RAPIER.World;

  constructor(
    RAPIER_NS: typeof RAPIER,
    scene: THREE.Scene,
    world: RAPIER.World,
    coord: ChunkCoord,
    chunkSize: number,
    heightField: HeightField,
  ) {
    this.coord = coord;
    this.scene = scene;
    this.world = world;

    const centerX = (coord.cx + 0.5) * chunkSize;
    const centerZ = (coord.cz + 0.5) * chunkSize;
    const isEven = (coord.cx + coord.cz) % 2 === 0;

    const grid = buildTerrainGrid(heightField, centerX, centerZ, chunkSize, TERRAIN_SEGMENTS);

    const material = new THREE.MeshStandardMaterial({ color: isEven ? COLOR_EVEN : COLOR_ODD });
    this.mesh = buildTerrainMesh(grid, material);
    this.mesh.position.set(centerX, 0, centerZ);
    scene.add(this.mesh);

    this.body = world.createRigidBody(
      RAPIER_NS.RigidBodyDesc.fixed().setTranslation(centerX, 0, centerZ),
    );
    this.collider = world.createCollider(
      RAPIER_NS.ColliderDesc.trimesh(grid.positions, grid.indices),
      this.body,
    );
  }

  dispose(): void {
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.world.removeCollider(this.collider, true);
    this.world.removeRigidBody(this.body);
  }
}

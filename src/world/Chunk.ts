import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import type { ChunkCoord } from './ChunkKey';

const COLOR_EVEN = 0x4a7c59;
const COLOR_ODD = 0x457355;

// A single streamed terrain tile. Currently a trivial flat plane + matching
// fixed collider; Milestone 7 replaces the flat geometry with sampled
// heightfield terrain while keeping this load/unload lifecycle.
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
  ) {
    this.coord = coord;
    this.scene = scene;
    this.world = world;

    const centerX = (coord.cx + 0.5) * chunkSize;
    const centerZ = (coord.cz + 0.5) * chunkSize;
    const isEven = (coord.cx + coord.cz) % 2 === 0;

    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(chunkSize, chunkSize),
      new THREE.MeshStandardMaterial({ color: isEven ? COLOR_EVEN : COLOR_ODD }),
    );
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.set(centerX, 0, centerZ);
    scene.add(this.mesh);

    this.body = world.createRigidBody(
      RAPIER_NS.RigidBodyDesc.fixed().setTranslation(centerX, -0.1, centerZ),
    );
    this.collider = world.createCollider(
      RAPIER_NS.ColliderDesc.cuboid(chunkSize / 2, 0.1, chunkSize / 2),
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

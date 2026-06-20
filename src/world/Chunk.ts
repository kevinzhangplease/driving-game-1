import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import type { ChunkCoord } from './ChunkKey';
import type { HeightField } from './terrain/HeightField';
import type { RoadGraph } from './roads/RoadGraph';
import { buildTerrainGrid, buildTerrainMesh } from './terrain/TerrainMesh';
import { placeBuildings, defaultBuildingPlacerParams } from './placement/BuildingPlacer';
import { placeTrees, defaultTreePlacerParams } from './placement/TreePlacer';
import { placeSigns } from './placement/SignPlacer';

const COLOR_EVEN: [number, number, number] = [0.29, 0.49, 0.35];
const COLOR_ODD: [number, number, number] = [0.27, 0.45, 0.33];
const TERRAIN_SEGMENTS = 16;

const BUILDING_COLOR = new THREE.Color(0.55, 0.54, 0.52);
const TRUNK_COLOR = new THREE.Color(0.36, 0.25, 0.16);
const CANOPY_COLOR = new THREE.Color(0.22, 0.4, 0.22);
const SIGN_COLOR = new THREE.Color(0.7, 0.15, 0.15);

const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
const trunkGeometry = new THREE.CylinderGeometry(1, 1, 1, 6);
const canopyGeometry = new THREE.ConeGeometry(1, 1, 7);
const signGeometry = new THREE.BoxGeometry(0.15, 2.2, 0.15);

export class Chunk {
  readonly coord: ChunkCoord;
  private mesh: THREE.Mesh;
  private body: RAPIER.RigidBody;
  private collider: RAPIER.Collider;
  private buildingColliders: RAPIER.Collider[] = [];
  private instancedMeshes: THREE.InstancedMesh[] = [];
  private scene: THREE.Scene;
  private world: RAPIER.World;

  constructor(
    RAPIER_NS: typeof RAPIER,
    scene: THREE.Scene,
    world: RAPIER.World,
    coord: ChunkCoord,
    chunkSize: number,
    heightField: HeightField,
    roadGraph: RoadGraph,
  ) {
    this.coord = coord;
    this.scene = scene;
    this.world = world;

    const centerX = (coord.cx + 0.5) * chunkSize;
    const centerZ = (coord.cz + 0.5) * chunkSize;
    const isEven = (coord.cx + coord.cz) % 2 === 0;

    const grid = buildTerrainGrid(
      heightField,
      roadGraph,
      centerX,
      centerZ,
      chunkSize,
      TERRAIN_SEGMENTS,
      isEven ? COLOR_EVEN : COLOR_ODD,
    );

    this.mesh = buildTerrainMesh(grid);
    this.mesh.position.set(centerX, 0, centerZ);
    scene.add(this.mesh);

    this.body = world.createRigidBody(
      RAPIER_NS.RigidBodyDesc.fixed().setTranslation(centerX, 0, centerZ),
    );
    this.collider = world.createCollider(
      RAPIER_NS.ColliderDesc.trimesh(grid.positions, grid.indices),
      this.body,
    );

    const buildings = placeBuildings(roadGraph, centerX, centerZ, chunkSize, defaultBuildingPlacerParams);
    this.addBuildings(RAPIER_NS, buildings, heightField);

    const trees = placeTrees(
      heightField,
      roadGraph,
      buildings,
      centerX,
      centerZ,
      chunkSize,
      defaultTreePlacerParams,
    );
    this.addTrees(trees, heightField);

    const signs = placeSigns(roadGraph, centerX, centerZ, chunkSize);
    this.addSigns(signs, heightField);
  }

  private addBuildings(
    RAPIER_NS: typeof RAPIER,
    buildings: ReturnType<typeof placeBuildings>,
    heightField: HeightField,
  ): void {
    if (buildings.length === 0) return;

    const instanced = new THREE.InstancedMesh(boxGeometry, this.buildingMaterial(), buildings.length);
    const matrix = new THREE.Matrix4();
    buildings.forEach((b, i) => {
      const groundY = heightField.sample(b.x, b.z);
      matrix.compose(
        new THREE.Vector3(b.x, groundY + b.height / 2, b.z),
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), b.rotationY),
        new THREE.Vector3(b.width, b.height, b.depth),
      );
      instanced.setMatrixAt(i, matrix);

      const colliderBody = this.body;
      const collider = this.world.createCollider(
        RAPIER_NS.ColliderDesc.cuboid(b.width / 2, b.height / 2, b.depth / 2).setTranslation(
          b.x - this.body.translation().x,
          groundY + b.height / 2,
          b.z - this.body.translation().z,
        ),
        colliderBody,
      );
      this.buildingColliders.push(collider);
    });
    instanced.instanceMatrix.needsUpdate = true;
    this.scene.add(instanced);
    this.instancedMeshes.push(instanced);
  }

  private addTrees(trees: ReturnType<typeof placeTrees>, heightField: HeightField): void {
    if (trees.length === 0) return;

    const trunks = new THREE.InstancedMesh(
      trunkGeometry,
      new THREE.MeshStandardMaterial({ color: TRUNK_COLOR }),
      trees.length,
    );
    const canopies = new THREE.InstancedMesh(
      canopyGeometry,
      new THREE.MeshStandardMaterial({ color: CANOPY_COLOR }),
      trees.length,
    );
    const matrix = new THREE.Matrix4();
    const noRotation = new THREE.Quaternion();

    trees.forEach((t, i) => {
      const groundY = heightField.sample(t.x, t.z);
      const trunkHeight = t.height * 0.4;
      matrix.compose(
        new THREE.Vector3(t.x, groundY + trunkHeight / 2, t.z),
        noRotation,
        new THREE.Vector3(t.radius * 0.3, trunkHeight, t.radius * 0.3),
      );
      trunks.setMatrixAt(i, matrix);

      const canopyHeight = t.height * 0.7;
      matrix.compose(
        new THREE.Vector3(t.x, groundY + trunkHeight + canopyHeight / 2, t.z),
        noRotation,
        new THREE.Vector3(t.radius, canopyHeight, t.radius),
      );
      canopies.setMatrixAt(i, matrix);
    });
    trunks.instanceMatrix.needsUpdate = true;
    canopies.instanceMatrix.needsUpdate = true;
    this.scene.add(trunks, canopies);
    this.instancedMeshes.push(trunks, canopies);
  }

  private addSigns(signs: ReturnType<typeof placeSigns>, heightField: HeightField): void {
    if (signs.length === 0) return;

    const instanced = new THREE.InstancedMesh(
      signGeometry,
      new THREE.MeshStandardMaterial({ color: SIGN_COLOR }),
      signs.length,
    );
    const matrix = new THREE.Matrix4();
    const noRotation = new THREE.Quaternion();
    signs.forEach((s, i) => {
      const groundY = heightField.sample(s.x, s.z);
      matrix.compose(new THREE.Vector3(s.x, groundY + 1.1, s.z), noRotation, new THREE.Vector3(1, 1, 1));
      instanced.setMatrixAt(i, matrix);
    });
    instanced.instanceMatrix.needsUpdate = true;
    this.scene.add(instanced);
    this.instancedMeshes.push(instanced);
  }

  private buildingMaterial(): THREE.Material {
    return new THREE.MeshStandardMaterial({ color: BUILDING_COLOR });
  }

  dispose(): void {
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();

    for (const m of this.instancedMeshes) {
      this.scene.remove(m);
      (m.material as THREE.Material).dispose();
    }

    for (const c of this.buildingColliders) {
      this.world.removeCollider(c, true);
    }
    this.world.removeCollider(this.collider, true);
    this.world.removeRigidBody(this.body);
  }
}

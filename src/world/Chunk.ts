import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import type { ChunkCoord } from './ChunkKey';
import type { HeightField } from './terrain/HeightField';
import type { RoadGraph } from './roads/RoadGraph';
import { buildTerrainGrid, buildTerrainMesh, type RoadStyleParams } from './terrain/TerrainMesh';
import { placeBuildings, type BuildingPlacerParams } from './placement/BuildingPlacer';
import { placeTrees, type TreePlacerParams } from './placement/TreePlacer';
import { placeSigns } from './placement/SignPlacer';
import { placeStreetFurniture, type StreetFurnitureParams } from './placement/StreetFurniturePlacer';

export type ColorPalette = 'neutral' | 'warm' | 'cool';
export type SeasonalTint = 'spring' | 'summer' | 'autumn' | 'winter';

export interface PlacementParams {
  building: BuildingPlacerParams;
  tree: TreePlacerParams;
  signsEnabled: boolean;
  streetFurniture: StreetFurnitureParams;
  roadStyle: RoadStyleParams;
  buildingColorPalette: ColorPalette;
  vegetationSeasonalTint: SeasonalTint;
}

const COLOR_EVEN: [number, number, number] = [0.29, 0.49, 0.35];
const COLOR_ODD: [number, number, number] = [0.27, 0.45, 0.33];
const TERRAIN_SEGMENTS = 16;

const BUILDING_COLOR_BY_PALETTE: Record<ColorPalette, THREE.Color> = {
  neutral: new THREE.Color(0.55, 0.54, 0.52),
  warm: new THREE.Color(0.62, 0.48, 0.38),
  cool: new THREE.Color(0.45, 0.52, 0.58),
};
const TRUNK_COLOR = new THREE.Color(0.36, 0.25, 0.16);
const CANOPY_COLOR_BY_TINT: Record<SeasonalTint, THREE.Color> = {
  spring: new THREE.Color(0.35, 0.55, 0.25),
  summer: new THREE.Color(0.22, 0.4, 0.22),
  autumn: new THREE.Color(0.6, 0.4, 0.12),
  winter: new THREE.Color(0.75, 0.78, 0.8),
};
const SIGN_COLOR = new THREE.Color(0.7, 0.15, 0.15);
const LAMP_COLOR = new THREE.Color(0.3, 0.3, 0.32);
const BENCH_COLOR = new THREE.Color(0.4, 0.28, 0.18);
const TRASH_CAN_COLOR = new THREE.Color(0.25, 0.35, 0.25);
const FIRE_HYDRANT_COLOR = new THREE.Color(0.75, 0.1, 0.1);

const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
const trunkGeometry = new THREE.CylinderGeometry(1, 1, 1, 6);
const canopyGeometry = new THREE.ConeGeometry(1, 1, 7);
const signGeometry = new THREE.BoxGeometry(0.15, 2.2, 0.15);
const lampGeometry = new THREE.CylinderGeometry(0.05, 0.07, 3.5, 6);
const benchGeometry = new THREE.BoxGeometry(1.4, 0.4, 0.5);
const trashCanGeometry = new THREE.CylinderGeometry(0.25, 0.22, 0.6, 8);
const fireHydrantGeometry = new THREE.CylinderGeometry(0.15, 0.18, 0.6, 8);

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
    placement: PlacementParams,
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
      placement.roadStyle,
    );

    this.mesh = buildTerrainMesh(grid);
    this.mesh.position.set(centerX, 0, centerZ);
    this.mesh.receiveShadow = true;
    scene.add(this.mesh);

    this.body = world.createRigidBody(
      RAPIER_NS.RigidBodyDesc.fixed().setTranslation(centerX, 0, centerZ),
    );
    this.collider = world.createCollider(
      RAPIER_NS.ColliderDesc.trimesh(grid.positions, grid.indices),
      this.body,
    );

    const buildings = placeBuildings(roadGraph, centerX, centerZ, chunkSize, placement.building);
    this.addBuildings(RAPIER_NS, buildings, heightField, placement.buildingColorPalette);

    const trees = placeTrees(
      heightField,
      roadGraph,
      buildings,
      centerX,
      centerZ,
      chunkSize,
      placement.tree,
    );
    this.addTrees(trees, heightField, placement.vegetationSeasonalTint);

    if (placement.signsEnabled) {
      const signs = placeSigns(roadGraph, centerX, centerZ, chunkSize);
      this.addSigns(signs, heightField);
    }

    const furniture = placeStreetFurniture(roadGraph, centerX, centerZ, chunkSize, placement.streetFurniture);
    this.addStreetFurniture(furniture, heightField);
  }

  private addBuildings(
    RAPIER_NS: typeof RAPIER,
    buildings: ReturnType<typeof placeBuildings>,
    heightField: HeightField,
    palette: ColorPalette,
  ): void {
    if (buildings.length === 0) return;

    const instanced = new THREE.InstancedMesh(
      boxGeometry,
      new THREE.MeshStandardMaterial({ color: BUILDING_COLOR_BY_PALETTE[palette] }),
      buildings.length,
    );
    instanced.castShadow = true;
    instanced.receiveShadow = true;
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

  private addTrees(
    trees: ReturnType<typeof placeTrees>,
    heightField: HeightField,
    seasonalTint: SeasonalTint,
  ): void {
    if (trees.length === 0) return;

    const trunks = new THREE.InstancedMesh(
      trunkGeometry,
      new THREE.MeshStandardMaterial({ color: TRUNK_COLOR }),
      trees.length,
    );
    const canopies = new THREE.InstancedMesh(
      canopyGeometry,
      new THREE.MeshStandardMaterial({ color: CANOPY_COLOR_BY_TINT[seasonalTint] }),
      trees.length,
    );
    trunks.castShadow = true;
    canopies.castShadow = true;
    canopies.receiveShadow = true;
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
    instanced.castShadow = true;
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

  private addStreetFurniture(furniture: ReturnType<typeof placeStreetFurniture>, heightField: HeightField): void {
    if (furniture.length === 0) return;

    const byKind: Record<string, typeof furniture> = { lamp: [], bench: [], trashCan: [], fireHydrant: [] };
    for (const item of furniture) byKind[item.kind]!.push(item);

    const specs: Array<{ kind: string; geometry: THREE.BufferGeometry; color: THREE.Color; yOffset: number }> = [
      { kind: 'lamp', geometry: lampGeometry, color: LAMP_COLOR, yOffset: 1.75 },
      { kind: 'bench', geometry: benchGeometry, color: BENCH_COLOR, yOffset: 0.2 },
      { kind: 'trashCan', geometry: trashCanGeometry, color: TRASH_CAN_COLOR, yOffset: 0.3 },
      { kind: 'fireHydrant', geometry: fireHydrantGeometry, color: FIRE_HYDRANT_COLOR, yOffset: 0.3 },
    ];

    const matrix = new THREE.Matrix4();
    for (const spec of specs) {
      const items = byKind[spec.kind]!;
      if (items.length === 0) continue;
      const instanced = new THREE.InstancedMesh(spec.geometry, new THREE.MeshStandardMaterial({ color: spec.color }), items.length);
      instanced.castShadow = true;
      instanced.receiveShadow = true;
      items.forEach((item, i) => {
        const groundY = heightField.sample(item.x, item.z);
        matrix.compose(
          new THREE.Vector3(item.x, groundY + spec.yOffset, item.z),
          new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), item.rotationY),
          new THREE.Vector3(1, 1, 1),
        );
        instanced.setMatrixAt(i, matrix);
      });
      instanced.instanceMatrix.needsUpdate = true;
      this.scene.add(instanced);
      this.instancedMeshes.push(instanced);
    }
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

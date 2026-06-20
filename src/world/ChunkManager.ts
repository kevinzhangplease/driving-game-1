import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { Chunk, type PlacementParams } from './Chunk';
import { chunkKey, worldToChunkCoord, type ChunkCoord } from './ChunkKey';
import { HeightField, defaultHeightFieldParams, type HeightFieldParams } from './terrain/HeightField';
import { RoadGraph, defaultRoadGraphParams, type RoadGraphParams } from './roads/RoadGraph';
import { defaultBuildingPlacerParams } from './placement/BuildingPlacer';
import { defaultTreePlacerParams } from './placement/TreePlacer';
import { defaultStreetFurnitureParams } from './placement/StreetFurniturePlacer';
import { defaultGroundCoverParams } from './placement/GroundCoverPlacer';
import { defaultRoadStyleParams } from './terrain/TerrainMesh';

const MAX_CHUNK_CREATIONS_PER_UPDATE = 4;

export class ChunkManager {
  readonly chunkSize: number;
  loadRadius: number;
  heightField: HeightField;
  roadGraph: RoadGraph;
  placement: PlacementParams;
  private rapier: typeof RAPIER;
  private scene: THREE.Scene;
  private world: RAPIER.World;
  private chunks = new Map<string, Chunk>();

  constructor(
    rapier: typeof RAPIER,
    scene: THREE.Scene,
    world: RAPIER.World,
    chunkSize: number,
    loadRadius: number,
  ) {
    this.rapier = rapier;
    this.scene = scene;
    this.world = world;
    this.chunkSize = chunkSize;
    this.loadRadius = loadRadius;
    this.heightField = new HeightField(defaultHeightFieldParams);
    this.roadGraph = new RoadGraph(defaultRoadGraphParams);
    this.placement = {
      building: { ...defaultBuildingPlacerParams },
      tree: { ...defaultTreePlacerParams },
      signsEnabled: true,
      streetFurniture: { ...defaultStreetFurnitureParams },
      groundCover: { ...defaultGroundCoverParams },
      roadStyle: { ...defaultRoadStyleParams },
      buildingColorPalette: 'neutral',
      vegetationSeasonalTint: 'summer',
      canopyShape: 'conical',
      biomeType: 'temperate',
      roofVariety: 0.5,
    };
  }

  setHeightFieldParams(params: HeightFieldParams): void {
    this.heightField = new HeightField(params);
    this.regenerateAll();
  }

  setRoadGraphParams(params: RoadGraphParams): void {
    this.roadGraph = new RoadGraph(params);
    this.regenerateAll();
  }

  // Discards every loaded chunk so the next update() calls recreate them
  // (budgeted, same as normal streaming) using the current params.
  regenerateAll(): void {
    for (const chunk of this.chunks.values()) chunk.dispose();
    this.chunks.clear();
  }

  update(playerWorldX: number, playerWorldZ: number): void {
    const center = worldToChunkCoord(playerWorldX, playerWorldZ, this.chunkSize);
    const wanted = new Set<string>();

    for (let dz = -this.loadRadius; dz <= this.loadRadius; dz++) {
      for (let dx = -this.loadRadius; dx <= this.loadRadius; dx++) {
        const coord: ChunkCoord = { cx: center.cx + dx, cz: center.cz + dz };
        wanted.add(chunkKey(coord.cx, coord.cz));
      }
    }

    let creationsThisUpdate = 0;
    for (const key of wanted) {
      if (this.chunks.has(key) || creationsThisUpdate >= MAX_CHUNK_CREATIONS_PER_UPDATE) continue;
      const [cx, cz] = key.split(',').map(Number) as [number, number];
      const chunk = new Chunk(
        this.rapier,
        this.scene,
        this.world,
        { cx, cz },
        this.chunkSize,
        this.heightField,
        this.roadGraph,
        this.placement,
      );
      this.chunks.set(key, chunk);
      creationsThisUpdate++;
    }

    for (const [key, chunk] of this.chunks) {
      if (!wanted.has(key)) {
        chunk.dispose();
        this.chunks.delete(key);
      }
    }
  }

  get loadedChunkCount(): number {
    return this.chunks.size;
  }
}

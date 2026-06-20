import * as THREE from 'three';
import { SettingsStore } from './SettingsStore';
import { ChunkManager } from '@/world/ChunkManager';
import { MouseSteering } from '@/input/MouseSteering';
import { defaultHeightFieldParams } from '@/world/terrain/HeightField';

function debounce(fn: () => void, ms: number): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(fn, ms);
  };
}

export interface WorldSettingsTargets {
  chunkManager: ChunkManager;
  mouseSteering: MouseSteering;
  scene: THREE.Scene;
  sun: THREE.DirectionalLight;
  hemiLight: THREE.HemisphereLight;
}

// Subscribes to every wired ParamDef and applies it to the live world.
// Terrain/road/placement changes regenerate chunks (debounced, so dragging a
// slider doesn't stutter); lighting/fog/mouse-steering apply immediately
// since they're cheap.
export function bindWorldSettings(store: SettingsStore, targets: WorldSettingsTargets): void {
  const { chunkManager, mouseSteering, scene, sun, hemiLight } = targets;

  const applyHeightField = debounce(() => {
    chunkManager.setHeightFieldParams({
      seed: store.getNumber('terrain.seed'),
      baseFrequency: store.getNumber('terrain.baseFrequency'),
      octaves: store.getNumber('terrain.octaves'),
      persistence: store.getNumber('terrain.persistence'),
      lacunarity: defaultHeightFieldParams.lacunarity,
      amplitude: store.getNumber('terrain.amplitude'),
    });
  }, 250);

  const applyRoadGraph = debounce(() => {
    chunkManager.setRoadGraphParams({
      seed: store.getNumber('roads.seed'),
      macroCellSize: store.getNumber('roads.macroCellSize'),
      edgeProbability: store.getNumber('roads.edgeProbability'),
      nodeJitter: store.getNumber('roads.nodeJitter'),
    });
  }, 250);

  const applyPlacement = debounce(() => {
    chunkManager.placement = {
      building: {
        ...chunkManager.placement.building,
        existenceProbability: store.getNumber('architecture.density'),
        spacing: store.getNumber('architecture.spacing'),
        setback: store.getNumber('architecture.setback'),
        minHeight: store.getNumber('architecture.minHeight'),
        maxHeight: store.getNumber('architecture.maxHeight'),
      },
      tree: {
        ...chunkManager.placement.tree,
        existenceProbability: store.getNumber('vegetation.density'),
        cellSize: store.getNumber('vegetation.cellSize'),
        minHeight: store.getNumber('vegetation.minHeight'),
        maxHeight: store.getNumber('vegetation.maxHeight'),
      },
      signsEnabled: store.getBoolean('streetFurniture.signsEnabled'),
    };
    chunkManager.regenerateAll();
  }, 250);

  const applyFog = () => {
    const fog = scene.fog as THREE.Fog;
    fog.near = store.getNumber('weather.fogNear');
    fog.far = store.getNumber('weather.fogFar');
  };

  const applyLighting = () => {
    sun.intensity = store.getNumber('lighting.sunIntensity');
    hemiLight.intensity = store.getNumber('lighting.ambientIntensity');
    const hour = store.getNumber('lighting.timeOfDay');
    const angle = (hour / 24) * Math.PI * 2 - Math.PI / 2;
    const radius = 40;
    sun.position.set(Math.cos(angle) * radius, Math.max(5, Math.sin(angle) * radius), 10);
  };

  const applyMouseSteering = () => {
    mouseSteering.sensitivity = store.getNumber('gameplay.mouseSteeringSensitivity');
    mouseSteering.linearity = store.getNumber('gameplay.mouseSteeringLinearity');
  };

  const applyChunkLoadRadius = () => {
    chunkManager.loadRadius = store.getNumber('gameplay.chunkLoadRadius');
  };

  const terrainIds = new Set([
    'terrain.seed',
    'terrain.baseFrequency',
    'terrain.octaves',
    'terrain.persistence',
    'terrain.amplitude',
  ]);
  const roadIds = new Set(['roads.seed', 'roads.macroCellSize', 'roads.edgeProbability', 'roads.nodeJitter']);
  const placementIds = new Set([
    'architecture.density',
    'architecture.spacing',
    'architecture.setback',
    'architecture.minHeight',
    'architecture.maxHeight',
    'vegetation.density',
    'vegetation.cellSize',
    'vegetation.minHeight',
    'vegetation.maxHeight',
    'streetFurniture.signsEnabled',
  ]);
  const fogIds = new Set(['weather.fogNear', 'weather.fogFar']);
  const lightingIds = new Set(['lighting.sunIntensity', 'lighting.ambientIntensity', 'lighting.timeOfDay']);
  const mouseIds = new Set(['gameplay.mouseSteeringSensitivity', 'gameplay.mouseSteeringLinearity']);

  store.onChange((id) => {
    if (terrainIds.has(id)) applyHeightField();
    else if (roadIds.has(id)) applyRoadGraph();
    else if (placementIds.has(id)) applyPlacement();
    else if (fogIds.has(id)) applyFog();
    else if (lightingIds.has(id)) applyLighting();
    else if (mouseIds.has(id)) applyMouseSteering();
    else if (id === 'gameplay.chunkLoadRadius') applyChunkLoadRadius();
  });

  applyFog();
  applyLighting();
  applyMouseSteering();
}

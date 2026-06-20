import * as THREE from 'three';
import { SettingsStore } from './SettingsStore';
import { ChunkManager } from '@/world/ChunkManager';
import { MouseSteering } from '@/input/MouseSteering';
import type { VehicleTuning } from '@/vehicle/VehicleTuning';
import type { VehicleController } from '@/vehicle/VehicleController';
import type { ColorPalette, SeasonalTint } from '@/world/Chunk';
import type { HUD } from '@/ui/HUD';

// How far above the resampled ground the chassis is dropped after a world
// regeneration, so it always free-falls onto the new terrain/road collider
// instead of risking spawning inside or below it.
const REGEN_DROP_HEIGHT = 18;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Rough Kelvin-to-RGB approximation, sufficient for tinting a directional
// light warm (low K) to cool (high K) without a full blackbody-radiation table.
function kelvinToRGB(kelvin: number): [number, number, number] {
  const t = Math.min(1, Math.max(0, (kelvin - 2000) / 7000));
  const r = lerp(1, 0.75, t);
  const g = lerp(0.65, 0.82, t);
  const b = lerp(0.35, 1, t);
  return [r, g, b];
}

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
  vehicleTuning: VehicleTuning;
  vehicle: VehicleController;
  hud: HUD;
}

// Subscribes to every wired ParamDef and applies it to the live world.
// Terrain/road/placement changes regenerate chunks (debounced, so dragging a
// slider doesn't stutter); lighting/fog/mouse-steering apply immediately
// since they're cheap.
export function bindWorldSettings(store: SettingsStore, targets: WorldSettingsTargets): void {
  const { chunkManager, mouseSteering, scene, sun, hemiLight, vehicleTuning, vehicle, hud } = targets;

  // Resamples the (possibly just-changed) heightfield under the car and
  // teleports it well above that point with zeroed velocity, so it always
  // free-falls onto the regenerated terrain/road collider instead of ending
  // up clipped below it.
  const repositionVehicleSafely = () => {
    const pos = vehicle.chassis.translation();
    const groundY = chunkManager.heightField.sample(pos.x, pos.z);
    vehicle.chassis.setTranslation({ x: pos.x, y: groundY + REGEN_DROP_HEIGHT, z: pos.z }, true);
    vehicle.chassis.setLinvel({ x: 0, y: 0, z: 0 }, true);
    vehicle.chassis.setAngvel({ x: 0, y: 0, z: 0 }, true);
  };

  const applyHeightField = debounce(() => {
    chunkManager.setHeightFieldParams({
      seed: store.getNumber('terrain.seed'),
      baseFrequency: store.getNumber('terrain.baseFrequency'),
      octaves: store.getNumber('terrain.octaves'),
      persistence: store.getNumber('terrain.persistence'),
      lacunarity: store.getNumber('terrain.lacunarity'),
      amplitude: store.getNumber('terrain.amplitude'),
      plateauBias: store.getNumber('terrain.plateauBias'),
      rockiness: store.getNumber('terrain.rockiness'),
    });
    repositionVehicleSafely();
  }, 250);

  const applyRoadGraph = debounce(() => {
    chunkManager.setRoadGraphParams({
      seed: store.getNumber('roads.seed'),
      macroCellSize: store.getNumber('roads.macroCellSize'),
      edgeProbability: store.getNumber('roads.edgeProbability'),
      nodeJitter: store.getNumber('roads.nodeJitter'),
    });
    repositionVehicleSafely();
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
        skyscraperChance: store.getNumber('architecture.skyscraperChance'),
      },
      tree: {
        ...chunkManager.placement.tree,
        existenceProbability: store.getNumber('vegetation.density'),
        cellSize: store.getNumber('vegetation.cellSize'),
        minHeight: store.getNumber('vegetation.minHeight'),
        maxHeight: store.getNumber('vegetation.maxHeight'),
      },
      signsEnabled: store.getBoolean('streetFurniture.signsEnabled'),
      streetFurniture: {
        ...chunkManager.placement.streetFurniture,
        lampPostDensity: store.getNumber('streetFurniture.lampPostDensity'),
        benchDensity: store.getNumber('streetFurniture.benchDensity'),
        trashCanDensity: store.getNumber('streetFurniture.trashCanDensity'),
        fireHydrantDensity: store.getNumber('streetFurniture.fireHydrantDensity'),
      },
      roadStyle: chunkManager.placement.roadStyle,
      buildingColorPalette: store.getString('architecture.colorPalette') as ColorPalette,
      vegetationSeasonalTint: store.getString('vegetation.seasonalTint') as SeasonalTint,
    };
    chunkManager.regenerateAll();
    repositionVehicleSafely();
  }, 250);

  const applyRoadStyle = debounce(() => {
    chunkManager.placement = {
      ...chunkManager.placement,
      roadStyle: {
        width: store.getNumber('roads.width'),
        shoulderWidth: store.getNumber('roads.shoulderWidth'),
        markingsEnabled: store.getBoolean('roads.markingsEnabled'),
        laneCount: store.getNumber('roads.laneCount'),
        intersectionRadius: store.getNumber('roads.intersectionRadius'),
      },
    };
    chunkManager.regenerateAll();
    repositionVehicleSafely();
  }, 250);

  const applyFog = () => {
    const fog = scene.fog as THREE.Fog;
    fog.near = store.getNumber('weather.fogNear');
    fog.far = store.getNumber('weather.fogFar');
    const warmth = store.getNumber('weather.fogColorWarmth');
    fog.color.setRGB(lerp(0.6, 0.75, warmth), lerp(0.65, 0.6, warmth), lerp(0.75, 0.45, warmth));
  };

  const applyLighting = () => {
    sun.intensity = store.getNumber('lighting.sunIntensity');
    hemiLight.intensity = store.getNumber('lighting.ambientIntensity');
    const hour = store.getNumber('lighting.timeOfDay');
    const azimuthDeg = store.getNumber('lighting.sunAzimuth');
    const elevationAngle = (hour / 24) * Math.PI * 2 - Math.PI / 2;
    const azimuthRad = (azimuthDeg * Math.PI) / 180;
    const radius = 40;
    const elevation = Math.sin(elevationAngle) * radius;
    const horizontalRadius = Math.cos(elevationAngle) * radius;
    const direction = new THREE.Vector3(
      Math.sin(azimuthRad) * horizontalRadius,
      Math.max(5, elevation),
      Math.cos(azimuthRad) * horizontalRadius,
    ).normalize();
    sun.position.copy(direction).multiplyScalar(radius);
    // Stashed so main.ts's per-frame shadow-follow logic can re-derive the
    // sun's world position relative to the car without re-deriving azimuth/elevation.
    sun.userData.direction = direction;

    const kelvin = store.getNumber('lighting.colorTemperature');
    sun.color.setRGB(...kelvinToRGB(kelvin));

    const moonBrightness = store.getNumber('lighting.moonBrightness');
    if (elevation <= 0) hemiLight.intensity = Math.max(hemiLight.intensity, moonBrightness);
  };

  const applyMouseSteering = () => {
    mouseSteering.sensitivity = store.getNumber('gameplay.mouseSteeringSensitivity');
    mouseSteering.linearity = store.getNumber('gameplay.mouseSteeringLinearity');
  };

  const applyChunkLoadRadius = () => {
    chunkManager.loadRadius = store.getNumber('gameplay.chunkLoadRadius');
  };

  const applyVehicleTuning = () => {
    vehicleTuning.maxSteerAngle = (store.getNumber('vehicle.maxSteerAngleDeg') * Math.PI) / 180;
    vehicleTuning.maxEngineForce = store.getNumber('vehicle.maxEngineForce');
    vehicleTuning.maxBrakeForce = store.getNumber('vehicle.maxBrakeForce');
    vehicle.setSuspensionStiffness(store.getNumber('vehicle.suspensionStiffness'));
    vehicle.setChassisMass(store.getNumber('vehicle.chassisMass'));
  };

  const applyGameplayDisplay = () => {
    hud.setVisible(store.getBoolean('gameplay.hudEnabled'));
    hud.setUnits(store.getString('gameplay.unitsDisplay') as 'kph' | 'mph');
  };

  const SHADOW_MAP_SIZE_BY_QUALITY: Record<string, number> = { off: 0, low: 512, medium: 1024, high: 2048 };

  const applyShadowQuality = () => {
    const quality = store.getString('lighting.shadowQuality');
    const size = SHADOW_MAP_SIZE_BY_QUALITY[quality] ?? 1024;
    sun.castShadow = size > 0;
    if (size > 0 && sun.shadow.mapSize.width !== size) {
      sun.shadow.mapSize.set(size, size);
      sun.shadow.map?.dispose();
      sun.shadow.map = null;
    }
  };

  const terrainIds = new Set([
    'terrain.seed',
    'terrain.baseFrequency',
    'terrain.octaves',
    'terrain.persistence',
    'terrain.amplitude',
    'terrain.lacunarity',
    'terrain.plateauBias',
    'terrain.rockiness',
  ]);
  const roadIds = new Set(['roads.seed', 'roads.macroCellSize', 'roads.edgeProbability', 'roads.nodeJitter']);
  const roadStyleIds = new Set([
    'roads.width',
    'roads.shoulderWidth',
    'roads.markingsEnabled',
    'roads.laneCount',
    'roads.intersectionRadius',
  ]);
  const placementIds = new Set([
    'architecture.density',
    'architecture.spacing',
    'architecture.setback',
    'architecture.minHeight',
    'architecture.maxHeight',
    'architecture.colorPalette',
    'architecture.skyscraperChance',
    'vegetation.density',
    'vegetation.cellSize',
    'vegetation.minHeight',
    'vegetation.maxHeight',
    'vegetation.seasonalTint',
    'streetFurniture.signsEnabled',
    'streetFurniture.lampPostDensity',
    'streetFurniture.benchDensity',
    'streetFurniture.trashCanDensity',
    'streetFurniture.fireHydrantDensity',
  ]);
  const fogIds = new Set(['weather.fogNear', 'weather.fogFar', 'weather.fogColorWarmth']);
  const lightingIds = new Set([
    'lighting.sunIntensity',
    'lighting.ambientIntensity',
    'lighting.timeOfDay',
    'lighting.sunAzimuth',
    'lighting.colorTemperature',
    'lighting.moonBrightness',
  ]);
  const shadowQualityIds = new Set(['lighting.shadowQuality']);
  const mouseIds = new Set(['gameplay.mouseSteeringSensitivity', 'gameplay.mouseSteeringLinearity']);
  const vehicleIds = new Set([
    'vehicle.maxSteerAngleDeg',
    'vehicle.maxEngineForce',
    'vehicle.maxBrakeForce',
    'vehicle.suspensionStiffness',
    'vehicle.chassisMass',
  ]);
  const gameplayDisplayIds = new Set(['gameplay.hudEnabled', 'gameplay.unitsDisplay']);

  store.onChange((id, value) => {
    // lighting.streetLightDensity is a convenience duplicate of
    // streetFurniture.lampPostDensity (per its tooltip); forward it so the
    // panel's lamp density slider stays in sync and there's one source of truth.
    if (id === 'lighting.streetLightDensity') {
      store.set('streetFurniture.lampPostDensity', value);
      return;
    }
    if (terrainIds.has(id)) applyHeightField();
    else if (roadIds.has(id)) applyRoadGraph();
    else if (roadStyleIds.has(id)) applyRoadStyle();
    else if (placementIds.has(id)) applyPlacement();
    else if (fogIds.has(id)) applyFog();
    else if (lightingIds.has(id)) applyLighting();
    else if (shadowQualityIds.has(id)) applyShadowQuality();
    else if (mouseIds.has(id)) applyMouseSteering();
    else if (id === 'gameplay.chunkLoadRadius') applyChunkLoadRadius();
    else if (vehicleIds.has(id)) applyVehicleTuning();
    else if (gameplayDisplayIds.has(id)) applyGameplayDisplay();
  });

  applyFog();
  applyLighting();
  applyShadowQuality();
  applyMouseSteering();
  applyVehicleTuning();
  applyGameplayDisplay();
}

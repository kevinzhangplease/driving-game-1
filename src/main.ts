import * as THREE from 'three';
import './style.css';
import { Engine } from '@/core/Engine';
import { initPhysics, PhysicsWorld } from '@/core/PhysicsWorld';
import { VehicleController } from '@/vehicle/VehicleController';
import { CarVisual } from '@/vehicle/CarVisual';
import { ChaseCamera } from '@/vehicle/ChaseCamera';
import { defaultVehicleTuning } from '@/vehicle/VehicleTuning';
import { InputManager } from '@/input/InputManager';
import { KeyBindings } from '@/input/KeyBindings';
import { RebindMenu } from '@/input/RebindMenu';
import { MouseSteering } from '@/input/MouseSteering';
import { ChunkManager } from '@/world/ChunkManager';
import { SettingsStore } from '@/settings/SettingsStore';
import { allParams } from '@/settings/ParameterDefs';
import { SettingsPanel } from '@/settings/ui/SettingsPanel';
import { bindWorldSettings } from '@/settings/WorldSettingsBinding';
import { HUD } from '@/ui/HUD';

async function main() {
  const app = document.querySelector<HTMLDivElement>('#app')!;
  const engine = new Engine(app);

  engine.scene.background = new THREE.Color(0x87ceeb);
  engine.scene.fog = new THREE.Fog(0x87ceeb, 60, 220);

  const hemiLight = new THREE.HemisphereLight(0xddeeff, 0x444433, 1.2);
  engine.scene.add(hemiLight);

  const sun = new THREE.DirectionalLight(0xffffff, 2);
  sun.position.set(20, 30, 10);
  engine.scene.add(sun);

  const RAPIER = await initPhysics();
  const physics = new PhysicsWorld();

  // Streamed flat ground chunks around the player; Milestone 7 swaps the flat
  // tiles for sampled heightfield terrain without changing this lifecycle.
  const chunkManager = new ChunkManager(RAPIER, engine.scene, physics.world, 80, 2);
  chunkManager.update(0, 0);

  // Vehicle: spawn just above the sampled terrain height at the origin.
  const tuning = defaultVehicleTuning;
  const spawnGroundHeight = chunkManager.heightField.sample(0, 0);
  const vehicle = new VehicleController(physics.world, tuning, {
    x: 0,
    y: spawnGroundHeight + 1.2,
    z: 0,
  });
  const carVisual = new CarVisual(vehicle, vehicle.chassis, tuning);
  engine.scene.add(carVisual.group);

  const chaseCamera = new ChaseCamera(engine.camera);
  const input = new InputManager();
  const keyBindings = new KeyBindings();
  const rebindMenu = new RebindMenu(keyBindings, input);
  const mouseSteering = new MouseSteering(app);

  const settingsStore = new SettingsStore(allParams);
  const settingsPanel = new SettingsPanel(settingsStore);
  bindWorldSettings(settingsStore, {
    chunkManager,
    mouseSteering,
    scene: engine.scene,
    sun,
    hemiLight,
    vehicleTuning: tuning,
  });

  const hud = new HUD();

  let openSettingsWasHeld = false;
  let openWorldSettingsWasHeld = false;

  engine.onFixedUpdate((dt) => {
    const openSettingsHeld = input.isActionHeld(keyBindings, 'openSettings');
    if (openSettingsHeld && !openSettingsWasHeld) {
      rebindMenu.toggle();
    }
    openSettingsWasHeld = openSettingsHeld;

    const openWorldSettingsHeld = input.isActionHeld(keyBindings, 'openWorldSettings');
    if (openWorldSettingsHeld && !openWorldSettingsWasHeld) {
      settingsPanel.toggle();
    }
    openWorldSettingsWasHeld = openWorldSettingsHeld;

    const throttle = input.isActionHeld(keyBindings, 'throttle') ? 1 : 0;
    const brakeKey = input.isActionHeld(keyBindings, 'brake') ? 1 : 0;
    // Reverse: if stationary/slow and holding "brake" key, treat as reverse throttle instead.
    const speed = vehicle.currentSpeed();
    let finalThrottle = throttle;
    let finalBrake = 0;
    if (brakeKey) {
      if (speed > 0.5) {
        finalBrake = 1;
      } else {
        finalThrottle = -1;
      }
    }

    let steer: number;
    if (mouseSteering.isActive()) {
      // Mouse offset is positive when the mouse moves right; keyboard's
      // convention is "steerRight" contributing negatively, so flip sign.
      steer = -mouseSteering.getSteer();
    } else {
      const steerLeft = input.isActionHeld(keyBindings, 'steerLeft');
      const steerRight = input.isActionHeld(keyBindings, 'steerRight');
      steer = (steerLeft ? 1 : 0) - (steerRight ? 1 : 0);
    }

    vehicle.update(dt, { throttle: finalThrottle, brake: finalBrake, steer });
    physics.step();

    const carPos = vehicle.chassis.translation();
    chunkManager.update(carPos.x, carPos.z);
  });

  engine.onRender((_alpha) => {
    carVisual.update();
    chaseCamera.update(carVisual.group, 1 / 60);
    hud.update(vehicle.currentSpeed(), vehicle.getWheelState(0).steering, tuning.maxSteerAngle);
  });

  engine.start();
}

main();

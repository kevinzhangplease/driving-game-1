import * as THREE from 'three';
import './style.css';
import { Engine } from '@/core/Engine';
import { initPhysics, PhysicsWorld } from '@/core/PhysicsWorld';
import { VehicleController } from '@/vehicle/VehicleController';
import { CarVisual } from '@/vehicle/CarVisual';
import { ChaseCamera, cameraModeLabels } from '@/vehicle/ChaseCamera';
import { defaultVehicleTuning } from '@/vehicle/VehicleTuning';
import { InputManager } from '@/input/InputManager';
import { KeyBindings } from '@/input/KeyBindings';
import { RebindMenu } from '@/input/RebindMenu';
import { MouseSteering } from '@/input/MouseSteering';
import { TouchControls } from '@/input/TouchControls';
import { ChunkManager } from '@/world/ChunkManager';
import { SettingsStore } from '@/settings/SettingsStore';
import { allParams } from '@/settings/ParameterDefs';
import { SettingsPanel } from '@/settings/ui/SettingsPanel';
import { bindWorldSettings } from '@/settings/WorldSettingsBinding';
import { HUD } from '@/ui/HUD';
import { Minimap } from '@/ui/Minimap';
import { TopBarMenu } from '@/ui/TopBarMenu';

async function main() {
  const app = document.querySelector<HTMLDivElement>('#app')!;
  const engine = new Engine(app);

  engine.scene.background = new THREE.Color(0x87ceeb);
  engine.scene.fog = new THREE.Fog(0x87ceeb, 60, 220);

  const hemiLight = new THREE.HemisphereLight(0xddeeff, 0x444433, 1.2);
  engine.scene.add(hemiLight);

  const sun = new THREE.DirectionalLight(0xffffff, 2);
  sun.position.set(20, 30, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 150;
  sun.shadow.camera.left = -60;
  sun.shadow.camera.right = 60;
  sun.shadow.camera.top = 60;
  sun.shadow.camera.bottom = -60;
  sun.shadow.bias = -0.002;
  engine.scene.add(sun);
  engine.scene.add(sun.target);

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

  const chaseCamera = new ChaseCamera(engine.camera, tuning);
  const input = new InputManager();
  const keyBindings = new KeyBindings();
  const rebindMenu = new RebindMenu(keyBindings, input);
  const mouseSteering = new MouseSteering(app);
  const touchControls = new TouchControls();

  const hud = new HUD();
  const minimap = new Minimap();

  const settingsStore = new SettingsStore(allParams);
  const settingsPanel = new SettingsPanel(settingsStore);
  const topBar = new TopBarMenu(
    () => settingsPanel.toggle(),
    () => rebindMenu.toggle(),
    () => topBar.setCameraLabel(cameraModeLabels[chaseCamera.cycleMode()]),
  );
  topBar.setCameraLabel(cameraModeLabels[chaseCamera.getMode()]);
  bindWorldSettings(settingsStore, {
    chunkManager,
    mouseSteering,
    scene: engine.scene,
    sun,
    hemiLight,
    vehicleTuning: tuning,
    vehicle,
    hud,
  });

  let openSettingsWasHeld = false;
  let openWorldSettingsWasHeld = false;
  let cameraToggleWasHeld = false;

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

    const cameraToggleHeld = input.isActionHeld(keyBindings, 'cameraToggle');
    if (cameraToggleHeld && !cameraToggleWasHeld) {
      topBar.setCameraLabel(cameraModeLabels[chaseCamera.cycleMode()]);
    }
    cameraToggleWasHeld = cameraToggleHeld;

    const throttle =
      input.isActionHeld(keyBindings, 'throttle') || touchControls.isHeld('throttle') ? 1 : 0;
    const brakeKey =
      input.isActionHeld(keyBindings, 'brake') || touchControls.isHeld('brake') ? 1 : 0;
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
      const steerLeft = input.isActionHeld(keyBindings, 'steerLeft') || touchControls.isHeld('steerLeft');
      const steerRight = input.isActionHeld(keyBindings, 'steerRight') || touchControls.isHeld('steerRight');
      steer = (steerLeft ? 1 : 0) - (steerRight ? 1 : 0);
    }

    vehicle.update(dt, { throttle: finalThrottle, brake: finalBrake, steer });
    physics.step();

    const carPos = vehicle.chassis.translation();
    chunkManager.update(carPos.x, carPos.z);

    if (settingsStore.getBoolean('gameplay.restartOnFlip')) {
      const r = vehicle.chassis.rotation();
      const orientation = new THREE.Quaternion(r.x, r.y, r.z, r.w);
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(orientation);
      if (up.y < -0.2) {
        const groundY = chunkManager.heightField.sample(carPos.x, carPos.z);
        vehicle.chassis.setTranslation({ x: carPos.x, y: groundY + 2, z: carPos.z }, true);
        vehicle.chassis.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
        vehicle.chassis.setLinvel({ x: 0, y: 0, z: 0 }, true);
        vehicle.chassis.setAngvel({ x: 0, y: 0, z: 0 }, true);
      }
    }
  });

  engine.onRender((_alpha) => {
    carVisual.update();
    chaseCamera.update(carVisual.group, 1 / 60);
    hud.update(vehicle.currentSpeed(), vehicle.getWheelState(0).steering, tuning.maxSteerAngle);

    // The directional light's shadow frustum is small and fixed in size, so
    // it must be recentered on the car each frame in this infinite world,
    // rather than staying anchored near the origin.
    const carPos = vehicle.chassis.translation();
    const sunDirection = (sun.userData.direction as THREE.Vector3) ?? new THREE.Vector3(0.5, 0.75, 0.25).normalize();
    sun.position.set(carPos.x, 0, carPos.z).addScaledVector(sunDirection, 40);
    sun.target.position.set(carPos.x, carPos.y, carPos.z);
    sun.target.updateMatrixWorld();

    const r = vehicle.chassis.rotation();
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(new THREE.Quaternion(r.x, r.y, r.z, r.w));
    const headingRad = Math.atan2(forward.x, -forward.z);
    minimap.update(carPos.x, carPos.z, headingRad, chunkManager.roadGraph);
  });

  engine.start();
}

main();

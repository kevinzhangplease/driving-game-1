import * as THREE from 'three';
import './style.css';
import { Engine } from '@/core/Engine';
import { initPhysics, PhysicsWorld } from '@/core/PhysicsWorld';
import { VehicleController } from '@/vehicle/VehicleController';
import { CarVisual } from '@/vehicle/CarVisual';
import { ChaseCamera } from '@/vehicle/ChaseCamera';
import { defaultVehicleTuning } from '@/vehicle/VehicleTuning';
import { InputManager } from '@/input/InputManager';

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

  // Static flat ground: visual + Rapier collider.
  const groundMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 400),
    new THREE.MeshStandardMaterial({ color: 0x4a7c59 }),
  );
  groundMesh.rotation.x = -Math.PI / 2;
  engine.scene.add(groundMesh);

  const groundBody = physics.world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
  physics.world.createCollider(
    RAPIER.ColliderDesc.cuboid(200, 0.1, 200).setTranslation(0, -0.1, 0),
    groundBody,
  );

  // Vehicle
  const tuning = defaultVehicleTuning;
  const vehicle = new VehicleController(physics.world, tuning, { x: 0, y: 1.2, z: 0 });
  const carVisual = new CarVisual(vehicle, vehicle.chassis, tuning);
  engine.scene.add(carVisual.group);

  const chaseCamera = new ChaseCamera(engine.camera);
  const input = new InputManager();

  engine.onFixedUpdate((dt) => {
    const throttle = input.isAnyHeld(['KeyW', 'ArrowUp']) ? 1 : 0;
    const brakeKey = input.isAnyHeld(['KeyS', 'ArrowDown']) ? 1 : 0;
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
    const steerLeft = input.isAnyHeld(['KeyA', 'ArrowLeft']);
    const steerRight = input.isAnyHeld(['KeyD', 'ArrowRight']);
    const steer = (steerLeft ? 1 : 0) - (steerRight ? 1 : 0);

    vehicle.update(dt, { throttle: finalThrottle, brake: finalBrake, steer });
    physics.step();
  });

  engine.onRender((_alpha) => {
    carVisual.update();
    chaseCamera.update(carVisual.group, 1 / 60);
  });

  engine.start();
}

main();

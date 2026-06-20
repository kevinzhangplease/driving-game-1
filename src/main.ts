import * as THREE from 'three';
import './style.css';
import { Engine } from '@/core/Engine';
import { initPhysics, PhysicsWorld } from '@/core/PhysicsWorld';

async function main() {
  const app = document.querySelector<HTMLDivElement>('#app')!;
  const engine = new Engine(app);

  engine.scene.background = new THREE.Color(0x87ceeb);

  const hemiLight = new THREE.HemisphereLight(0xddeeff, 0x444433, 1.2);
  engine.scene.add(hemiLight);

  const sun = new THREE.DirectionalLight(0xffffff, 2);
  sun.position.set(20, 30, 10);
  engine.scene.add(sun);

  engine.camera.position.set(0, 4, 8);
  engine.camera.lookAt(0, 1, 0);

  const RAPIER = await initPhysics();
  const physics = new PhysicsWorld();

  // Static flat ground: visual + Rapier collider.
  const groundMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    new THREE.MeshStandardMaterial({ color: 0x4a7c59 }),
  );
  groundMesh.rotation.x = -Math.PI / 2;
  engine.scene.add(groundMesh);

  const groundBody = physics.world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
  physics.world.createCollider(
    RAPIER.ColliderDesc.cuboid(50, 0.1, 50).setTranslation(0, -0.1, 0),
    groundBody,
  );

  // Dynamic test cube dropped from height.
  const cubeMesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0xff4444 }),
  );
  engine.scene.add(cubeMesh);

  const cubeBody = physics.world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 8, 0),
  );
  physics.world.createCollider(RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5), cubeBody);

  engine.onFixedUpdate(() => {
    physics.step();
  });

  engine.onRender(() => {
    const t = cubeBody.translation();
    const r = cubeBody.rotation();
    cubeMesh.position.set(t.x, t.y, t.z);
    cubeMesh.quaternion.set(r.x, r.y, r.z, r.w);
  });

  engine.start();
}

main();

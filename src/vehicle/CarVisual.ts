import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import type { VehicleController } from './VehicleController';
import type { VehicleTuning } from './VehicleTuning';

export class CarVisual {
  readonly group: THREE.Group;
  private wheelMeshes: THREE.Group[] = [];
  private vehicle: VehicleController;
  private chassis: RAPIER.RigidBody;

  constructor(vehicle: VehicleController, chassis: RAPIER.RigidBody, tuning: VehicleTuning) {
    this.vehicle = vehicle;
    this.chassis = chassis;
    this.group = new THREE.Group();

    const { x: hx, y: hy, z: hz } = tuning.chassisHalfExtents;
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a6fdb,
      transparent: true,
      opacity: 0.55,
    });

    // Lower body: full width/length, slightly shorter than the physics
    // chassis box so the cabin reads as a distinct volume on top.
    const lowerHeight = hy * 1.3;
    const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(hx * 2, lowerHeight, hz * 2), bodyMaterial);
    lowerBody.position.y = tuning.centerOfMassHeight - hy * 0.35;
    lowerBody.castShadow = true;
    lowerBody.receiveShadow = true;
    this.group.add(lowerBody);

    // Cabin/greenhouse: narrower and shorter, set back slightly from the
    // nose like a sedan roofline.
    const cabinWidth = hx * 1.5;
    const cabinHeight = hy * 1.1;
    const cabinLength = hz * 1.2;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(cabinWidth, cabinHeight, cabinLength), bodyMaterial);
    cabin.position.set(0, tuning.centerOfMassHeight + lowerHeight / 2 + cabinHeight / 2, -hz * 0.15);
    cabin.castShadow = true;
    this.group.add(cabin);

    for (let i = 0; i < vehicle.numWheels; i++) {
      const wheelGroup = new THREE.Group();
      const wheelMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(
          tuning.wheelRadius,
          tuning.wheelRadius,
          tuning.wheelHalfWidth * 2,
          16,
        ),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a }),
      );
      wheelMesh.rotation.z = Math.PI / 2;
      wheelMesh.castShadow = true;
      wheelGroup.add(wheelMesh);
      this.group.add(wheelGroup);
      this.wheelMeshes.push(wheelGroup);
    }
  }

  update(): void {
    const t = this.chassis.translation();
    const r = this.chassis.rotation();
    this.group.position.set(t.x, t.y, t.z);
    this.group.quaternion.set(r.x, r.y, r.z, r.w);

    for (let i = 0; i < this.wheelMeshes.length; i++) {
      const wheelState = this.vehicle.getWheelState(i);
      const wheelGroup = this.wheelMeshes[i]!;
      const conn = wheelState.connectionPoint;
      wheelGroup.position.set(
        conn.x,
        conn.y - wheelState.suspensionLength,
        conn.z,
      );
      wheelGroup.rotation.set(0, 0, 0);
      wheelGroup.rotateY(wheelState.steering);
      wheelGroup.rotateX(wheelState.rotation);
    }
  }
}

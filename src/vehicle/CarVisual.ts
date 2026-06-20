import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import type { VehicleController } from './VehicleController';
import type { VehicleTuning } from './VehicleTuning';

export class CarVisual {
  readonly group: THREE.Group;
  private chassisMesh: THREE.Mesh;
  private wheelMeshes: THREE.Group[] = [];
  private vehicle: VehicleController;
  private chassis: RAPIER.RigidBody;

  constructor(vehicle: VehicleController, chassis: RAPIER.RigidBody, tuning: VehicleTuning) {
    this.vehicle = vehicle;
    this.chassis = chassis;
    this.group = new THREE.Group();

    const { x: hx, y: hy, z: hz } = tuning.chassisHalfExtents;
    this.chassisMesh = new THREE.Mesh(
      new THREE.BoxGeometry(hx * 2, hy * 2, hz * 2),
      new THREE.MeshStandardMaterial({ color: 0x2a6fdb }),
    );
    this.chassisMesh.position.y = tuning.centerOfMassHeight;
    this.group.add(this.chassisMesh);

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

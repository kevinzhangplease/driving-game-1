import * as THREE from 'three';

export class ChaseCamera {
  private offset = new THREE.Vector3(0, 3.2, -7.5);
  private lookOffset = new THREE.Vector3(0, 1.2, 4);
  private currentPos = new THREE.Vector3();
  private currentLook = new THREE.Vector3();
  private initialized = false;
  private camera: THREE.PerspectiveCamera;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
  }

  update(target: THREE.Object3D, dt: number): void {
    const desiredPos = this.offset.clone().applyQuaternion(target.quaternion).add(target.position);
    const desiredLook = this.lookOffset
      .clone()
      .applyQuaternion(target.quaternion)
      .add(target.position);

    if (!this.initialized) {
      this.currentPos.copy(desiredPos);
      this.currentLook.copy(desiredLook);
      this.initialized = true;
    } else {
      const posLerp = 1 - Math.pow(0.001, dt);
      const lookLerp = 1 - Math.pow(0.0005, dt);
      this.currentPos.lerp(desiredPos, posLerp);
      this.currentLook.lerp(desiredLook, lookLerp);
    }

    this.camera.position.copy(this.currentPos);
    this.camera.lookAt(this.currentLook);
  }
}

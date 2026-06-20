import * as THREE from 'three';
import type { VehicleTuning } from './VehicleTuning';

export type CameraMode = 'chase' | 'bumper' | 'dashboard';

export const cameraModeOrder: CameraMode[] = ['chase', 'bumper', 'dashboard'];

export const cameraModeLabels: Record<CameraMode, string> = {
  chase: 'Chase',
  bumper: 'Bumper',
  dashboard: 'Dashboard',
};

interface ModeConfig {
  offset: THREE.Vector3;
  lookOffset: THREE.Vector3;
  // Chase smoothly trails the car; bumper/dashboard are rigidly mounted to
  // it, so they should snap exactly each frame instead of lagging behind.
  smoothed: boolean;
}

export class ChaseCamera {
  private camera: THREE.PerspectiveCamera;
  private currentPos = new THREE.Vector3();
  private currentLook = new THREE.Vector3();
  private initialized = false;
  private mode: CameraMode = 'chase';
  private modes: Record<CameraMode, ModeConfig>;

  constructor(camera: THREE.PerspectiveCamera, tuning: VehicleTuning) {
    this.camera = camera;

    const hz = tuning.chassisHalfExtents.z;
    const comY = tuning.centerOfMassHeight;

    this.modes = {
      chase: {
        offset: new THREE.Vector3(0, 3.2, -7.5),
        lookOffset: new THREE.Vector3(0, 1.2, 4),
        smoothed: true,
      },
      bumper: {
        // Mounted just behind the front bumper, low to the ground.
        offset: new THREE.Vector3(0, comY + 0.55, hz - 0.2),
        lookOffset: new THREE.Vector3(0, comY + 0.4, hz + 10),
        smoothed: false,
      },
      dashboard: {
        // Roughly the driver's eye position behind the windshield, just
        // under the cabin roof (see CarVisual's cabin height proportions).
        offset: new THREE.Vector3(0, comY + tuning.chassisHalfExtents.y * 1.6, hz * 0.15),
        lookOffset: new THREE.Vector3(0, comY + tuning.chassisHalfExtents.y * 1.4, hz + 10),
        smoothed: false,
      },
    };
  }

  setMode(mode: CameraMode): void {
    this.mode = mode;
    // Force an immediate snap to the new mode's position rather than
    // lerping across the scene from the previous mode's viewpoint.
    this.initialized = false;
  }

  cycleMode(): CameraMode {
    const next = cameraModeOrder[(cameraModeOrder.indexOf(this.mode) + 1) % cameraModeOrder.length]!;
    this.setMode(next);
    return next;
  }

  getMode(): CameraMode {
    return this.mode;
  }

  update(target: THREE.Object3D, dt: number): void {
    const config = this.modes[this.mode];
    const desiredPos = config.offset.clone().applyQuaternion(target.quaternion).add(target.position);
    const desiredLook = config.lookOffset
      .clone()
      .applyQuaternion(target.quaternion)
      .add(target.position);

    if (!this.initialized || !config.smoothed) {
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

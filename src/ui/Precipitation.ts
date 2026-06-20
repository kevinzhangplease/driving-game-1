import * as THREE from 'three';

export type PrecipitationMode = 'none' | 'rain' | 'snow';

const COUNT = 1500;
// Half-extent of the cube of particles kept centered on the camera. Particles
// that fall below the box bottom wrap back to the top, so the finite particle
// set gives the impression of continuous weather everywhere.
const AREA = 40;
const HEIGHT = 50;

// A camera-following cube of falling points, switchable between rain (fast,
// vertical, pale streak-like points) and snow (slow, drifting, larger flakes).
export class Precipitation {
  private points: THREE.Points;
  private velocities: Float32Array;
  private mode: PrecipitationMode = 'none';

  constructor(scene: THREE.Scene) {
    const positions = new Float32Array(COUNT * 3);
    this.velocities = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * AREA * 2;
      positions[i * 3 + 1] = Math.random() * HEIGHT;
      positions[i * 3 + 2] = (Math.random() - 0.5) * AREA * 2;
      this.velocities[i] = 0.5 + Math.random() * 0.5;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.18,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    });

    this.points = new THREE.Points(geometry, material);
    this.points.frustumCulled = false;
    this.points.visible = false;
    scene.add(this.points);
  }

  setMode(mode: PrecipitationMode): void {
    this.mode = mode;
    this.points.visible = mode !== 'none';
    const material = this.points.material as THREE.PointsMaterial;
    if (mode === 'snow') {
      material.size = 0.32;
      material.opacity = 0.9;
    } else if (mode === 'rain') {
      material.size = 0.14;
      material.opacity = 0.6;
    }
  }

  // dt in seconds; camX/camZ keep the particle box centered on the camera.
  update(dt: number, camX: number, camY: number, camZ: number): void {
    if (this.mode === 'none') return;

    this.points.position.set(camX, camY, camZ);
    const positions = this.points.geometry.getAttribute('position') as THREE.BufferAttribute;
    const fallSpeed = this.mode === 'rain' ? 60 : 8;
    const driftAmount = this.mode === 'snow' ? 1 : 0;

    for (let i = 0; i < COUNT; i++) {
      let y = positions.getY(i) - fallSpeed * this.velocities[i]! * dt;
      if (y < -HEIGHT / 2) {
        y = HEIGHT / 2;
      }
      positions.setY(i, y);
      if (driftAmount > 0) {
        const x = positions.getX(i) + Math.sin((y + i) * 0.5) * driftAmount * dt;
        positions.setX(i, x);
      }
    }
    positions.needsUpdate = true;
  }
}

import * as THREE from 'three';

const FIXED_TIMESTEP = 1 / 60;
const MAX_SUBSTEPS = 5;

export type UpdateFn = (fixedDt: number) => void;
export type RenderFn = (alpha: number) => void;

export class Engine {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly timer: THREE.Timer;

  private updateFns: UpdateFn[] = [];
  private renderFns: RenderFn[] = [];
  private accumulator = 0;
  private running = false;

  constructor(container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.1,
      2000,
    );
    this.camera.position.set(0, 5, 10);

    this.timer = new THREE.Timer();
    this.timer.connect(document);

    window.addEventListener('resize', this.onResize);
  }

  onFixedUpdate(fn: UpdateFn): void {
    this.updateFns.push(fn);
  }

  onRender(fn: RenderFn): void {
    this.renderFns.push(fn);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.renderer.setAnimationLoop(this.tick);
  }

  stop(): void {
    this.running = false;
    this.renderer.setAnimationLoop(null);
  }

  private tick = (timestamp: number): void => {
    this.timer.update(timestamp);
    const frameDt = Math.min(this.timer.getDelta(), 0.1);
    this.accumulator += frameDt;

    let steps = 0;
    while (this.accumulator >= FIXED_TIMESTEP && steps < MAX_SUBSTEPS) {
      for (const fn of this.updateFns) fn(FIXED_TIMESTEP);
      this.accumulator -= FIXED_TIMESTEP;
      steps++;
    }
    if (steps >= MAX_SUBSTEPS) this.accumulator = 0;

    const alpha = this.accumulator / FIXED_TIMESTEP;
    for (const fn of this.renderFns) fn(alpha);

    this.renderer.render(this.scene, this.camera);
  };

  private onResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };
}

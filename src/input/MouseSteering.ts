function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// Pointer-lock based mouse steering: tracks a virtual "wheel" offset built
// from accumulated relative mouse deltas (not absolute cursor position,
// which would hit the screen edge), self-centering over time like a real
// steering wheel released by the driver.
export class MouseSteering {
  sensitivity = 0.0022;
  linearity = 1.6;
  private decayPerSecond = 1.4;

  private offset = 0;
  private locked = false;
  private target: HTMLElement;

  constructor(target: HTMLElement) {
    this.target = target;
    target.addEventListener('click', () => {
      target.requestPointerLock();
    });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.target;
    });
    document.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this.offset = clamp(this.offset + e.movementX * this.sensitivity, -1, 1);
    });
  }

  update(dt: number): void {
    this.offset *= Math.exp(-this.decayPerSecond * dt);
  }

  isActive(): boolean {
    return this.locked;
  }

  getSteer(): number {
    const sign = Math.sign(this.offset);
    return sign * Math.pow(Math.abs(this.offset), this.linearity);
  }
}

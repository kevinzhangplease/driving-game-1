import './hud.css';

const DIAL_SIZE = 96;
const DIAL_RADIUS = DIAL_SIZE / 2 - 6;
// Visual sweep is exaggerated relative to the real wheel angle so small
// steering inputs are still readable on a small dial.
const DIAL_VISUAL_RANGE_RAD = Math.PI / 2;

// Bottom-center overlay showing live speed and a steering-wheel-angle dial.
export class HUD {
  private root: HTMLDivElement;
  private speedValueEl: HTMLDivElement;
  private dialCanvas: HTMLCanvasElement;
  private dialCtx: CanvasRenderingContext2D;

  constructor() {
    this.root = document.createElement('div');
    this.root.id = 'hud';

    const speedEl = document.createElement('div');
    speedEl.className = 'hud-speed';
    this.speedValueEl = document.createElement('div');
    this.speedValueEl.className = 'hud-speed-value';
    this.speedValueEl.textContent = '0';
    const speedUnit = document.createElement('div');
    speedUnit.className = 'hud-speed-unit';
    speedUnit.textContent = 'km/h';
    speedEl.append(this.speedValueEl, speedUnit);

    this.dialCanvas = document.createElement('canvas');
    this.dialCanvas.width = DIAL_SIZE;
    this.dialCanvas.height = DIAL_SIZE;
    this.dialCanvas.className = 'hud-dial';
    this.dialCtx = this.dialCanvas.getContext('2d')!;

    this.root.append(this.dialCanvas, speedEl);
    document.body.appendChild(this.root);

    this.drawDial(0);
  }

  // speedMps: forward speed in meters/second. steerRad: current front-wheel
  // steering angle in radians. maxSteerRad: the tuning's max angle, used to
  // normalize the needle sweep regardless of the configured max.
  update(speedMps: number, steerRad: number, maxSteerRad: number): void {
    const kph = Math.abs(speedMps) * 3.6;
    this.speedValueEl.textContent = String(Math.round(kph));

    const normalized = maxSteerRad > 0 ? steerRad / maxSteerRad : 0;
    this.drawDial(normalized);
  }

  private drawDial(normalizedAngle: number): void {
    const ctx = this.dialCtx;
    const cx = DIAL_SIZE / 2;
    const cy = DIAL_SIZE / 2;

    ctx.clearRect(0, 0, DIAL_SIZE, DIAL_SIZE);

    ctx.beginPath();
    ctx.arc(cx, cy, DIAL_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(20, 24, 28, 0.85)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#444';
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx - DIAL_RADIUS * 0.9, cy);
    ctx.lineTo(cx + DIAL_RADIUS * 0.9, cy);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.stroke();

    const angle = -Math.PI / 2 + normalizedAngle * DIAL_VISUAL_RANGE_RAD;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.sin(angle) * DIAL_RADIUS * 0.85, cy - Math.cos(angle) * DIAL_RADIUS * 0.85);
    ctx.strokeStyle = '#4a7dff';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#eee';
    ctx.fill();
  }
}

import './hud.css';

const DIAL_SIZE = 96;
const DIAL_RADIUS = DIAL_SIZE / 2 - 6;
// Visual sweep is exaggerated relative to the real wheel angle so small
// steering inputs are still readable on a small dial.
const DIAL_VISUAL_RANGE_RAD = Math.PI / 2;

// Bottom-center overlay showing live speed and a steering-wheel-angle dial.
export type SpeedUnits = 'kph' | 'mph';

export class HUD {
  private root: HTMLDivElement;
  private speedValueEl: HTMLDivElement;
  private speedUnitEl: HTMLDivElement;
  private dialCanvas: HTMLCanvasElement;
  private dialCtx: CanvasRenderingContext2D;
  private units: SpeedUnits = 'kph';

  constructor() {
    this.root = document.createElement('div');
    this.root.id = 'hud';

    const speedEl = document.createElement('div');
    speedEl.className = 'hud-speed';
    this.speedValueEl = document.createElement('div');
    this.speedValueEl.className = 'hud-speed-value';
    this.speedValueEl.textContent = '0';
    this.speedUnitEl = document.createElement('div');
    this.speedUnitEl.className = 'hud-speed-unit';
    this.speedUnitEl.textContent = 'km/h';
    speedEl.append(this.speedValueEl, this.speedUnitEl);

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
    const display = this.units === 'mph' ? Math.abs(speedMps) * 2.237 : Math.abs(speedMps) * 3.6;
    this.speedValueEl.textContent = String(Math.round(display));

    const normalized = maxSteerRad > 0 ? steerRad / maxSteerRad : 0;
    this.drawDial(normalized);
  }

  setUnits(units: SpeedUnits): void {
    this.units = units;
    this.speedUnitEl.textContent = units === 'mph' ? 'mph' : 'km/h';
  }

  setVisible(visible: boolean): void {
    this.root.style.display = visible ? '' : 'none';
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
    ctx.moveTo(cx, cy - DIAL_RADIUS * 0.9);
    ctx.lineTo(cx, cy + DIAL_RADIUS * 0.9);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.stroke();

    const angle = normalizedAngle * DIAL_VISUAL_RANGE_RAD;
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

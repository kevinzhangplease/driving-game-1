import type { RoadGraph } from '@/world/roads/RoadGraph';
import './minimap.css';

const SIZE = 180;
// Total world-meters spanned by the minimap's width/height; the car is
// always drawn centered, with the world scrolling/rotating-free under it.
const RANGE_METERS = 240;
const SCALE = SIZE / RANGE_METERS;

// Fixed top-left overlay showing nearby road segments (world-space, north-up)
// and a triangular marker for the car's position/heading.
export class Minimap {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = SIZE;
    this.canvas.height = SIZE;
    this.canvas.id = 'minimap';
    this.ctx = this.canvas.getContext('2d')!;
    document.body.appendChild(this.canvas);
  }

  update(carX: number, carZ: number, headingRad: number, roadGraph: RoadGraph): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, SIZE, SIZE);

    ctx.fillStyle = 'rgba(20, 24, 28, 0.75)';
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#444';
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 2, 0, Math.PI * 2);
    ctx.clip();

    ctx.strokeStyle = '#888';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (const seg of roadGraph.segmentsNear(carX, carZ)) {
      ctx.beginPath();
      ctx.moveTo(SIZE / 2 + (seg.ax - carX) * SCALE, SIZE / 2 + (seg.az - carZ) * SCALE);
      ctx.lineTo(SIZE / 2 + (seg.bx - carX) * SCALE, SIZE / 2 + (seg.bz - carZ) * SCALE);
      ctx.stroke();
    }
    ctx.restore();

    // Car marker: a small triangle pointing along the car's forward (+z)
    // heading, always drawn at the map's center since the map scrolls with it.
    ctx.save();
    ctx.translate(SIZE / 2, SIZE / 2);
    ctx.rotate(headingRad);
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, 6);
    ctx.lineTo(-5, 6);
    ctx.closePath();
    ctx.fillStyle = '#4a7dff';
    ctx.fill();
    ctx.restore();
  }
}

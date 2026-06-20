import { mulberry32 } from '@/rng/SeededRandom';

export interface RoadGraphParams {
  seed: number;
  macroCellSize: number;
  edgeProbability: number;
  // Fraction (0-0.5) of macroCellSize a node may be jittered off the cell center.
  nodeJitter: number;
}

export const defaultRoadGraphParams: RoadGraphParams = {
  seed: 4242,
  macroCellSize: 320,
  edgeProbability: 0.65,
  nodeJitter: 0.3,
};

export interface RoadSegment {
  ax: number;
  az: number;
  bx: number;
  bz: number;
  // Identifies the macro cell + direction that generated this segment, so
  // placement systems can hash against stable integers instead of floats.
  macroX: number;
  macroZ: number;
  direction: 'horizontal' | 'vertical';
}

// Deterministic hash of integer macro-cell coordinates + a salt -> [0,1).
// Any chunk computes the exact same node/edge for a given macro cell, no
// matter which chunk triggers the computation, so borders never mismatch.
function hash01(ix: number, iz: number, salt: number, seed: number): number {
  const mixed = (Math.imul(ix, 73856093) ^ Math.imul(iz, 19349663) ^ Math.imul(salt, 83492791) ^ seed) >>> 0;
  return mulberry32(mixed)();
}

// A deterministic warped macro-grid: each macro cell owns one intersection
// node (jittered off its cell center), and each edge between adjacent macro
// cells either exists or doesn't, both as pure functions of cell coordinates
// and the seed. This guarantees identical road geometry at shared borders
// regardless of chunk generation order.
export class RoadGraph {
  private params: RoadGraphParams;

  constructor(params: RoadGraphParams) {
    this.params = params;
  }

  nodeWorldPos(macroX: number, macroZ: number): { x: number; z: number } {
    const { macroCellSize, nodeJitter, seed } = this.params;
    const jx = (hash01(macroX, macroZ, 1, seed) * 2 - 1) * nodeJitter * macroCellSize;
    const jz = (hash01(macroX, macroZ, 2, seed) * 2 - 1) * nodeJitter * macroCellSize;
    return {
      x: (macroX + 0.5) * macroCellSize + jx,
      z: (macroZ + 0.5) * macroCellSize + jz,
    };
  }

  hasEdge(macroX: number, macroZ: number, direction: 'horizontal' | 'vertical'): boolean {
    const salt = direction === 'horizontal' ? 10 : 11;
    return hash01(macroX, macroZ, salt, this.params.seed) < this.params.edgeProbability;
  }

  // All road segments whose endpoints lie in the 3x3 macro-cell neighborhood
  // around a world point - a safe superset for anything a chunk-sized region
  // needs, since an edge only ever connects two directly-adjacent macro cells.
  // True if any road segment touches this macro cell's intersection node
  // (an edge owned by this cell, or by the adjacent cell it connects to).
  nodeHasAnyEdge(macroX: number, macroZ: number): boolean {
    return (
      this.hasEdge(macroX, macroZ, 'horizontal') ||
      this.hasEdge(macroX, macroZ, 'vertical') ||
      this.hasEdge(macroX - 1, macroZ, 'horizontal') ||
      this.hasEdge(macroX, macroZ - 1, 'vertical')
    );
  }

  // Intersection nodes (with at least one connected edge) in the 3x3
  // macro-cell neighborhood around a world point.
  nodesNear(worldX: number, worldZ: number): Array<{ x: number; z: number; macroX: number; macroZ: number }> {
    const { macroCellSize } = this.params;
    const centerMacroX = Math.floor(worldX / macroCellSize);
    const centerMacroZ = Math.floor(worldZ / macroCellSize);
    const nodes: Array<{ x: number; z: number; macroX: number; macroZ: number }> = [];
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        const mx = centerMacroX + dx;
        const mz = centerMacroZ + dz;
        if (!this.nodeHasAnyEdge(mx, mz)) continue;
        const pos = this.nodeWorldPos(mx, mz);
        nodes.push({ x: pos.x, z: pos.z, macroX: mx, macroZ: mz });
      }
    }
    return nodes;
  }

  segmentsNear(worldX: number, worldZ: number): RoadSegment[] {
    const { macroCellSize } = this.params;
    const centerMacroX = Math.floor(worldX / macroCellSize);
    const centerMacroZ = Math.floor(worldZ / macroCellSize);
    const segments: RoadSegment[] = [];

    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        const mx = centerMacroX + dx;
        const mz = centerMacroZ + dz;

        if (this.hasEdge(mx, mz, 'horizontal')) {
          const a = this.nodeWorldPos(mx, mz);
          const b = this.nodeWorldPos(mx + 1, mz);
          segments.push({ ax: a.x, az: a.z, bx: b.x, bz: b.z, macroX: mx, macroZ: mz, direction: 'horizontal' });
        }
        if (this.hasEdge(mx, mz, 'vertical')) {
          const a = this.nodeWorldPos(mx, mz);
          const b = this.nodeWorldPos(mx, mz + 1);
          segments.push({ ax: a.x, az: a.z, bx: b.x, bz: b.z, macroX: mx, macroZ: mz, direction: 'vertical' });
        }
      }
    }
    return segments;
  }
}

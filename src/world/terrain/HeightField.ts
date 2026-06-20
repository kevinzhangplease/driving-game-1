import { createNoise2D, type NoiseFunction2D } from 'simplex-noise';
import { mulberry32 } from '@/rng/SeededRandom';

export interface HeightFieldParams {
  seed: number;
  baseFrequency: number;
  octaves: number;
  persistence: number;
  lacunarity: number;
  amplitude: number;
}

export const defaultHeightFieldParams: HeightFieldParams = {
  seed: 1337,
  baseFrequency: 0.004,
  octaves: 3,
  persistence: 0.4,
  lacunarity: 2,
  amplitude: 4,
};

// Pure function of (worldX, worldZ) given fixed params/seed: called identically
// for the visual mesh and the matching Rapier collider, so chunks generated
// independently still meet seamlessly at shared borders.
export class HeightField {
  private noise2D: NoiseFunction2D;
  private params: HeightFieldParams;

  constructor(params: HeightFieldParams) {
    this.params = params;
    this.noise2D = createNoise2D(mulberry32(params.seed));
  }

  sample(worldX: number, worldZ: number): number {
    const { baseFrequency, octaves, persistence, lacunarity, amplitude } = this.params;
    let freq = baseFrequency;
    let amp = 1;
    let sum = 0;
    let maxAmp = 0;
    for (let i = 0; i < octaves; i++) {
      sum += this.noise2D(worldX * freq, worldZ * freq) * amp;
      maxAmp += amp;
      amp *= persistence;
      freq *= lacunarity;
    }
    return (sum / maxAmp) * amplitude;
  }
}

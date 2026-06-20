import { createNoise2D, type NoiseFunction2D } from 'simplex-noise';
import { mulberry32 } from '@/rng/SeededRandom';

export interface HeightFieldParams {
  seed: number;
  baseFrequency: number;
  octaves: number;
  persistence: number;
  lacunarity: number;
  amplitude: number;
  // Biases the normalized height curve toward flat plateaus (positive) or
  // sharper peaks/valleys (negative), via a tunable power curve.
  plateauBias: number;
  // Adds a second, higher-frequency noise layer on top of the base shape for
  // small-scale jaggedness, independent of the main octave stack.
  rockiness: number;
}

export const defaultHeightFieldParams: HeightFieldParams = {
  seed: 1337,
  baseFrequency: 0.004,
  octaves: 3,
  persistence: 0.4,
  lacunarity: 2,
  amplitude: 4,
  plateauBias: 0,
  rockiness: 0.2,
};

// Pure function of (worldX, worldZ) given fixed params/seed: called identically
// for the visual mesh and the matching Rapier collider, so chunks generated
// independently still meet seamlessly at shared borders.
export class HeightField {
  private noise2D: NoiseFunction2D;
  private rockNoise2D: NoiseFunction2D;
  private params: HeightFieldParams;

  constructor(params: HeightFieldParams) {
    this.params = params;
    this.noise2D = createNoise2D(mulberry32(params.seed));
    this.rockNoise2D = createNoise2D(mulberry32(params.seed ^ 0x9e3779b9));
  }

  sample(worldX: number, worldZ: number): number {
    const { baseFrequency, octaves, persistence, lacunarity, amplitude, plateauBias, rockiness } =
      this.params;
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
    let normalized = sum / maxAmp;

    // plateauBias > 0 flattens mid-range slopes into plateaus; < 0 sharpens
    // peaks/valleys. Implemented as a power curve on the signed magnitude.
    if (plateauBias !== 0) {
      const power = Math.pow(2, -plateauBias * 2);
      normalized = Math.sign(normalized) * Math.pow(Math.abs(normalized), power);
    }

    const rockDetail =
      rockiness > 0 ? this.rockNoise2D(worldX * baseFrequency * 6, worldZ * baseFrequency * 6) * rockiness * 0.3 : 0;

    return normalized * amplitude + rockDetail * amplitude;
  }
}

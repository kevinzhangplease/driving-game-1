import { mulberry32 } from '@/rng/SeededRandom';

// Deterministic hash of arbitrary integer keys + a salt -> [0,1). Used by
// placement systems so a candidate building/tree/sign's existence and
// attributes depend only on its own identity (segment, index, salt) and the
// global seed, never on which chunk happened to discover it.
export function hash01(a: number, b: number, salt: number, seed: number): number {
  const mixed =
    (Math.imul(a, 73856093) ^ Math.imul(b, 19349663) ^ Math.imul(salt, 83492791) ^ seed) >>> 0;
  return mulberry32(mixed)();
}

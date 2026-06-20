import RAPIER from '@dimforge/rapier3d-compat';

let initialized = false;

export async function initPhysics(): Promise<typeof RAPIER> {
  if (!initialized) {
    await RAPIER.init();
    initialized = true;
  }
  return RAPIER;
}

export class PhysicsWorld {
  readonly world: RAPIER.World;

  constructor(gravity: RAPIER.Vector3 = { x: 0, y: -9.81, z: 0 }) {
    this.world = new RAPIER.World(gravity);
  }

  step(): void {
    this.world.step();
  }

  // Keeps Rapier's integration step in sync with the engine's fixed timestep
  // so physics stays correct when the tick rate changes.
  setTimestep(dt: number): void {
    this.world.timestep = dt;
  }
}

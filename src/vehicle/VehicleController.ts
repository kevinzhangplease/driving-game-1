import RAPIER from '@dimforge/rapier3d-compat';
import type { VehicleTuning } from './VehicleTuning';

export interface WheelState {
  connectionPoint: RAPIER.Vector;
  suspensionLength: number;
  rotation: number;
  steering: number;
  isFront: boolean;
}

const FRONT_LEFT = 0;
const FRONT_RIGHT = 1;
const REAR_LEFT = 2;
const REAR_RIGHT = 3;

export class VehicleController {
  readonly chassis: RAPIER.RigidBody;
  private controller: RAPIER.DynamicRayCastVehicleController;
  private tuning: VehicleTuning;
  private chassisCollider: RAPIER.Collider;

  constructor(world: RAPIER.World, tuning: VehicleTuning, spawnPosition: RAPIER.Vector) {
    this.tuning = tuning;

    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(spawnPosition.x, spawnPosition.y, spawnPosition.z)
      .setLinearDamping(0.1)
      .setAngularDamping(0.6)
      // The vehicle controller drives this body by setting wheel forces
      // directly rather than through collision impulses, which doesn't wake
      // a sleeping body — so keep it always simulated.
      .setCanSleep(false);
    this.chassis = world.createRigidBody(bodyDesc);

    const { x: hx, y: hy, z: hz } = tuning.chassisHalfExtents;
    const colliderDesc = RAPIER.ColliderDesc.cuboid(hx, hy, hz)
      .setTranslation(0, tuning.centerOfMassHeight, 0)
      .setMass(tuning.chassisMass)
      .setFriction(0.5);
    this.chassisCollider = world.createCollider(colliderDesc, this.chassis);

    this.controller = new RAPIER.DynamicRayCastVehicleController(
      this.chassis,
      world.broadPhase,
      world.narrowPhase,
      world.bodies,
      world.colliders,
    );
    this.controller.indexUpAxis = 1;
    // Note: rapier3d-compat 0.19's typings expose this setter under the name
    // `setIndexForwardAxis` (a quirk in the upstream package), not `indexForwardAxis`.
    this.controller.setIndexForwardAxis = 2;

    const halfTrack = tuning.trackWidth / 2;
    const halfWheelBase = tuning.wheelBase / 2;
    // Mount wheels just above the chassis underside so the suspension travels
    // downward from near the bottom of the body, not from its vertical middle.
    const wheelConnectionY = tuning.centerOfMassHeight - tuning.chassisHalfExtents.y + 0.2;

    const wheelPositions: RAPIER.Vector[] = [
      { x: -halfTrack, y: wheelConnectionY, z: halfWheelBase }, // front-left
      { x: halfTrack, y: wheelConnectionY, z: halfWheelBase }, // front-right
      { x: -halfTrack, y: wheelConnectionY, z: -halfWheelBase }, // rear-left
      { x: halfTrack, y: wheelConnectionY, z: -halfWheelBase }, // rear-right
    ];

    const suspensionDirection: RAPIER.Vector = { x: 0, y: -1, z: 0 };
    const axleDirection: RAPIER.Vector = { x: -1, y: 0, z: 0 };

    for (const pos of wheelPositions) {
      this.controller.addWheel(
        pos,
        suspensionDirection,
        axleDirection,
        tuning.suspensionRestLength,
        tuning.wheelRadius,
      );
    }

    for (let i = 0; i < 4; i++) {
      this.controller.setWheelSuspensionStiffness(i, tuning.suspensionStiffness);
      this.controller.setWheelSuspensionCompression(i, tuning.suspensionCompression);
      this.controller.setWheelSuspensionRelaxation(i, tuning.suspensionRelaxation);
      this.controller.setWheelMaxSuspensionTravel(i, tuning.maxSuspensionTravel);
      this.controller.setWheelMaxSuspensionForce(i, tuning.maxSuspensionForce);
      this.controller.setWheelFrictionSlip(i, tuning.frictionSlip);
      this.controller.setWheelSideFrictionStiffness(i, tuning.sideFrictionStiffness);
    }
  }

  update(dt: number, input: { throttle: number; brake: number; steer: number }): void {
    const t = this.tuning;
    const engineForce = input.throttle * t.maxEngineForce;
    const brakeForce = input.brake * t.maxBrakeForce;
    const steerAngle = input.steer * t.maxSteerAngle;

    for (const wheel of [REAR_LEFT, REAR_RIGHT]) {
      this.controller.setWheelEngineForce(wheel, engineForce);
    }
    for (const wheel of [FRONT_LEFT, FRONT_RIGHT, REAR_LEFT, REAR_RIGHT]) {
      this.controller.setWheelBrake(wheel, brakeForce);
    }
    for (const wheel of [FRONT_LEFT, FRONT_RIGHT]) {
      this.controller.setWheelSteering(wheel, steerAngle);
    }

    this.controller.updateVehicle(dt);
  }

  getWheelState(i: number): WheelState {
    return {
      connectionPoint: this.controller.wheelChassisConnectionPointCs(i)!,
      suspensionLength: this.controller.wheelSuspensionLength(i) ?? this.tuning.suspensionRestLength,
      rotation: this.controller.wheelRotation(i) ?? 0,
      steering: this.controller.wheelSteering(i) ?? 0,
      isFront: i === FRONT_LEFT || i === FRONT_RIGHT,
    };
  }

  get numWheels(): number {
    return this.controller.numWheels();
  }

  currentSpeed(): number {
    return this.controller.currentVehicleSpeed();
  }

  setSuspensionStiffness(stiffness: number): void {
    this.tuning.suspensionStiffness = stiffness;
    for (let i = 0; i < 4; i++) {
      this.controller.setWheelSuspensionStiffness(i, stiffness);
    }
  }

  setChassisMass(mass: number): void {
    this.tuning.chassisMass = mass;
    this.chassisCollider.setMass(mass);
  }
}

export interface VehicleTuning {
  chassisHalfExtents: { x: number; y: number; z: number };
  chassisMass: number;
  centerOfMassHeight: number;

  wheelRadius: number;
  wheelHalfWidth: number;
  wheelBase: number;
  trackWidth: number;
  suspensionRestLength: number;
  maxSuspensionTravel: number;
  suspensionStiffness: number;
  suspensionCompression: number;
  suspensionRelaxation: number;
  maxSuspensionForce: number;

  frictionSlip: number;
  sideFrictionStiffness: number;

  maxEngineForce: number;
  maxBrakeForce: number;
  maxSteerAngle: number;
}

export const defaultVehicleTuning: VehicleTuning = {
  chassisHalfExtents: { x: 0.9, y: 0.4, z: 2.0 },
  chassisMass: 1200,
  centerOfMassHeight: -0.35,

  wheelRadius: 0.35,
  wheelHalfWidth: 0.15,
  wheelBase: 2.6,
  trackWidth: 1.6,
  suspensionRestLength: 0.4,
  maxSuspensionTravel: 0.3,
  suspensionStiffness: 28,
  suspensionCompression: 0.3,
  suspensionRelaxation: 6,
  maxSuspensionForce: 100000,

  frictionSlip: 2.2,
  sideFrictionStiffness: 1,

  maxEngineForce: 3000,
  maxBrakeForce: 60,
  maxSteerAngle: 0.55,
};

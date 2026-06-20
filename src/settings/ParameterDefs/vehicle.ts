import { stub, type ParamDef } from '../ParameterRegistry';

export const vehicleParams: ParamDef[] = [
  {
    id: 'vehicle.maxSteerAngleDeg',
    label: 'Max Steering Angle',
    category: 'vehicle',
    widget: 'slider',
    defaultValue: 31.5,
    min: 10,
    max: 45,
    step: 1,
    tooltip: 'Maximum angle in degrees the front wheels can turn to, in either direction.',
    wired: true,
  },
  stub('vehicle.maxEngineForce', 'Engine Power', 'vehicle', 3000, 'slider', { min: 1000, max: 8000, step: 100 }),
  stub('vehicle.maxBrakeForce', 'Brake Force', 'vehicle', 60, 'slider', { min: 10, max: 200, step: 5 }),
  stub('vehicle.suspensionStiffness', 'Suspension Stiffness', 'vehicle', 28, 'slider', { min: 5, max: 60, step: 1 }),
  stub('vehicle.chassisMass', 'Chassis Mass (kg)', 'vehicle', 1200, 'slider', { min: 600, max: 2500, step: 50 }),
];

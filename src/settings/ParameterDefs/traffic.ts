import { stub, type ParamDef } from '../ParameterRegistry';

export const trafficParams: ParamDef[] = [
  stub('traffic.vehicleVolume', 'Traffic Volume', 'traffic', 0, 'slider', { min: 0, max: 1, step: 0.05 }),
  stub('traffic.pedestrianVolume', 'Pedestrian Volume', 'traffic', 0, 'slider', { min: 0, max: 1, step: 0.05 }),
  stub('traffic.aggressiveness', 'Driver Aggressiveness', 'traffic', 0.3, 'slider', { min: 0, max: 1, step: 0.05 }),
  stub('traffic.speedLimitKph', 'Speed Limit (kph)', 'traffic', 50, 'slider', { min: 20, max: 120, step: 5 }),
  stub('traffic.trafficLightDensity', 'Traffic Light Density', 'traffic', 0.3, 'slider', { min: 0, max: 1, step: 0.05 }),
  stub('traffic.jaywalkChance', 'Jaywalk Chance', 'traffic', 0.1, 'slider', { min: 0, max: 1, step: 0.05 }),
  stub('traffic.hornFrequency', 'Horn Frequency', 'traffic', 0.1, 'slider', { min: 0, max: 1, step: 0.05 }),
];

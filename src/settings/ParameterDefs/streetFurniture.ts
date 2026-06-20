import { stub, type ParamDef } from '../ParameterRegistry';

export const streetFurnitureParams: ParamDef[] = [
  {
    id: 'streetFurniture.signsEnabled',
    label: 'Intersection Signs',
    category: 'streetFurniture',
    widget: 'toggle',
    defaultValue: true,
    tooltip: 'Whether cosmetic sign posts are placed at road intersections.',
    wired: true,
  },
  stub('streetFurniture.lampPostDensity', 'Lamp Post Density', 'streetFurniture', 0.4, 'slider', { min: 0, max: 1, step: 0.05 }),
  stub('streetFurniture.benchDensity', 'Bench Density', 'streetFurniture', 0.1, 'slider', { min: 0, max: 1, step: 0.05 }),
  stub('streetFurniture.trashCanDensity', 'Trash Can Density', 'streetFurniture', 0.1, 'slider', { min: 0, max: 1, step: 0.05 }),
  stub('streetFurniture.busStopChance', 'Bus Stop Chance', 'streetFurniture', 0.05, 'slider', { min: 0, max: 1, step: 0.05 }),
  stub('streetFurniture.fireHydrantDensity', 'Fire Hydrant Density', 'streetFurniture', 0.05, 'slider', { min: 0, max: 1, step: 0.05 }),
  stub('streetFurniture.billboardChance', 'Billboard Chance', 'streetFurniture', 0.03, 'slider', { min: 0, max: 1, step: 0.01 }),
  stub('streetFurniture.fenceDensity', 'Fence Density', 'streetFurniture', 0.1, 'slider', { min: 0, max: 1, step: 0.05 }),
];

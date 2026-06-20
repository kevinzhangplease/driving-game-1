import { stub, type ParamDef } from '../ParameterRegistry';

export const urbanPlanningParams: ParamDef[] = [
  stub('urbanPlanning.zoningMix', 'Zoning Mix', 'urbanPlanning', 'mixed', 'select', {
    options: [
      { value: 'mixed', label: 'Mixed' },
      { value: 'residential', label: 'Residential' },
      { value: 'commercial', label: 'Commercial' },
      { value: 'industrial', label: 'Industrial' },
    ],
  }),
  stub('urbanPlanning.blockSize', 'City Block Size', 'urbanPlanning', 80, 'slider', { min: 40, max: 200, step: 10 }),
  stub('urbanPlanning.parkChance', 'Park Chance', 'urbanPlanning', 0.05, 'slider', { min: 0, max: 1, step: 0.05 }),
  stub('urbanPlanning.suburbFalloff', 'Suburb Falloff Distance', 'urbanPlanning', 1000, 'slider', { min: 200, max: 5000, step: 100 }),
  stub('urbanPlanning.downtownChance', 'Downtown Cluster Chance', 'urbanPlanning', 0.1, 'slider', { min: 0, max: 1, step: 0.05 }),
  stub('urbanPlanning.gridRegularity', 'Grid Regularity', 'urbanPlanning', 0.7, 'slider', { min: 0, max: 1, step: 0.05 }),
  stub('urbanPlanning.waterfrontChance', 'Waterfront Chance', 'urbanPlanning', 0.05, 'slider', { min: 0, max: 1, step: 0.05 }),
];

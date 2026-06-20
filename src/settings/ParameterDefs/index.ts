import type { ParamDef } from '../ParameterRegistry';
import { terrainParams } from './terrain';
import { roadParams } from './roads';
import { urbanPlanningParams } from './urbanPlanning';
import { architectureParams } from './architecture';
import { trafficParams } from './traffic';
import { vegetationParams } from './vegetation';
import { weatherParams } from './weather';
import { lightingParams } from './lighting';
import { streetFurnitureParams } from './streetFurniture';
import { gameplayParams } from './gameplay';

export const allParams: ParamDef[] = [
  ...terrainParams,
  ...roadParams,
  ...urbanPlanningParams,
  ...architectureParams,
  ...trafficParams,
  ...vegetationParams,
  ...weatherParams,
  ...lightingParams,
  ...streetFurnitureParams,
  ...gameplayParams,
];

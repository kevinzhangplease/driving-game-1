export type ParamCategory =
  | 'terrain'
  | 'roads'
  | 'urbanPlanning'
  | 'architecture'
  | 'traffic'
  | 'vegetation'
  | 'weather'
  | 'lighting'
  | 'streetFurniture'
  | 'vehicle'
  | 'gameplay';

export const categoryLabels: Record<ParamCategory, string> = {
  terrain: 'Terrain',
  roads: 'Roads',
  urbanPlanning: 'Urban Planning',
  architecture: 'Architecture',
  traffic: 'Traffic & Pedestrians',
  vegetation: 'Vegetation',
  weather: 'Weather & Atmosphere',
  lighting: 'Lighting & Time',
  streetFurniture: 'Street Furniture',
  vehicle: 'Vehicle Tuning',
  gameplay: 'Gameplay & System',
};

export type ParamValue = number | boolean | string;

export type ParamWidget = 'slider' | 'toggle' | 'select';

export interface ParamDef {
  id: string;
  label: string;
  category: ParamCategory;
  widget: ParamWidget;
  defaultValue: ParamValue;
  min?: number;
  max?: number;
  step?: number;
  options?: Array<{ value: string; label: string }>;
  tooltip: string;
  // Whether changing this value currently has a live effect on the world.
  // Unwired params are declared now so the full ~200-parameter roster can
  // grow incrementally without architecture changes, per the MVP plan.
  wired: boolean;
}

// A handful of bare ParamDefs sharing a generic tooltip, for params that are
// declared now but not yet wired into any generation system.
export function stub(
  id: string,
  label: string,
  category: ParamCategory,
  defaultValue: ParamValue,
  widget: ParamWidget = 'slider',
  extra: Partial<ParamDef> = {},
): ParamDef {
  return {
    id,
    label,
    category,
    widget,
    defaultValue,
    tooltip: extra.tooltip ?? 'Reserved for future tuning; not yet wired into world generation.',
    wired: false,
    ...extra,
  };
}

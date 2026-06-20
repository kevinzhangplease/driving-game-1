import { stub, type ParamDef } from '../ParameterRegistry';

export const weatherParams: ParamDef[] = [
  {
    id: 'weather.fogNear',
    label: 'Fog Near Distance',
    category: 'weather',
    widget: 'slider',
    defaultValue: 60,
    min: 10,
    max: 200,
    step: 5,
    tooltip: 'Distance in meters where fog begins to appear.',
    wired: true,
  },
  {
    id: 'weather.fogFar',
    label: 'Fog Far Distance',
    category: 'weather',
    widget: 'slider',
    defaultValue: 220,
    min: 50,
    max: 600,
    step: 10,
    tooltip: 'Distance in meters where fog becomes fully opaque.',
    wired: true,
  },
  stub('weather.cloudCover', 'Cloud Cover', 'weather', 0.3, 'slider', { min: 0, max: 1, step: 0.05 }),
  stub('weather.precipitation', 'Precipitation', 'weather', 'none', 'select', {
    options: [
      { value: 'none', label: 'None' },
      { value: 'rain', label: 'Rain' },
      { value: 'snow', label: 'Snow' },
    ],
  }),
  stub('weather.windSpeed', 'Wind Speed', 'weather', 3, 'slider', { min: 0, max: 30, step: 1 }),
  stub('weather.humidity', 'Humidity', 'weather', 0.5, 'slider', { min: 0, max: 1, step: 0.05 }),
  stub('weather.fogColorWarmth', 'Fog Color Warmth', 'weather', 0.5, 'slider', { min: 0, max: 1, step: 0.05 }),
  stub('weather.stormChance', 'Storm Chance', 'weather', 0.02, 'slider', { min: 0, max: 1, step: 0.01 }),
  stub('weather.rainbowChance', 'Rainbow Chance', 'weather', 0.01, 'slider', { min: 0, max: 1, step: 0.01 }),
];

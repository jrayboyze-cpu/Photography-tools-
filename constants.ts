
import { ActiveTab, AppSettings } from './types';

export const TABS: { id: ActiveTab; label: string }[] = [
  { id: 'forecast', label: 'Forecast' },
  { id: 'radar', label: 'Radar' },
  { id: 'flight', label: 'Drone Conditions' },
];

export const WMO_CODE_LABELS: Record<number, string> = {
  0: 'Clear Sky',
  1: 'Mainly Clear',
  2: 'Partly Cloudy',
  3: 'Overcast',
  45: 'Foggy',
  48: 'Foggy',
  51: 'Drizzle',
  53: 'Drizzle',
  55: 'Drizzle',
  61: 'Rain',
  63: 'Rain',
  65: 'Rain',
  71: 'Snow',
  73: 'Snow',
  75: 'Snow',
  80: 'Rain Showers',
  81: 'Rain Showers',
  82: 'Rain Showers',
  85: 'Snow Showers',
  86: 'Snow Showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with Hail',
  99: 'Thunderstorm with Hail',
};

export const DEFAULT_SETTINGS: AppSettings = {
  tempUnit: 'F',
  speedUnit: 'mph',
  theme: 'system',
  timeFormat: '12h',
  dateFormat: 'MM/DD',
  chartVisibility: { Temp: true, Precip: true, Coverage: false },
  lastAltitude: 0,
  favorites: [],
  cardOrder: ['temperature', 'precipitation', 'aqi', 'todaySummary', 'sun', 'daily'],
};

export const M_TO_FT = 3.28084;

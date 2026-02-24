
export type TempUnit = 'C' | 'F';
export type SpeedUnit = 'mph' | 'kph' | 'kts';
export type Theme = 'light' | 'dark' | 'system';
export type TimeFormat = '12h' | '24h';
export type DateFormat = 'MM/DD' | 'DD/MM';

export interface ChartVisibility {
  Temp: boolean;
  Precip: boolean;
  Coverage: boolean;
}

export interface AppSettings {
  tempUnit: TempUnit;
  speedUnit: SpeedUnit;
  theme: Theme;
  timeFormat: TimeFormat;
  dateFormat: DateFormat;
  chartVisibility: ChartVisibility;
  lastAltitude: number;
  favorites: Coordinates[];
  cardOrder: string[];
}

export interface HourlyData {
  time: string;
  temp_f: number;
  temp_c: number;
  precip_chance: number;
  cloud_cover: number;
  wind_speed_mph: number;
  wind_speed_kph: number;
  summary: string;
  weathercode: number;
}

export interface DailyData {
  date: string;
  high_f: number;
  low_f: number;
  high_c: number;
  low_c: number;
  precip_chance: number;
  summary: string;
  weathercode: number;
  sunrise: string;
  sunset: string;
}

export interface AQIData {
  value: number;
  category: 'Good' | 'Moderate' | 'Unhealthy for Sensitive Groups' | 'Unhealthy' | 'Very Unhealthy' | 'Hazardous' | 'Unknown';
}

export interface WeatherSource {
  name: string;
  hourly: HourlyData[];
  daily: DailyData[];
  aqi?: AQIData;
  disclaimer?: string;
}

export interface WeatherData {
  sources: WeatherSource[];
}

export interface AltitudeData {
  altitude_ft: number;
  wind_speed_mph: number;
  gust_speed_mph: number;
  wind_speed_kph: number;
  gust_speed_kph: number;
  wind_speed_kts: number;
  gust_speed_kts: number;
  wind_direction: number;
}

export interface DroneData {
  altitudes: AltitudeData[];
  uv_index_max: number;
  visibility_mi: number;
  visibility_km: number;
  sourceName: string;
}

export type ActiveTab = 'forecast' | 'radar' | 'flight';

export interface Coordinates {
  lat: number;
  lon: number;
  name: string;
}

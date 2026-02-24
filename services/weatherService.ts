
import type { WeatherData, DroneData, AQIData, WeatherSource, DailyData, HourlyData, AltitudeData } from '../types';

// --- Unit Conversion Helpers ---
const mpsToMph = (mps: number) => mps * 2.23694;
const mpsToKph = (mps: number) => mps * 3.6;
const mpsToKts = (mps: number) => mps * 1.94384;
const cToF = (c: number) => (c * 9/5) + 32;
const mToFt = (m: number) => m * 3.28084;
const kmToMi = (km: number) => km * 0.621371;

const getAqiCategory = (aqi: number): AQIData['category'] => {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
    if (aqi <= 200) return 'Unhealthy';
    if (aqi <= 300) return 'Very Unhealthy';
    return 'Hazardous';
};

// Function to map Open-Meteo data to WeatherSource
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapOpenMeteoData = (baseData: any, aqi?: AQIData): WeatherSource => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hourly = baseData.hourly.time.slice(0, 24).map((t: string, i: number) => ({
        time: new Date(t).getHours().toString().padStart(2, '0') + ':00',
        temp_c: baseData.hourly.temperature_2m[i],
        temp_f: cToF(baseData.hourly.temperature_2m[i]),
        precip_chance: Math.min(100, Math.max(0, baseData.hourly.precipitation_probability[i])),
        cloud_cover: baseData.hourly.cloudcover[i],
        wind_speed_mph: mpsToMph(baseData.hourly.windspeed_10m[i]),
        wind_speed_kph: mpsToKph(baseData.hourly.windspeed_10m[i]),
        summary: `Weather code: ${baseData.hourly.weathercode[i]}`,
        weathercode: baseData.hourly.weathercode[i],
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const daily = baseData.daily.time.slice(0, 10).map((d: string, i: number) => ({
        date: d,
        high_c: baseData.daily.temperature_2m_max[i],
        low_c: baseData.daily.temperature_2m_min[i],
        high_f: cToF(baseData.daily.temperature_2m_max[i]),
        low_f: cToF(baseData.daily.temperature_2m_min[i]),
        precip_chance: Math.min(100, Math.max(0, baseData.daily.precipitation_probability_max[i])),
        summary: `Weather code: ${baseData.daily.weathercode[i]}`,
        weathercode: baseData.daily.weathercode[i],
        sunrise: baseData.daily.sunrise[i],
        sunset: baseData.daily.sunset[i],
    }));
    return { name: 'AeroSource', hourly, daily, aqi, disclaimer: "Based on Open-Meteo GFS/ECMWF models." };
};

// Fetch WeatherAPI.com (SkyLink)
const fetchWeatherAPI = async (lat: number, lon: number): Promise<WeatherSource | null> => {
    const key = import.meta.env.VITE_WEATHERAPI_KEY;
    if (!key) return null;
    try {
        const res = await fetch(`https://api.weatherapi.com/v1/forecast.json?key=${key}&q=${lat},${lon}&days=10&aqi=yes`);
        if (!res.ok) return null;
        const data = await res.json();
        
        const hourly: HourlyData[] = [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data.forecast.forecastday.forEach((day: any) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            day.hour.forEach((h: any) => {
                if (hourly.length < 24) {
                    hourly.push({
                        time: new Date(h.time).getHours().toString().padStart(2, '0') + ':00',
                        temp_c: h.temp_c,
                        temp_f: h.temp_f,
                        precip_chance: h.chance_of_rain || h.chance_of_snow || 0,
                        cloud_cover: h.cloud,
                        wind_speed_mph: h.wind_mph,
                        wind_speed_kph: h.wind_kph,
                        summary: h.condition.text,
                        weathercode: 0, // Simplified
                    });
                }
            });
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const daily: DailyData[] = data.forecast.forecastday.map((d: any) => ({
            date: d.date,
            high_c: d.day.maxtemp_c,
            low_c: d.day.mintemp_c,
            high_f: d.day.maxtemp_f,
            low_f: d.day.mintemp_f,
            precip_chance: d.day.daily_chance_of_rain || d.day.daily_chance_of_snow || 0,
            summary: d.day.condition.text,
            weathercode: 0,
            sunrise: d.astro.sunrise,
            sunset: d.astro.sunset,
        }));

        return { name: 'SkyLink', hourly, daily, disclaimer: "Powered by WeatherAPI.com" };
    } catch (e) {
        return null;
    }
};

const TOMORROW_CODE_MAP: Record<number, number> = {
    0: 0, // Unknown -> Clear
    1000: 0, // Clear, Sunny
    1100: 1, // Mostly Clear
    1101: 2, // Partly Cloudy
    1102: 3, // Mostly Cloudy
    1001: 3, // Cloudy
    2000: 45, // Fog
    2100: 45, // Light Fog
    4000: 51, // Drizzle
    4001: 61, // Rain
    4200: 61, // Light Rain
    4201: 65, // Heavy Rain
    5000: 71, // Snow
    5001: 71, // Flurries
    5100: 71, // Light Snow
    5101: 75, // Heavy Snow
    6000: 61, // Freezing Drizzle
    6001: 61, // Freezing Rain
    6200: 61, // Light Freezing Rain
    6201: 65, // Heavy Freezing Rain
    7000: 71, // Ice Pellets
    7101: 75, // Heavy Ice Pellets
    7102: 71, // Light Ice Pellets
    8000: 95, // Thunderstorm
};

// Fetch Tomorrow.io (MeteoPlus)
const fetchTomorrowIO = async (lat: number, lon: number): Promise<WeatherSource | null> => {
    const key = import.meta.env.VITE_TOMORROWIO_KEY;
    if (!key) return null;
    try {
        const res = await fetch(`https://api.tomorrow.io/v4/weather/forecast?location=${lat},${lon}&apikey=${key}`);
        if (!res.ok) return null;
        const data = await res.json();
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const hourly: HourlyData[] = data.timelines.hourly.slice(0, 24).map((h: any) => ({
            time: new Date(h.time).getHours().toString().padStart(2, '0') + ':00',
            temp_c: h.values.temperature,
            temp_f: cToF(h.values.temperature),
            precip_chance: h.values.precipitationProbability,
            cloud_cover: h.values.cloudCover,
            wind_speed_mph: mpsToMph(h.values.windSpeed),
            wind_speed_kph: mpsToKph(h.values.windSpeed),
            summary: `Code: ${h.values.weatherCode}`,
            weathercode: TOMORROW_CODE_MAP[h.values.weatherCode] ?? 0,
        }));

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const daily: DailyData[] = data.timelines.daily.slice(0, 10).map((d: any) => ({
            date: d.time.split('T')[0],
            high_c: d.values.temperatureMax,
            low_c: d.values.temperatureMin,
            high_f: cToF(d.values.temperatureMax),
            low_f: cToF(d.values.temperatureMin),
            precip_chance: d.values.precipitationProbabilityMax,
            summary: `Code: ${d.values.weatherCodeMax}`,
            weathercode: TOMORROW_CODE_MAP[d.values.weatherCodeMax] ?? 0,
            sunrise: d.values.sunriseTime,
            sunset: d.values.sunsetTime,
        }));

        return { name: 'MeteoPlus', hourly, daily, disclaimer: "Powered by Tomorrow.io" };
    } catch (e) {
        return null;
    }
};

export const fetchDirectWeatherDataAndDroneData = async (lat: number, lon: number): Promise<{ weatherData: WeatherData, droneData: DroneData } | null> => {
  const weatherParams = `latitude=${lat}&longitude=${lon}&forecast_days=10&hourly=temperature_2m,precipitation_probability,weathercode,cloudcover,windspeed_10m,windgusts_10m,windspeed_80m,windspeed_120m,windspeed_180m,visibility,windspeed_50m,windspeed_100m,windspeed_150m,winddirection_10m,winddirection_80m,winddirection_120m,winddirection_180m&daily=weathercode,temperature_2m_max,temperature_2m_min,uv_index_max,precipitation_probability_max,sunrise,sunset&temperature_unit=celsius&windspeed_unit=ms&timeformat=iso8601&timezone=auto`;
  const aqParams = `latitude=${lat}&longitude=${lon}&hourly=us_aqi`;

  try {
    const [weatherResponse, aqResponse, skyLinkSource, meteoPlusSource] = await Promise.allSettled([
      fetch(`https://api.open-meteo.com/v1/forecast?${weatherParams}`),
      fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?${aqParams}`),
      fetchWeatherAPI(lat, lon),
      fetchTomorrowIO(lat, lon)
    ]);

    if (weatherResponse.status === 'rejected' || !weatherResponse.value.ok) {
        throw new Error(`Failed to fetch base weather data`);
    }
    
    const weatherApiData = await weatherResponse.value.json();
    const aqApiData = (aqResponse.status === 'fulfilled' && aqResponse.value.ok) ? await aqResponse.value.json() : null;

    let aqi: AQIData | undefined = undefined;
    if (aqApiData && aqApiData.hourly.us_aqi) {
        // Find max AQI across daylight hours (approx indices 6-20)
        const daylightAqi = aqApiData.hourly.us_aqi.slice(6, 20).filter((v: number | null) => v !== null);
        if (daylightAqi.length > 0) {
            const maxAqi = Math.max(...daylightAqi);
            aqi = { value: maxAqi, category: getAqiCategory(maxAqi) };
        } else if (aqApiData.hourly.us_aqi[0] !== null) {
            const currentAqiValue = aqApiData.hourly.us_aqi[0];
            aqi = { value: currentAqiValue, category: getAqiCategory(currentAqiValue) };
        }
    }

    const aeroSource = mapOpenMeteoData(weatherApiData, aqi);
    
    const weatherSources: WeatherSource[] = [aeroSource];
    if (skyLinkSource.status === 'fulfilled' && skyLinkSource.value) {
        weatherSources.push(skyLinkSource.value);
    }
    if (meteoPlusSource.status === 'fulfilled' && meteoPlusSource.value) {
        weatherSources.push(meteoPlusSource.value);
    }
    
    // --- Process Drone Data ---
    const wind_10m = weatherApiData.hourly.windspeed_10m[0];
    const gust_10m = weatherApiData.hourly.windgusts_10m[0];
    const gustRatio = wind_10m > 0.1 ? gust_10m / wind_10m : 1; 

    const altitudes: AltitudeData[] = [
        { m: 10, ft: 0 },
        { m: 50, ft: mToFt(50) },
        { m: 80, ft: mToFt(80) },
        { m: 100, ft: mToFt(100) },
        { m: 120, ft: mToFt(120) },
        { m: 150, ft: mToFt(150) },
        { m: 180, ft: mToFt(180) },
    ].map(alt => {
        const wind_mps = weatherApiData.hourly[`windspeed_${alt.m}m`][0];
        const wind_dir = weatherApiData.hourly[`winddirection_${alt.m === 50 || alt.m === 100 || alt.m === 150 ? (alt.m === 50 ? 80 : (alt.m === 100 ? 120 : 180)) : alt.m}m`]?.[0] || weatherApiData.hourly.winddirection_10m[0];
        const gust_mps = alt.m === 10 ? weatherApiData.hourly.windgusts_10m[0] : wind_mps * gustRatio;
        return {
            altitude_ft: alt.m === 10 ? 0 : alt.ft,
            wind_speed_mph: mpsToMph(wind_mps), gust_speed_mph: mpsToMph(gust_mps),
            wind_speed_kph: mpsToKph(wind_mps), gust_speed_kph: mpsToKph(gust_mps),
            wind_speed_kts: mpsToKts(wind_mps), gust_speed_kts: mpsToKts(gust_mps),
            wind_direction: wind_dir
        }
    });

    const weatherData: WeatherData = { sources: weatherSources };
    const droneData: DroneData = {
        sourceName: 'AeroSource',
        altitudes,
        uv_index_max: weatherApiData.daily.uv_index_max[0],
        visibility_km: weatherApiData.hourly.visibility[0] / 1000,
        visibility_mi: kmToMi(weatherApiData.hourly.visibility[0] / 1000)
    };

    return { weatherData, droneData };

  } catch (error) {
    console.error("Error fetching direct weather data:", error);
    return null;
  }
};

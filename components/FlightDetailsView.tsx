
import React, { useState, useMemo, useEffect } from 'react';
import type { DroneData, AppSettings } from '../types';
import { WindIcon } from './icons/WeatherIcons';
import { M_TO_FT } from '../constants';
import { Card } from './Card';

interface FlightDetailsViewProps {
  data: DroneData;
  settings: AppSettings;
  onUpdateSettings: (s: Partial<AppSettings>) => void;
}

const MAX_ALTITUDE_FT = 550;

const ftToM = (ft: number) => ft / M_TO_FT;

const FlightDetailsView: React.FC<FlightDetailsViewProps> = ({ data, settings, onUpdateSettings }) => {
  const [altitude, setAltitude] = useState(settings.lastAltitude || 0);

  // Sync internal state if settings change externally
  useEffect(() => {
      setAltitude(settings.lastAltitude);
  }, [settings.lastAltitude]);

  const isMetric = settings.speedUnit === 'kph';
  const displayMax = isMetric ? Math.round(ftToM(MAX_ALTITUDE_FT)) : MAX_ALTITUDE_FT;
  const displayStep = isMetric ? 15 : 50;
  const displayUnit = isMetric ? 'm' : 'ft';
  
  const displayAltitude = isMetric ? Math.round(ftToM(altitude)) : altitude;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    const newAltitude = isMetric ? Math.round(value * M_TO_FT) : value;
    setAltitude(newAltitude);
  };
  
  const handleSliderCommit = () => {
       onUpdateSettings({ lastAltitude: altitude });
  }

  const interpolatedData = useMemo(() => {
    if (!data.altitudes || data.altitudes.length === 0) {
      return { wind: 0, gust: 0, dir: 0 };
    }

    const sortedAltitudes = [...data.altitudes].sort((a, b) => a.altitude_ft - b.altitude_ft);
    let lower = sortedAltitudes[0];
    let upper = sortedAltitudes[sortedAltitudes.length - 1];

    for(let i=0; i<sortedAltitudes.length - 1; i++) {
        if(altitude >= sortedAltitudes[i].altitude_ft && altitude <= sortedAltitudes[i+1].altitude_ft) {
            lower = sortedAltitudes[i];
            upper = sortedAltitudes[i+1];
            break;
        }
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getVal = (obj: any, key: string) => obj[key] as number;

    if (altitude <= lower.altitude_ft) {
        return { wind: getVal(lower, `wind_speed_${settings.speedUnit}`), gust: getVal(lower, `gust_speed_${settings.speedUnit}`), dir: lower.wind_direction };
    }
    if (altitude >= upper.altitude_ft) {
        return { wind: getVal(upper, `wind_speed_${settings.speedUnit}`), gust: getVal(upper, `gust_speed_${settings.speedUnit}`), dir: upper.wind_direction };
    }

    const factor = (altitude - lower.altitude_ft) / (upper.altitude_ft - lower.altitude_ft);
    const wind = getVal(lower, `wind_speed_${settings.speedUnit}`) + factor * (getVal(upper, `wind_speed_${settings.speedUnit}`) - getVal(lower, `wind_speed_${settings.speedUnit}`));
    const gust = getVal(lower, `gust_speed_${settings.speedUnit}`) + factor * (getVal(upper, `gust_speed_${settings.speedUnit}`) - getVal(lower, `gust_speed_${settings.speedUnit}`));
    
    let dirDiff = upper.wind_direction - lower.wind_direction;
    if (dirDiff > 180) dirDiff -= 360;
    if (dirDiff < -180) dirDiff += 360;
    let dir = lower.wind_direction + factor * dirDiff;
    if (dir < 0) dir += 360;
    if (dir >= 360) dir -= 360;

    return { wind, gust, dir };

  }, [altitude, data.altitudes, settings.speedUnit]);

  // Dynamic color for wind safety
  const getWindColor = (speed: number) => {
      if (speed < 10) return 'text-green-500';
      if (speed < 20) return 'text-yellow-500';
      return 'text-red-500';
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-fadeInOut">
      <Card title="Altitude Selector" className="relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="flex-1 w-full pt-4 pb-2">
            <div className="relative w-full h-8 flex items-center">
                 <input
                    type="range"
                    min="0"
                    max={displayMax}
                    step={displayStep}
                    value={displayAltitude}
                    onChange={handleSliderChange}
                    onMouseUp={handleSliderCommit}
                    onTouchEnd={handleSliderCommit}
                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
                  />
            </div>
            <div className="flex justify-between text-xs text-gray-400 font-mono mt-1">
                <span>0 {displayUnit}</span>
                <span>{displayMax} {displayUnit}</span>
            </div>
          </div>
          <div className="flex items-center justify-center bg-gray-50 dark:bg-brand-primary rounded-xl p-4 w-32 border border-gray-100 dark:border-gray-800">
            <span className="font-mono text-2xl font-bold text-brand-accent">{displayAltitude}</span>
            <span className="ml-1 text-sm text-gray-500 font-medium">{displayUnit}</span>
          </div>
        </div>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="flex flex-col items-center justify-center text-center py-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <WindIcon className="w-32 h-32 text-current" />
            </div>
            <div className="p-4 bg-blue-50 dark:bg-brand-accent/10 rounded-full mb-6 ring-4 ring-blue-100 dark:ring-brand-accent/5 relative">
                 <WindIcon className="w-10 h-10 text-brand-accent"/>
                 {/* Wind Direction Arrow */}
                 <div 
                    className="absolute -top-2 -right-2 w-6 h-6 bg-white dark:bg-brand-secondary rounded-full shadow-md flex items-center justify-center border border-gray-100 dark:border-gray-700 transition-transform duration-500"
                    style={{ transform: `rotate(${interpolatedData.dir}deg)` }}
                 >
                     <svg className="w-4 h-4 text-brand-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg>
                 </div>
            </div>
            <div>
                <p className="text-sm uppercase tracking-widest text-gray-500 dark:text-brand-text-secondary font-medium mb-1">Wind Speed</p>
                <p className={`text-5xl font-black ${getWindColor(interpolatedData.wind)}`}>
                    {interpolatedData.wind.toFixed(1)} <span className="text-2xl text-gray-400 font-normal">{settings.speedUnit}</span>
                </p>
            </div>
             <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 w-2/3">
                <p className="text-sm text-gray-500 dark:text-brand-text-secondary mb-1">Gusts</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-brand-text-primary">{interpolatedData.gust.toFixed(1)} <span className="text-lg text-gray-400 font-normal">{settings.speedUnit}</span></p>
            </div>
        </Card>
        
        <Card title="Conditions" className="flex flex-col justify-center space-y-6">
             <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-brand-primary rounded-xl border border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                    <span className="text-gray-600 dark:text-brand-text-secondary font-medium">Max UV Index</span>
                </div>
                <span className="text-2xl font-bold text-gray-900 dark:text-brand-text-primary">{data.uv_index_max.toFixed(1)}</span>
             </div>

             <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-brand-primary rounded-xl border border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span className="text-gray-600 dark:text-brand-text-secondary font-medium">Visibility</span>
                </div>
                <span className="text-2xl font-bold text-gray-900 dark:text-brand-text-primary">{settings.speedUnit === 'kph' ? data.visibility_km.toFixed(1) + ' km' : data.visibility_mi.toFixed(1) + ' mi'}</span>
             </div>

             <div className="pt-2">
                 <p className="text-[10px] text-gray-400 leading-relaxed">*Wind data is interpolated based on altitude models from <span className="font-semibold">{data.sourceName}</span>. Actual conditions may vary significantly due to local obstacles.</p>
             </div>
        </Card>
      </div>
    </div>
  );
};

export default FlightDetailsView;

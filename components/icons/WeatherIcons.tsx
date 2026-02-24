
import React from 'react';
import { Sun, Cloud, CloudSun, CloudRain, CloudLightning, CloudSnow, Compass, Settings, Search, X, Wind, Sunrise, Sunset } from 'lucide-react';

export const LogoIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none" className={className} aria-label="Aperture Forecast Logo">
        <defs>
            <path id="apertureBlade" d="M 29,23.5 A 26 26 0 0 1 55,23.5 L 48.5,34.7 A 13 13 0 0 0 35.5,34.7 Z" />
        </defs>
        
        <circle cx="60" cy="60" r="59" fill="white" />
        <circle cx="60" cy="60" r="58" stroke="#89C4F4" strokeWidth="1.5" />
        <circle cx="60" cy="60" r="55" stroke="#89C4F4" strokeWidth="1.5" />
        
        <g transform="translate(18, 10)">
            <g stroke="#89C4F4" strokeWidth="2.5" strokeLinecap="round">
                <path d="M42 14 V8" />
                <path d="M59 21 L63 17" />
                <path d="M25 21 L21 17" />
                <path d="M70 34 L76 34" />
                <path d="M14 34 L8 34" />
            </g>

            <g>
                <g fill="#CDE8F9" stroke="#89C4F4" strokeWidth="2" strokeLinejoin="round">
                    <use href="#apertureBlade" transform="rotate(-60, 42, 46)" />
                    <use href="#apertureBlade" transform="rotate(0, 42, 46)" />
                    <use href="#apertureBlade" transform="rotate(60, 42, 46)" />
                    <use href="#apertureBlade" transform="rotate(120, 42, 46)" />
                    <use href="#apertureBlade" transform="rotate(180, 42, 46)" />
                    <use href="#apertureBlade" transform="rotate(240, 42, 46)" />
                </g>
                 <path 
                    d="M16 46 A 26 26 0 0 1 68 46"
                    stroke="#89C4F4" strokeWidth="3.5" fill="none" strokeLinecap="round"
                />
            </g>
            
            <path 
                d="M12 66 C2 66 2 56 12 56 C14 47 22 45 28 49 C32 43 52 43 56 49 C62 45 70 47 72 56 C82 56 82 66 72 66 Z"
                fill="white" stroke="#89C4F4" strokeWidth="3.5" strokeLinejoin="round"
            />
        </g>
        
        <text x="60" y="92" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="12" fill="#2573B5" fontWeight="700">Aperture</text>
        <text x="60" y="103" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="6" fill="#2573B5" fontWeight="500" letterSpacing="0.15em">FORECAST</text>
    </svg>
);

export const SunriseIcon: React.FC<{ className?: string }> = ({ className }) => <Sunrise className={className} />;
export const SunsetIcon: React.FC<{ className?: string }> = ({ className }) => <Sunset className={className} />;
export const CompassIcon: React.FC<{ className?: string }> = ({ className }) => <Compass className={className} />;
export const SettingsIcon: React.FC<{ className?: string }> = ({ className }) => <Settings className={className} />;
export const WindIcon: React.FC<{ className?: string }> = ({ className }) => <Wind className={className} />;
export const SearchIcon: React.FC<{ className?: string }> = ({ className }) => <Search className={className} />;
export const CloseIcon: React.FC<{ className?: string }> = ({ className }) => <X className={className} />;

export const WeatherConditionIcon: React.FC<{ code: number; className?: string }> = ({ code, className }) => {
    switch (code) {
        case 0: // Clear sky
            return <Sun className={className} />;
        case 1: // Mainly clear
        case 2: // Partly cloudy
        case 3: // Overcast
            return <CloudSun className={className} />;
        case 45: // Fog
        case 48: // Depositing rime fog
            return <Cloud className={className} />;
        case 51: // Drizzle: Light
        case 53: // Drizzle: moderate
        case 55: // Drizzle: dense intensity
        case 61: // Rain: Slight
        case 63: // Rain: moderate
        case 65: // Rain: heavy intensity
        case 80: // Rain showers: Slight
        case 81: // Rain showers: moderate
        case 82: // Rain showers: violent
            return <CloudRain className={className} />;
        case 71: // Snow fall: Slight
        case 73: // Snow fall: moderate
        case 75: // Snow fall: heavy intensity
        case 85: // Snow showers slight
        case 86: // Snow showers heavy
            return <CloudSnow className={className} />;
        case 95: // Thunderstorm: Slight or moderate
        case 96: // Thunderstorm with slight hail
        case 99: // Thunderstorm with heavy hail
            return <CloudLightning className={className} />;
        default:
            return <Cloud className={className} />;
    }
};

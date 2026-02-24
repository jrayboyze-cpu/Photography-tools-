import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { motion } from 'framer-motion';
import {
    DndContext,
    closestCenter,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
    DragOverlay,
    type DragStartEvent,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    rectSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { WeatherData, AppSettings, AQIData, WeatherSource, TimeFormat, DailyData, ChartVisibility, Coordinates } from '../types';
import { WeatherConditionIcon, SunriseIcon, SunsetIcon } from './icons/WeatherIcons';
import { useResolvedTheme } from '../hooks/useResolvedTheme';
import { Card } from './Card';
import { calculateSunTimes, getGoldenHourString, getBlueHourString } from '../services/sunService';
import { WMO_CODE_LABELS } from '../constants';

// Helper function to format time
const formatHour = (hourString: string, format: TimeFormat): string => {
    const hour = parseInt(hourString.split(':')[0], 10);

    if (format === '12h') {
        if (hour === 0) return '12 AM';
        if (hour === 12) return '12 PM';
        if (hour > 12) return `${hour - 12} PM`;
        return `${hour} AM`;
    }
    return hourString;
};

// --- Helper: AQI Details ---
const getAqiDetails = (category: AQIData['category']): { color: string; textColor: string, description: string } => {
    switch (category) {
        case 'Good': return { color: 'bg-green-500', textColor: 'text-green-500', description: 'Air quality is satisfactory.' };
        case 'Moderate': return { color: 'bg-yellow-500', textColor: 'text-yellow-500', description: 'Air quality is acceptable.' };
        case 'Unhealthy for Sensitive Groups': return { color: 'bg-orange-500', textColor: 'text-orange-500', description: 'May affect sensitive groups.' };
        case 'Unhealthy': return { color: 'bg-red-500', textColor: 'text-red-500', description: 'May cause health effects.' };
        case 'Very Unhealthy': return { color: 'bg-purple-600', textColor: 'text-purple-600', description: 'Health alert: risk of serious effects.' };
        case 'Hazardous': return { color: 'bg-red-900', textColor: 'text-red-900', description: 'Health warning of emergency conditions.' };
        default: return { color: 'bg-gray-500', textColor: 'text-gray-500', description: 'Data unavailable.' };
    }
};

// --- Child Components ---

const TodaySummaryCard: React.FC<{ daily: DailyData; currentCode: number; settings: AppSettings }> = ({ daily, currentCode, settings }) => {
    const high = settings.tempUnit === 'F' ? Math.round(daily.high_f) : Math.round(daily.high_c);
    const low = settings.tempUnit === 'F' ? Math.round(daily.low_f) : Math.round(daily.low_c);
    const dateObj = new Date(daily.date);
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
    const fullDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    return (
        <Card className="flex flex-col relative overflow-hidden h-full justify-between">
            {/* Decorative Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-brand-accent/5 rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex flex-col h-full items-center text-center z-10 py-1">
                {/* Top: Date */}
                <div className="mb-4">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-brand-text-primary tracking-tight">{dayName}, {fullDate}</h3>
                    <p className="text-sm text-gray-500 dark:text-brand-text-secondary font-medium">{WMO_CODE_LABELS[currentCode] || `Weather Code: ${currentCode}`}</p>
                </div>

                {/* Middle: Large Icon */}
                <div className="flex-1 flex items-center justify-center mb-4">
                    <motion.div
                        initial={{ scale: 0.5, opacity: 0, rotate: -15 }}
                        animate={{ scale: 1, opacity: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                        className="transform transition-transform duration-500 hover:scale-105 drop-shadow-sm"
                    >
                        <WeatherConditionIcon code={currentCode} className="w-20 h-20 sm:w-24 sm:h-24" />
                    </motion.div>
                </div>

                {/* Bottom: Temps */}
                <div className="grid grid-cols-2 gap-6 w-full max-w-[200px]">
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold tracking-widest uppercase mb-1">High</span>
                        <span className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-brand-text-primary">{high}°</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold tracking-widest uppercase mb-1">Low</span>
                        <span className="text-3xl sm:text-4xl font-bold text-gray-400 dark:text-gray-600">{low}°</span>
                    </div>
                </div>
            </div>
        </Card>
    );
};

const SunTimesCard: React.FC<{
    dailyData: DailyData;
    settings: AppSettings;
    coordinates: Coordinates | null;
}> = ({ dailyData, settings, coordinates }) => {
    const [progress, setProgress] = useState(0);
    const [targetDate, setTargetDate] = useState<Date>(new Date());
    const [isCustomDate, setIsCustomDate] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [calculatedSunTimes, setCalculatedSunTimes] = useState<{ sunrise: Date, sunset: Date } | null>(null);

    const isDDMM = settings.dateFormat === 'DD/MM';
    const placeholder = isDDMM ? 'DD/MM/YYYY' : 'MM/DD/YYYY';

    // Initialize or reset when today changes or new weather data comes in (usually means location change)
    useEffect(() => {
        setTargetDate(new Date());
        setIsCustomDate(false);
        setInputValue('');
        setCalculatedSunTimes(null);
    }, [dailyData]);

    // Calculate sun times whenever target date or coordinates change
    useEffect(() => {
        if (coordinates) {
            const times = calculateSunTimes(targetDate, coordinates.lat, coordinates.lon);
            setCalculatedSunTimes(times);
        }
    }, [targetDate, coordinates]);

    // Update progress bar based on current time vs sunrise/sunset
    useEffect(() => {
        const updateProgress = () => {
            const now = new Date();
            // Determine if we are looking at "today"
            const isToday = now.toDateString() === targetDate.toDateString();

            // Use API data for today if available and not custom date, otherwise use calculated
            let sunrise: Date, sunset: Date;

            if (!isCustomDate && dailyData.sunrise && dailyData.sunset) {
                sunrise = new Date(dailyData.sunrise);
                sunset = new Date(dailyData.sunset);
            } else if (calculatedSunTimes) {
                sunrise = calculatedSunTimes.sunrise;
                sunset = calculatedSunTimes.sunset;
            } else {
                return;
            }

            if (!isToday) {
                setProgress(50);
                return;
            }

            if (now < sunrise) {
                setProgress(0);
            } else if (now > sunset) {
                setProgress(100);
            } else {
                const totalDaylight = sunset.getTime() - sunrise.getTime();
                const elapsed = now.getTime() - sunrise.getTime();
                const percent = (elapsed / totalDaylight) * 100;
                setProgress(Math.min(100, Math.max(0, percent)));
            }
        };

        updateProgress();
        const interval = setInterval(updateProgress, 60000); // Update every minute
        return () => clearInterval(interval);
    }, [dailyData, calculatedSunTimes, targetDate, isCustomDate]);

    const formatTime = (date: Date) => {
        if (!date || isNaN(date.getTime())) return '--:--';
        return date.toLocaleTimeString('en-US', {
            hour: settings.timeFormat === '12h' ? 'numeric' : '2-digit',
            minute: '2-digit',
            hour12: settings.timeFormat === '12h'
        });
    };

    // Display Values
    const displaySunrise = calculatedSunTimes ? formatTime(calculatedSunTimes.sunrise) : (dailyData.sunrise ? formatTime(new Date(dailyData.sunrise)) : '--:--');
    const displaySunset = calculatedSunTimes ? formatTime(calculatedSunTimes.sunset) : (dailyData.sunset ? formatTime(new Date(dailyData.sunset)) : '--:--');

    const goldenHour = coordinates ? getGoldenHourString(coordinates.lat, coordinates.lon, targetDate, settings.timeFormat) : { am: '--:--', pm: '--:--' };
    const blueHour = coordinates ? getBlueHourString(coordinates.lat, coordinates.lon, targetDate, settings.timeFormat) : { am: '--:--', pm: '--:--' };

    // --- Date Input Logic ---

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.replace(/\D/g, ''); // Remove non-digits

        // Max length for YYYY (8 digits total: MMDDYYYY)
        if (val.length > 8) val = val.slice(0, 8);

        // Auto-insert slashes
        if (val.length > 4) {
            val = `${val.slice(0, 2)}/${val.slice(2, 4)}/${val.slice(4)}`;
        } else if (val.length > 2) {
            val = `${val.slice(0, 2)}/${val.slice(2)}`;
        }

        setInputValue(val);
    };

    const handleDateSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            const parts = inputValue.split('/');
            if (parts.length === 3) {
                let day, month, year;

                if (isDDMM) {
                    day = parseInt(parts[0], 10);
                    month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
                } else {
                    month = parseInt(parts[0], 10) - 1;
                    day = parseInt(parts[1], 10);
                }

                let yearStr = parts[2];
                if (yearStr.length === 2) yearStr = '20' + yearStr; // Assume 20xx
                year = parseInt(yearStr, 10);

                const newDate = new Date(year, month, day);

                if (!isNaN(newDate.getTime())) {
                    setTargetDate(newDate);
                    setIsCustomDate(true);
                    // Blur input to dismiss keyboard on mobile
                    (e.target as HTMLInputElement).blur();
                }
            }
        }
    };

    const jumpToToday = () => {
        setTargetDate(new Date());
        setIsCustomDate(false);
        setInputValue('');
    };

    return (
        <Card title="Sunrise/Sunset" className="h-full relative">
            <div className="flex flex-col justify-center h-full px-2 py-2 gap-6">

                {/* Main Visual */}
                <div className="flex items-center justify-between relative px-2 sm:px-4 mt-2">
                    {/* Progress Bar Background */}
                    <div className="absolute left-10 right-10 top-1/2 -translate-y-1/2 h-0.5 bg-gray-200 dark:bg-gray-700 rounded-full -z-0"></div>

                    {/* Progress Bar Active */}
                    <div
                        className="absolute left-10 top-1/2 -translate-y-1/2 h-0.5 bg-yellow-400/30 rounded-full -z-0"
                        style={{ width: `calc(${progress}% * 0.85)` }}
                    ></div>

                    {/* Sun Dot Indicator */}
                    <div
                        className="absolute top-1/2 -translate-y-1/2 z-10 w-3 h-3 bg-[#FBBF24] rounded-full transform -translate-x-1/2 shadow-[0_0_10px_2px_rgba(251,191,36,0.6)] ring-2 ring-white dark:ring-brand-secondary transition-all duration-1000"
                        style={{ left: `calc(40px + (100% - 80px) * ${progress / 100})` }}
                    ></div>

                    {/* Sunrise Icon & Time */}
                    <div className="flex flex-col items-center gap-1 relative z-10 bg-white dark:bg-brand-secondary p-1">
                        <div className="text-yellow-500">
                            <SunriseIcon className="w-8 h-8" />
                        </div>
                        <p className="text-sm font-bold text-gray-700 dark:text-brand-text-primary whitespace-nowrap">{displaySunrise}</p>
                    </div>

                    {/* Sunset Icon & Time */}
                    <div className="flex flex-col items-center gap-1 relative z-10 bg-white dark:bg-brand-secondary p-1">
                        <div className="text-orange-500">
                            <SunsetIcon className="w-8 h-8" />
                        </div>
                        <p className="text-sm font-bold text-gray-700 dark:text-brand-text-primary whitespace-nowrap">{displaySunset}</p>
                    </div>
                </div>

                {/* Date Input & Jump Button */}
                <div className="flex flex-col items-center justify-center gap-2 relative w-full max-w-xs mx-auto">
                    <div className="relative w-full">
                        <input
                            type="text"
                            value={inputValue}
                            onChange={handleDateChange}
                            onKeyDown={handleDateSubmit}
                            placeholder={placeholder}
                            className="w-full bg-gray-100 dark:bg-brand-primary border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm text-center font-mono text-gray-800 dark:text-brand-text-primary focus:outline-none focus:ring-2 focus:ring-brand-accent transition-all"
                            maxLength={10}
                            aria-label="Check specific date"
                        />
                        {/* Optional visual label inside or below? Keeping it clean. */}
                    </div>

                    {/* Jump to Today Popup */}
                    {isCustomDate && (
                        <button
                            onClick={jumpToToday}
                            className="absolute -right-32 top-1/2 -translate-y-1/2 text-[10px] bg-brand-accent text-white px-2 py-1 rounded shadow-md hover:bg-blue-600 transition-colors animate-fadeIn whitespace-nowrap flex items-center gap-1"
                        >
                            <span>Jump to Today</span>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        </button>
                    )}

                    {/* Display formatted current target date if custom */}
                    {isCustomDate && (
                        <p className="text-[10px] text-gray-500 dark:text-gray-500 font-medium uppercase tracking-wide">
                            Viewing: {targetDate.toLocaleDateString()}
                        </p>
                    )}
                </div>

                {/* Photography Light Data */}
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100 dark:border-gray-800/50">
                    <div className="text-center">
                        <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Golden Hour</p>
                        <div className="flex flex-col gap-0.5">
                            <div className="flex items-center justify-center gap-1 text-xs text-yellow-600 dark:text-yellow-500/90">
                                <span className="opacity-75">AM</span>
                                <span className="font-mono font-medium">{goldenHour.am || '--:--'}</span>
                            </div>
                            <div className="flex items-center justify-center gap-1 text-xs text-yellow-600 dark:text-yellow-500/90">
                                <span className="opacity-75">PM</span>
                                <span className="font-mono font-medium">{goldenHour.pm || '--:--'}</span>
                            </div>
                        </div>
                    </div>
                    <div className="text-center border-l border-gray-100 dark:border-gray-800/50">
                        <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Blue Hour</p>
                        <div className="flex flex-col gap-0.5">
                            <div className="flex items-center justify-center gap-1 text-xs text-blue-500 dark:text-blue-400">
                                <span className="opacity-75">AM</span>
                                <span className="font-mono font-medium">{blueHour.am || '--:--'}</span>
                            </div>
                            <div className="flex items-center justify-center gap-1 text-xs text-blue-500 dark:text-blue-400">
                                <span className="opacity-75">PM</span>
                                <span className="font-mono font-medium">{blueHour.pm || '--:--'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    );
};


// Shared chart config hook
const useChartConfig = (data: WeatherSource, settings: AppSettings) => {
    const { isDark } = useResolvedTheme(settings);
    const gridStroke = isDark ? '#262c36' : '#f3f4f6';
    const axisStroke = isDark ? '#6e7681' : '#9ca3af';
    const axisLabelFill = isDark ? '#8b949e' : '#6b7280';
    const tooltipBg = isDark ? '#161b22' : '#ffffff';
    const tooltipBorder = isDark ? '#30363d' : '#e5e7eb';

    const chartData = data.hourly.map(h => ({
        time: formatHour(h.time, settings.timeFormat),
        Temp: settings.tempUnit === 'F' ? h.temp_f : h.temp_c,
        Precip: h.precip_chance,
        Coverage: h.cloud_cover,
    }));

    const currentHourStr = formatHour(new Date().getHours().toString().padStart(2, '0') + ':00', settings.timeFormat);

    return { isDark, gridStroke, axisStroke, axisLabelFill, tooltipBg, tooltipBorder, chartData, currentHourStr };
};

const TemperatureChartCard: React.FC<{
    data: WeatherSource;
    settings: AppSettings;
    onVisibilityChange: (key: keyof ChartVisibility) => void;
}> = ({ data, settings, onVisibilityChange }) => {
    const { gridStroke, axisStroke, axisLabelFill, tooltipBg, tooltipBorder, chartData, currentHourStr, isDark } = useChartConfig(data, settings);
    const tempStroke = isDark ? '#58a6ff' : '#2563eb';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleLegendClick = (e: any) => { onVisibilityChange(e.dataKey); };

    return (
        <Card title="Temperature Trend" className="h-full min-h-[320px]">
            <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                    <XAxis dataKey="time" stroke={axisStroke} fontSize={11} tickLine={false} axisLine={false} dy={10} />
                    <YAxis stroke={axisStroke} fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}°`} domain={['auto', 'auto']} />
                    <Tooltip
                        contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                        itemStyle={{ fontSize: '12px', fontWeight: 500 }}
                        labelStyle={{ color: axisLabelFill, marginBottom: '0.5rem', fontSize: '12px' }}
                    />
                    <Legend
                        wrapperStyle={{ paddingTop: '15px', fontSize: '12px' }}
                        iconType="circle"
                        onClick={handleLegendClick}
                        formatter={(value, entry: any) => {
                            const isHidden = entry.inactive;
                            return <span className={`ml-1 ${isHidden ? 'text-gray-400 dark:text-gray-600 line-through' : 'text-gray-600 dark:text-gray-300'}`}>{value}</span>
                        }}
                    />
                    <ReferenceLine x={currentHourStr} stroke={axisStroke} strokeDasharray="3 3" />
                    <Line type="monotone" dataKey="Temp" stroke={tempStroke} strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} hide={!settings.chartVisibility.Temp} animationDuration={1000} />
                </LineChart>
            </ResponsiveContainer>
        </Card>
    );
};

const PrecipitationChartCard: React.FC<{
    data: WeatherSource;
    settings: AppSettings;
    onVisibilityChange: (key: keyof ChartVisibility) => void;
}> = ({ data, settings, onVisibilityChange }) => {
    const { gridStroke, axisStroke, axisLabelFill, tooltipBg, tooltipBorder, chartData, currentHourStr, isDark } = useChartConfig(data, settings);
    const precipStroke = isDark ? '#3fb950' : '#059669';
    const coverageStroke = isDark ? '#d2a8ff' : '#9333ea';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleLegendClick = (e: any) => { onVisibilityChange(e.dataKey); };

    return (
        <Card title="Precipitation & Clouds" className="h-full min-h-[320px]">
            <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                    <XAxis dataKey="time" stroke={axisStroke} fontSize={11} tickLine={false} axisLine={false} dy={10} />
                    <YAxis stroke={axisStroke} fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}%`} domain={[0, 100]} />
                    <Tooltip
                        contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                        itemStyle={{ fontSize: '12px', fontWeight: 500 }}
                        labelStyle={{ color: axisLabelFill, marginBottom: '0.5rem', fontSize: '12px' }}
                    />
                    <Legend
                        wrapperStyle={{ paddingTop: '15px', fontSize: '12px' }}
                        iconType="circle"
                        onClick={handleLegendClick}
                        formatter={(value, entry: any) => {
                            const isHidden = entry.inactive;
                            return <span className={`ml-1 ${isHidden ? 'text-gray-400 dark:text-gray-600 line-through' : 'text-gray-600 dark:text-gray-300'}`}>{value}</span>
                        }}
                    />
                    <ReferenceLine x={currentHourStr} stroke={axisStroke} strokeDasharray="3 3" />
                    <Line type="monotone" dataKey="Precip" stroke={precipStroke} strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} hide={!settings.chartVisibility.Precip} animationDuration={1000} />
                    <Line type="monotone" dataKey="Coverage" name="Clouds" stroke={coverageStroke} strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} hide={!settings.chartVisibility.Coverage} animationDuration={1000} />
                </LineChart>
            </ResponsiveContainer>
        </Card>
    );
};

const DailyForecastCard: React.FC<{ data: WeatherSource; settings: AppSettings }> = ({ data, settings }) => {
    const isF = settings.tempUnit === 'F';
    const allHighs = data.daily.map(d => isF ? d.high_f : d.high_c);
    const allLows = data.daily.map(d => isF ? d.low_f : d.low_c);
    const maxTemp = Math.max(...allHighs);
    const minTemp = Math.min(...allLows);
    const tempRange = maxTemp - minTemp || 1; // Avoid division by zero

    return (
        <Card title="10-Day Outlook" className="w-full relative">
            {/* Scroll affordance gradient mask */}
            <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-white dark:from-[#161b22] to-transparent pointer-events-none z-10 rounded-r-2xl"></div>
            <div className="overflow-x-auto -mx-5 px-5 sm:-mx-6 sm:px-6 pb-2 no-scrollbar relative">
                <div className="flex space-x-3 min-w-max">
                    {data.daily.map((day, index) => {
                        const high = Math.round(isF ? day.high_f : day.high_c);
                        const low = Math.round(isF ? day.low_f : day.low_c);
                        const leftPercent = ((low - minTemp) / tempRange) * 100;
                        const widthPercent = ((high - low) / tempRange) * 100;

                        return (
                            <div key={index} className="flex flex-col items-center justify-between w-24 p-3 rounded-xl bg-gray-50 dark:bg-brand-primary/50 border border-gray-200 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-900 transition-colors group">
                                <div className="text-center mb-2">
                                    <p className="font-bold text-sm text-gray-900 dark:text-brand-text-primary">{new Date(day.date).toLocaleString('en-US', { weekday: 'short' })}</p>
                                    <p className="text-[10px] uppercase font-medium text-gray-500 dark:text-gray-400">{new Date(day.date).toLocaleString('en-US', { month: 'numeric', day: 'numeric' })}</p>
                                </div>
                                <div className="my-2 transform group-hover:scale-110 transition-transform duration-300">
                                    <WeatherConditionIcon code={day.weathercode} className="w-10 h-10" />
                                </div>
                                <div className="text-center w-full mt-1">
                                    <div className="flex justify-between items-end w-full px-1">
                                        <span className="text-lg font-bold text-gray-900 dark:text-brand-text-primary">{high}°</span>
                                        <span className="text-sm font-medium text-gray-500 dark:text-gray-500 mb-0.5">{low}°</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mt-1 overflow-hidden relative">
                                        <div className="absolute h-full bg-gradient-to-r from-blue-400 to-red-400 opacity-90 rounded-full" style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}></div>
                                    </div>
                                </div>
                                {day.precip_chance > 0 && (
                                    <div className="mt-2 flex items-center gap-0.5 text-[10px] font-bold text-blue-500 dark:text-blue-400">
                                        <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a8 8 0 100 16 8 8 0 000-16z" /></svg>
                                        {day.precip_chance}%
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </Card>
    )
};


const AqiCard: React.FC<{ data: WeatherSource }> = ({ data }) => {
    const aqi = data.aqi;
    const details = getAqiDetails(aqi?.category ?? 'Unknown');

    return (
        <Card title="Air Quality" className="flex flex-col justify-center h-full">
            <div className="flex items-center gap-5 h-full">
                <div className={`relative w-20 h-20 flex-shrink-0 rounded-full flex items-center justify-center ${details.color} shadow-lg ring-4 ring-white dark:ring-brand-primary`}>
                    <span className="text-2xl font-black text-white z-10">{aqi?.value ?? '--'}</span>
                    <div className="absolute inset-0 bg-white opacity-20 rounded-full"></div>
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex justify-between items-end mb-2">
                        <p className={`text-lg font-bold truncate ${details.textColor}`}>{aqi?.category ?? 'Unknown'}</p>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden mb-2">
                        <div className={`h-full ${details.color} transition-all duration-1000`} style={{ width: `${Math.min(100, (aqi?.value || 0) / 3)}%` }}></div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-brand-text-secondary leading-snug">{details.description}</p>
                </div>
            </div>
        </Card>
    );
};

// --- @dnd-kit Sortable Card Wrapper ---

const SortableCard: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        position: 'relative' as const,
        zIndex: isDragging ? 10 : 'auto',
    };

    return (
        <div ref={setNodeRef} style={style}>
            {/* Drag handle — only this triggers drag, rest of card scrolls normally */}
            <div
                {...attributes}
                {...listeners}
                style={{ touchAction: 'none' }}
                className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-gray-200/60 dark:bg-gray-700/60 hover:bg-gray-300/80 dark:hover:bg-gray-600/80 cursor-grab active:cursor-grabbing transition-colors"
                aria-label="Drag to reorder"
            >
                <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" />
                    <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
                    <circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" />
                </svg>
            </div>
            {children}
        </div>
    );
};

// --- Main View Component ---
interface ForecastViewProps {
    data: WeatherData;
    settings: AppSettings;
    onUpdateSettings: (s: Partial<AppSettings>) => void;
    coordinates: Coordinates | null;
}

const CARD_SECTIONS = ['temperature', 'precipitation', 'aqi', 'todaySummary', 'sun', 'daily'] as const;

// Migration: if old 4-item cardOrder is saved, convert to new 6-item format
const migrateCardOrder = (saved: string[] | undefined): string[] => {
    if (!saved) return [...CARD_SECTIONS];
    if (CARD_SECTIONS.every(s => saved.includes(s))) return saved;
    const newOrder: string[] = [];
    for (const id of saved) {
        if (id === 'hourly') {
            newOrder.push('temperature', 'precipitation');
        } else if (id === 'summary') {
            newOrder.push('aqi', 'todaySummary');
        } else if (CARD_SECTIONS.includes(id as any)) {
            newOrder.push(id);
        }
    }
    for (const s of CARD_SECTIONS) {
        if (!newOrder.includes(s)) newOrder.push(s);
    }
    return newOrder;
};

const ForecastView: React.FC<ForecastViewProps> = ({ data, settings, onUpdateSettings, coordinates }) => {
    const [activeSourceIndex, setActiveSourceIndex] = useState(0);
    const activeSource = data.sources[activeSourceIndex];

    const validOrder = React.useMemo(() => migrateCardOrder(settings.cardOrder), [settings.cardOrder]);
    const [cardOrder, setCardOrder] = useState<string[]>(validOrder);
    const [activeId, setActiveId] = useState<string | null>(null);

    useEffect(() => {
        setCardOrder(validOrder);
    }, [validOrder]);

    // Long-press sensors: 300ms delay, 8px movement tolerance
    const pointerSensor = useSensor(PointerSensor, {
        activationConstraint: { delay: 300, tolerance: 8 },
    });
    const touchSensor = useSensor(TouchSensor, {
        activationConstraint: { delay: 300, tolerance: 8 },
    });
    const sensors = useSensors(pointerSensor, touchSensor);

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
        document.body.classList.add('dragging-active');
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);
        document.body.classList.remove('dragging-active');

        if (over && active.id !== over.id) {
            const oldIndex = cardOrder.indexOf(active.id as string);
            const newIndex = cardOrder.indexOf(over.id as string);
            const newOrder = [...cardOrder];
            newOrder.splice(oldIndex, 1);
            newOrder.splice(newIndex, 0, active.id as string);
            setCardOrder(newOrder);
            onUpdateSettings({ cardOrder: newOrder });
        }
    };

    const handleDragCancel = () => {
        setActiveId(null);
        document.body.classList.remove('dragging-active');
    };

    const handleChartVisibilityChange = (key: keyof ChartVisibility) => {
        onUpdateSettings({
            chartVisibility: {
                ...settings.chartVisibility,
                [key]: !settings.chartVisibility[key]
            }
        });
    };

    const renderCard = (cardId: string) => {
        switch (cardId) {
            case 'temperature':
                return <TemperatureChartCard data={activeSource} settings={settings} onVisibilityChange={handleChartVisibilityChange} />;
            case 'precipitation':
                return <PrecipitationChartCard data={activeSource} settings={settings} onVisibilityChange={handleChartVisibilityChange} />;
            case 'aqi':
                return <AqiCard data={data.sources[0]} />;
            case 'todaySummary':
                return <TodaySummaryCard daily={activeSource.daily[0]} currentCode={activeSource.hourly[0].weathercode} settings={settings} />;
            case 'sun':
                return <SunTimesCard dailyData={data.sources[0].daily[0]} settings={settings} coordinates={coordinates} />;
            case 'daily':
                return <DailyForecastCard data={activeSource} settings={settings} />;
            default:
                return null;
        }
    };

    return (
        <div className="p-4 sm:p-6 space-y-6 animate-fadeInOut">
            {/* Sticky Source Selector */}
            <div className="sticky top-0 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-gray-50/80 dark:bg-brand-primary/80 backdrop-blur-md">
                <div className="flex justify-center">
                    <div className="inline-flex bg-gray-100 dark:bg-brand-secondary p-1 rounded-xl border border-gray-200 dark:border-gray-800 shadow-inner">
                        {data.sources.map((source, index) => (
                            <button
                                key={source.name}
                                onClick={() => setActiveSourceIndex(index)}
                                className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 ${activeSourceIndex === index
                                    ? 'bg-white dark:bg-brand-primary text-brand-accent shadow-sm scale-100'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
                                    }`}
                            >
                                {source.name}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* 2D Draggable Card Grid */}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
            >
                <SortableContext items={cardOrder} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {cardOrder.map((cardId) => (
                            <SortableCard key={cardId} id={cardId}>
                                {renderCard(cardId)}
                            </SortableCard>
                        ))}
                    </div>
                </SortableContext>

                <DragOverlay dropAnimation={{
                    duration: 250,
                    easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
                }}>
                    {activeId ? (
                        <div className="opacity-90 scale-[1.03] shadow-2xl rounded-xl pointer-events-none ring-2 ring-brand-accent/30">
                            {renderCard(activeId)}
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>

            {/* Disclaimer */}
            <div className="flex justify-center pt-4 opacity-70 hover:opacity-100 transition-opacity">
                <p className="text-[10px] text-gray-500 dark:text-gray-600 px-4 py-2 border border-dashed border-gray-300 dark:border-gray-700 rounded-full">
                    {activeSource.disclaimer}
                </p>
            </div>
        </div>
    );
};

export default ForecastView;

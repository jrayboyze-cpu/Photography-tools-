import SunCalc from 'suncalc';

export const calculateSunTimes = (date: Date, lat: number, lon: number): { sunrise: Date; sunset: Date } => {
    const times = SunCalc.getTimes(date, lat, lon);
    return {
        sunrise: times.sunrise,
        sunset: times.sunset
    };
};

export const getGoldenHourString = (lat: number, lon: number, date: Date = new Date(), timeFormat: '12h' | '24h') => {
    const times = SunCalc.getTimes(date, lat, lon);
    
    const formatTime = (d: Date) => {
        if (!d || isNaN(d.getTime())) return '--:--';
        return d.toLocaleTimeString('en-US', { 
            hour: timeFormat === '12h' ? 'numeric' : '2-digit', 
            minute: '2-digit', 
            hour12: timeFormat === '12h' 
        });
    };

    return {
        am: `${formatTime(times.sunrise)} - ${formatTime(times.goldenHourEnd)}`,
        pm: `${formatTime(times.goldenHour)} - ${formatTime(times.sunset)}`
    };
};

export const getBlueHourString = (lat: number, lon: number, date: Date = new Date(), timeFormat: '12h' | '24h') => {
    const times = SunCalc.getTimes(date, lat, lon);
    
    const formatTime = (d: Date) => {
        if (!d || isNaN(d.getTime())) return '--:--';
        return d.toLocaleTimeString('en-US', { 
            hour: timeFormat === '12h' ? 'numeric' : '2-digit', 
            minute: '2-digit', 
            hour12: timeFormat === '12h' 
        });
    };

    return {
        am: `${formatTime(times.dawn)} - ${formatTime(times.sunrise)}`,
        pm: `${formatTime(times.sunset)} - ${formatTime(times.dusk)}`
    };
};

import { Coordinates } from '../types';

export const getPlaceAutocomplete = async (input: string): Promise<Coordinates[]> => {
    if (!input || input.trim().length < 3) {
        return [];
    }

    try {
        const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(input)}&count=5&language=en&format=json`);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        
        if (data.results && Array.isArray(data.results)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return data.results.map((item: any) => {
                const parts = [item.name, item.admin1, item.country].filter(Boolean);
                return {
                    name: parts.join(', '),
                    lat: item.latitude,
                    lon: item.longitude
                };
            });
        }
        return [];
    } catch (error) {
        console.error("Error fetching place autocomplete:", error);
        return [];
    }
}

export const getCoordinates = async (location: string, userCoords?: Coordinates | null): Promise<Coordinates | null> => {
    // Check if location is already lat,lon
    const latLonRegex = /^-?([1-8]?\d(\.\d+)?|90(\.0+)?),\s*-?((1[0-7]\d(\.\d+)?|180(\.0+)?)|(\d{1,2}(\.\d+)?))$/;
    if (latLonRegex.test(location)) {
        const [lat, lon] = location.split(',').map(Number);
        return { lat, lon, name: `Coordinates (${lat.toFixed(2)}, ${lon.toFixed(2)})` };
    }

    try {
        // First try: Search with the full string provided
        let response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`);
        if (!response.ok) throw new Error('Network response was not ok');
        let data = await response.json();
        
        // Second try: If no results and the string contains commas (e.g. "Detroit, Michigan, US"), try searching just the city name
        if ((!data.results || data.results.length === 0) && location.includes(',')) {
             const simpleName = location.split(',')[0].trim();
             if (simpleName.length > 1) {
                response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(simpleName)}&count=1&language=en&format=json`);
                if (!response.ok) throw new Error('Network response was not ok');
                data = await response.json();
             }
        }
        
        if (data.results && data.results.length > 0) {
            const item = data.results[0];
            const parts = [item.name, item.admin1, item.country].filter(Boolean);
            return {
                lat: item.latitude,
                lon: item.longitude,
                name: parts.join(', ')
            };
        }
        return null;

    } catch (error) {
        console.error("Error fetching coordinates:", error);
        return null;
    }
}


import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from './components/Header';
import Tabs from './components/Tabs';
import ForecastView from './components/ForecastView';
import RadarView from './components/RadarView';
import FlightDetailsView from './components/FlightDetailsView';
import SettingsModal from './components/SettingsModal';
import Loader from './components/Loader';
import Toast from './components/Toast';
import { useGeolocation } from './hooks/useGeolocation';
import { fetchDirectWeatherDataAndDroneData } from './services/weatherService';
import { getCoordinates } from './services/geocodingService';
import type { WeatherData, DroneData, ActiveTab, AppSettings, Coordinates } from './types';
import { DEFAULT_SETTINGS } from './constants';

const loadSettings = (): AppSettings => {
  try {
    // Migration from old key
    const oldSettings = localStorage.getItem('aeroLensSettings');
    if (oldSettings) {
      localStorage.setItem('apertureForecastSettings', oldSettings);
      localStorage.removeItem('aeroLensSettings');
    }

    const savedSettings = localStorage.getItem('apertureForecastSettings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      // Merge with default to ensure new fields are present if old version is loaded
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (error) {
    console.error('Could not load settings from localStorage', error);
  }
  return DEFAULT_SETTINGS;
};


const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('forecast');
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [droneData, setDroneData] = useState<DroneData | null>(null);
  const [currentCoords, setCurrentCoords] = useState<Coordinates | null>(null);
  const [locationName, setLocationName] = useState<string>('Detecting location...');
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState(false);
  const [useGps, setUseGps] = useState(true);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const geo = useGeolocation(useGps);

  useEffect(() => {
    const root = window.document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const updateThemeClass = () => {
      root.classList.remove('dark', 'light');
      let theme: 'dark' | 'light';

      if (settings.theme === 'system') {
        theme = mediaQuery.matches ? 'dark' : 'light';
      } else {
        theme = settings.theme;
      }

      root.classList.add(theme);
    };

    updateThemeClass();
    mediaQuery.addEventListener('change', updateThemeClass);
    return () => {
      mediaQuery.removeEventListener('change', updateThemeClass);
    };
  }, [settings.theme]);

  const fetchDataForLocation = useCallback(async (loc: string | Coordinates) => {
    setIsLoading(true);
    setError(null);
    setLocationError(false);
    setWeatherData(null);
    setDroneData(null);

    try {
      let coords: Coordinates | null;
      if (typeof loc === 'string') {
        coords = await getCoordinates(loc, currentCoords);
        if (!coords) throw new Error(`Could not find location: ${loc}`);
      } else {
        coords = loc;
      }

      setLocationName(coords.name);
      setCurrentCoords(coords);

      const data = await fetchDirectWeatherDataAndDroneData(coords.lat, coords.lon);
      if (data) {
        setWeatherData(data.weatherData);
        setDroneData(data.droneData);
      } else {
        throw new Error('Failed to fetch weather data.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
      setToast({ message: err.message || 'An unexpected error occurred.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [currentCoords]);

  useEffect(() => {
    if (useGps) {
      if (geo.latitude && geo.longitude) {
        const coords = { lat: geo.latitude, lon: geo.longitude, name: `Current Location` };
        fetchDataForLocation(coords);
        setUseGps(false);
      } else if (geo.error) {
        setLocationError(true);
        setIsLoading(false);
        setUseGps(false);
      }
    }
  }, [geo.latitude, geo.longitude, geo.error, useGps, fetchDataForLocation]);

  const handleSearch = (searchLocation: string | Coordinates) => {
    setUseGps(false);
    setLocationError(false);
    fetchDataForLocation(searchLocation);
  };

  const handleUseGPS = () => {
    setUseGps(true);
    setLocationError(false);
  };

  const commitSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem('apertureForecastSettings', JSON.stringify(newSettings));
      } catch (error) {
        console.error('Could not save settings to localStorage', error);
      }
    }, 300);
  };

  const patchSettings = (partial: Partial<AppSettings>) => {
    commitSettings({ ...settings, ...partial });
  };

  const toggleFavorite = () => {
    if (!currentCoords) return;

    const isFavorite = settings.favorites?.some(f => f.name === currentCoords.name);
    let newFavorites;

    if (isFavorite) {
      newFavorites = settings.favorites.filter(f => f.name !== currentCoords.name);
      setToast({ message: 'Removed from favorites', type: 'info' });
    } else {
      newFavorites = [...(settings.favorites || []), currentCoords];
      setToast({ message: 'Added to favorites', type: 'success' });
    }

    patchSettings({ favorites: newFavorites });
  };

  const renderContent = () => {
    if (locationError) {
      return (
        <motion.div key="locationError" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-2xl border border-blue-100 dark:border-blue-800 max-w-md shadow-xl">
            <svg className="w-12 h-12 text-blue-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            <h2 className="text-xl font-bold text-gray-900 dark:text-brand-text-primary mb-2">Location Required</h2>
            <p className="text-gray-600 dark:text-brand-text-secondary mb-6">We couldn't detect your location. Please search for a location above to view the forecast.</p>
          </div>
        </motion.div>
      );
    }

    if (isLoading) {
      return (
        <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center min-h-[50vh]">
          <Loader message={`Analyzing atmosphere for ${locationName}...`} />
        </motion.div>
      );
    }
    if (error) {
      return (
        <motion.div key="error" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center">
          <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-2xl border border-red-100 dark:border-red-800 max-w-md shadow-xl">
            <svg className="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <h2 className="text-xl font-bold text-gray-900 dark:text-brand-text-primary mb-2">Connection Error</h2>
            <p className="text-gray-600 dark:text-brand-text-secondary mb-6">{error}</p>
            <button
              onClick={() => fetchDataForLocation(currentCoords!)}
              className="bg-brand-accent text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-600 dark:hover:bg-blue-400 transition-all transform hover:-translate-y-0.5 shadow-lg shadow-blue-500/30"
            >
              Retry Connection
            </button>
          </div>
        </motion.div>
      );
    }

    switch (activeTab) {
      case 'forecast':
        return weatherData ? (
          <motion.div key="forecast" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
            <ForecastView data={weatherData} settings={settings} onUpdateSettings={patchSettings} coordinates={currentCoords} />
          </motion.div>
        ) : null;
      case 'radar':
        return (
          <motion.div key="radar" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
            <RadarView latitude={currentCoords?.lat ?? null} longitude={currentCoords?.lon ?? null} />
          </motion.div>
        );
      case 'flight':
        return droneData ? (
          <motion.div key="flight" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
            <FlightDetailsView data={droneData} settings={settings} onUpdateSettings={patchSettings} />
          </motion.div>
        ) : null;
      default:
        return null;
    }
  };

  const isCurrentFavorite = currentCoords ? settings.favorites?.some(f => f.name === currentCoords.name) : false;

  return (
    <div className="min-h-screen bg-[#F4F6F8] dark:bg-[#0D1117] font-sans text-gray-900 dark:text-brand-text-primary transition-colors duration-300">
      <Header
        onSearch={handleSearch}
        onUseGPS={handleUseGPS}
        onShowSettings={() => setIsSettingsOpen(true)}
        locationName={locationName}
        isFavorite={isCurrentFavorite}
        onToggleFavorite={toggleFavorite}
        favorites={settings.favorites || []}
      />
      <Tabs activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="max-w-7xl mx-auto pb-10">
        <AnimatePresence mode="wait">
          {renderContent()}
        </AnimatePresence>
      </main>
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={commitSettings}
      />
      <AnimatePresence>
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;

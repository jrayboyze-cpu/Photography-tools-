
import { useState, useEffect } from 'react';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  loading: boolean;
  error: GeolocationPositionError | null;
}

export const useGeolocation = (enabled: boolean = true) => {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    loading: enabled,
    error: null,
  });

  useEffect(() => {
    if (!enabled) {
      setState(s => ({ ...s, loading: false }));
      return;
    }

    if (!navigator.geolocation) {
      // Geolocation is not supported by this browser.
      // We can't use an Error object here as the type is GeolocationPositionError
      setState(s => ({ ...s, loading: false, error: {
        code: 0,
        message: 'Geolocation is not supported by your browser.',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3
      }}));
      return;
    }

    const onSuccess = (position: GeolocationPosition) => {
      setState({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        loading: false,
        error: null,
      });
    };

    const onError = (error: GeolocationPositionError) => {
      setState(s => ({
        ...s,
        loading: false,
        error,
      }));
    };

    setState(s => ({ ...s, loading: true }));
    navigator.geolocation.getCurrentPosition(onSuccess, onError, { timeout: 10000, maximumAge: 60000 });

  }, [enabled]);

  return state;
};

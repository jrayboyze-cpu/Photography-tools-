import { useState, useEffect } from 'react';
import type { AppSettings } from '../types';

/**
 * A hook to determine if the current resolved theme is 'dark'.
 * It considers the user's explicit setting ('light' or 'dark') 
 * and falls back to the system preference for 'system'.
 */
const getResolvedIsDark = (theme: AppSettings['theme']): boolean => {
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  // 'system' — read OS preference synchronously
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

export const useResolvedTheme = (settings: AppSettings) => {
  const [isDark, setIsDark] = useState(() => getResolvedIsDark(settings.theme));

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const updateTheme = () => {
      setIsDark(getResolvedIsDark(settings.theme));
    };

    updateTheme();

    // Listen for changes in system preference
    mediaQuery.addEventListener('change', updateTheme);

    // Cleanup listener on component unmount
    return () => mediaQuery.removeEventListener('change', updateTheme);
  }, [settings.theme]);

  return { isDark };
};

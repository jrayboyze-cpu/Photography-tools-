
import React, { useState, useEffect, useRef } from 'react';
import { CompassIcon, SettingsIcon, SearchIcon, CloseIcon } from './icons/WeatherIcons';
import { LogoPng } from './icons/LogoData';
import { getPlaceAutocomplete } from '../services/geocodingService';
import { Coordinates } from '../types';

interface HeaderProps {
  onSearch: (location: string | Coordinates) => void;
  onUseGPS: () => void;
  onShowSettings: () => void;
  locationName: string;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  favorites?: Coordinates[];
}

const Header: React.FC<HeaderProps> = ({ onSearch, onUseGPS, onShowSettings, locationName, isFavorite, onToggleFavorite, favorites = [] }) => {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<Coordinates[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false); // Mobile search state
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce autocomplete suggestions
  useEffect(() => {
    if (inputValue.trim().length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    let active = true;

    const handler = setTimeout(async () => {
      const result = await getPlaceAutocomplete(inputValue);
      if (active) {
        setSuggestions(result);
        setShowSuggestions(result.length > 0);
        setSelectedIndex(-1);
      }
    }, 300); // 300ms debounce for faster feel

    return () => {
      active = false;
      clearTimeout(handler);
    };
  }, [inputValue]);

  // Handle clicks outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        if (window.innerWidth < 640 && !inputValue) {
          // Optional: Close mobile search if clicked outside and empty?
          // Maybe better to keep it open until explicit close.
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [inputValue]);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Check if the current input exactly matches a suggestion name
    const exactMatch = suggestions.find(s => s.name.toLowerCase() === inputValue.toLowerCase());

    if (selectedIndex >= 0 && suggestions[selectedIndex]) {
      onSearch(suggestions[selectedIndex]);
      clearSearch();
    } else if (exactMatch) {
      onSearch(exactMatch);
      clearSearch();
    } else if (inputValue.trim()) {
      onSearch(inputValue.trim());
      clearSearch();
    }
  };

  const clearSearch = () => {
    setInputValue('');
    setShowSuggestions(false);
    setSelectedIndex(-1);
    setIsMobileSearchOpen(false);
    inputRef.current?.blur();
  };

  const handleSuggestionClick = (suggestion: Coordinates) => {
    onSearch(suggestion);
    clearSearch();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setIsMobileSearchOpen(false);
    }
  };

  const toggleMobileSearch = () => {
    setIsMobileSearchOpen(!isMobileSearchOpen);
    if (!isMobileSearchOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setInputValue('');
    }
  };

  return (
    <header className="relative bg-white/95 dark:bg-brand-secondary/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 py-2 z-50 transition-colors duration-300 flex items-center">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 px-3 sm:px-4 w-full">

        {/* Logo Area (Hidden on mobile when search is open) */}
        <div className={`flex items-center gap-3 flex-1 min-w-0 group cursor-pointer ${isMobileSearchOpen ? 'hidden sm:flex' : 'flex'}`} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
            <img src={LogoPng} alt="Aperture Forecast Logo" className="w-9 h-9 flex-shrink-0 relative z-10" />
          </div>
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <h1 className="hidden sm:block text-lg font-bold truncate text-gray-900 dark:text-brand-text-primary tracking-tight leading-none mb-0.5">Aperture Forecast</h1>
            <div className="flex items-center gap-2">
              <p className="text-xs text-gray-500 dark:text-brand-text-secondary truncate font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block"></span>
                {locationName}
              </p>
              {onToggleFavorite && locationName !== 'Detecting location...' && (
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
                  className={`p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${isFavorite ? 'text-yellow-400' : 'text-gray-400'}`}
                  aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                >
                  <svg className="w-4 h-4" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Search & Actions Area */}
        <div className={`flex items-center gap-2 sm:gap-3 ${isMobileSearchOpen ? 'flex-1 w-full' : 'flex-shrink-0'}`}>

          {/* Mobile Search Toggle Button */}
          {!isMobileSearchOpen && (
            <button onClick={toggleMobileSearch} className="sm:hidden flex items-center justify-center h-10 w-10 text-gray-600 dark:text-brand-text-primary">
              <SearchIcon className="w-5 h-5" />
            </button>
          )}

          {/* Search Bar (Expandable on Mobile) */}
          <div ref={searchContainerRef} className={`relative group ${isMobileSearchOpen ? 'flex w-full' : 'hidden sm:block'}`}>
            <form onSubmit={handleSearch} className="flex items-center w-full">
              <div className="relative flex items-center w-full">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onFocus={() => setShowSuggestions(suggestions.length > 0 || favorites.length > 0)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search city..."
                  className="h-10 bg-gray-100 dark:bg-brand-primary border border-transparent dark:border-gray-700 text-gray-900 dark:text-brand-text-primary rounded-l-lg px-3 text-sm focus:outline-none focus:bg-white dark:focus:bg-brand-secondary focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent w-full sm:w-56 transition-all duration-200 placeholder-gray-500"
                  autoComplete="off"
                  aria-label="Search location"
                />
                <div className="absolute right-2 hidden sm:block pointer-events-none">
                  <span className="text-xs text-gray-400 dark:text-gray-600 border border-gray-300 dark:border-gray-700 rounded px-1.5 py-0.5">/</span>
                </div>
              </div>
              <button
                type="submit"
                className="h-10 bg-brand-accent hover:bg-blue-600 dark:hover:bg-blue-400 text-white px-4 rounded-r-lg text-sm font-semibold transition-all duration-200 border-l border-white/10 shadow-sm flex items-center justify-center"
                aria-label="Go"
              >
                Go
              </button>
              {/* Mobile Close Button */}
              {isMobileSearchOpen && (
                <button type="button" onClick={toggleMobileSearch} className="ml-2 text-gray-500 h-10 w-10 flex items-center justify-center">
                  <CloseIcon className="w-6 h-6" />
                </button>
              )}
            </form>

            {showSuggestions && (suggestions.length > 0 || favorites.length > 0) && (
              <div className="absolute top-full left-0 mt-1 min-w-[320px] bg-white dark:bg-brand-secondary border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl z-50 max-h-64 overflow-y-auto overflow-x-hidden">
                <ul role="listbox">
                  {suggestions.length === 0 && favorites.length > 0 && inputValue.length === 0 && (
                    <li className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 dark:bg-brand-primary">
                      Favorites
                    </li>
                  )}
                  {(suggestions.length > 0 ? suggestions : (inputValue.length === 0 ? favorites : [])).map((suggestion, index) => (
                    <li
                      key={index}
                      role="option"
                      aria-selected={index === selectedIndex}
                      className={`px-4 py-2.5 text-sm cursor-pointer transition-colors border-l-2 flex items-center justify-between ${index === selectedIndex
                        ? 'bg-blue-50 dark:bg-brand-accent/10 text-blue-700 dark:text-brand-accent border-blue-500'
                        : 'text-gray-700 dark:text-brand-text-primary hover:bg-gray-50 dark:hover:bg-brand-primary border-transparent'
                        }`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSuggestionClick(suggestion);
                      }}
                    >
                      <span>{suggestion.name}</span>
                      {suggestions.length === 0 && inputValue.length === 0 && (
                        <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className={`h-8 w-px bg-gray-200 dark:bg-gray-700 mx-1 hidden sm:block`}></div>

          <button
            onClick={onUseGPS}
            className={`h-10 w-10 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-brand-primary hover:bg-blue-100 dark:hover:bg-brand-accent/20 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-brand-accent transition-all duration-200 group ${isMobileSearchOpen ? 'hidden' : 'block'}`}
            aria-label="Use my location"
            title="Use current location"
          >
            <CompassIcon className="w-5 h-5 group-hover:rotate-45 transition-transform duration-300" />
          </button>

          <button
            onClick={onShowSettings}
            className={`h-10 w-10 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-brand-primary hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-all duration-200 group ${isMobileSearchOpen ? 'hidden' : 'block'}`}
            aria-label="Settings"
            title="Account & Preferences"
          >
            <SettingsIcon className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;

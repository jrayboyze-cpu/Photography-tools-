
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AppSettings, TempUnit, SpeedUnit, Theme, TimeFormat } from '../types';
import { DEFAULT_SETTINGS } from '../constants';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSave }) => {
  const [currentSettings, setCurrentSettings] = useState(settings);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentSettings(settings);
  }, [settings]);

  // Handle Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    }
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(currentSettings);
    setShowConfirmation(true);
    setTimeout(() => {
      setShowConfirmation(false);
      onClose();
    }, 1500);
  };

  const handleReset = () => {
    setCurrentSettings(DEFAULT_SETTINGS);
    setConfirmReset(false);
  }

  const OptionButton = ({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) => (
    <button
      onClick={onClick}
      className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 border ${active
          ? 'bg-brand-accent text-white border-brand-accent shadow-sm'
          : 'bg-white dark:bg-brand-primary text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
        }`}
    >
      {label}
    </button>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
          <motion.div
            ref={modalRef}
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
            className="bg-white dark:bg-brand-secondary rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-md relative overflow-hidden border border-gray-200 dark:border-gray-800"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 id="settings-title" className="text-2xl font-bold text-gray-900 dark:text-brand-text-primary">Account & Preferences</h2>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="space-y-6 max-h-[60vh] overflow-y-auto no-scrollbar pr-1">
              {/* Theme Settings */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-brand-text-secondary mb-3">Appearance</label>
                <div className="flex space-x-2">
                  <OptionButton active={currentSettings.theme === 'light'} onClick={() => setCurrentSettings({ ...currentSettings, theme: 'light' })} label="Light" />
                  <OptionButton active={currentSettings.theme === 'dark'} onClick={() => setCurrentSettings({ ...currentSettings, theme: 'dark' })} label="Dark" />
                  <OptionButton active={currentSettings.theme === 'system'} onClick={() => setCurrentSettings({ ...currentSettings, theme: 'system' })} label="System" />
                </div>
              </div>

              {/* Time Format */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-brand-text-secondary mb-3">Time & Date</label>
                <div className="flex space-x-2 mb-3">
                  <OptionButton active={currentSettings.timeFormat === '12h'} onClick={() => setCurrentSettings({ ...currentSettings, timeFormat: '12h' })} label="12-Hour" />
                  <OptionButton active={currentSettings.timeFormat === '24h'} onClick={() => setCurrentSettings({ ...currentSettings, timeFormat: '24h' })} label="24-Hour" />
                </div>
                <div className="flex space-x-2">
                  <OptionButton active={currentSettings.dateFormat === 'MM/DD'} onClick={() => setCurrentSettings({ ...currentSettings, dateFormat: 'MM/DD' })} label="MM/DD/YY" />
                  <OptionButton active={currentSettings.dateFormat === 'DD/MM'} onClick={() => setCurrentSettings({ ...currentSettings, dateFormat: 'DD/MM' })} label="DD/MM/YY" />
                </div>
              </div>

              {/* Temperature Units */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-brand-text-secondary mb-3">Temperature</label>
                <div className="flex space-x-2">
                  <OptionButton active={currentSettings.tempUnit === 'F'} onClick={() => setCurrentSettings({ ...currentSettings, tempUnit: 'F' })} label="Fahrenheit (°F)" />
                  <OptionButton active={currentSettings.tempUnit === 'C'} onClick={() => setCurrentSettings({ ...currentSettings, tempUnit: 'C' })} label="Celsius (°C)" />
                </div>
              </div>

              {/* Speed Units */}
              <div className="pb-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-brand-text-secondary mb-3">Wind Speed</label>
                <div className="flex space-x-2">
                  <OptionButton active={currentSettings.speedUnit === 'mph'} onClick={() => setCurrentSettings({ ...currentSettings, speedUnit: 'mph' })} label="mph" />
                  <OptionButton active={currentSettings.speedUnit === 'kph'} onClick={() => setCurrentSettings({ ...currentSettings, speedUnit: 'kph' })} label="kph" />
                  <OptionButton active={currentSettings.speedUnit === 'kts'} onClick={() => setCurrentSettings({ ...currentSettings, speedUnit: 'kts' })} label="knots" />
                </div>
              </div>

              {/* Data Management */}
              <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-brand-text-secondary mb-3">Data Management</label>
                {!confirmReset ? (
                  <button onClick={() => setConfirmReset(true)} className="text-sm text-red-500 hover:text-red-700 font-medium transition-colors">
                    Reset all preferences to default
                  </button>
                ) : (
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Are you sure?</span>
                    <button onClick={handleReset} className="text-sm text-red-500 hover:text-red-700 font-bold transition-colors">Yes, Reset</button>
                    <button onClick={() => setConfirmReset(false)} className="text-sm text-gray-500 hover:text-gray-700 transition-colors">Cancel</button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
              <button onClick={onClose} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">Cancel</button>
              <button onClick={handleSave} className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-brand-accent text-white hover:bg-blue-600 dark:hover:bg-blue-400 shadow-lg shadow-blue-500/30 transition-all transform hover:-translate-y-0.5">Save Changes</button>
            </div>

            {showConfirmation && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-white/95 dark:bg-brand-secondary/95 flex items-center justify-center z-20"
              >
                <div className="text-center">
                  <motion.div
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", bounce: 0.5 }}
                    className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4"
                  >
                    <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                  </motion.div>
                  <p className="text-xl font-bold text-gray-900 dark:text-brand-text-primary">Settings Saved</p>
                </div>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SettingsModal;

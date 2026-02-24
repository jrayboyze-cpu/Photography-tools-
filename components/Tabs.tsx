
import React from 'react';
import { motion } from 'framer-motion';
import { TABS } from '../constants';
import type { ActiveTab } from '../types';

interface TabsProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}

const Tabs: React.FC<TabsProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="bg-white dark:bg-brand-secondary border-b border-gray-200 dark:border-gray-800 z-20 shadow-sm transition-colors duration-300">
      <nav className="relative max-w-7xl mx-auto flex" aria-label="Tabs" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            id={`tab-${tab.id}`}
            className={`
              relative flex-1 py-3 sm:py-4 px-1 text-sm font-medium focus:outline-none transition-colors duration-200
              ${activeTab === tab.id
                ? 'text-brand-accent'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }
            `}
          >
            {tab.label}
            {activeTab === tab.id && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-accent rounded-t-full shadow-[0_-2px_6px_rgba(88,166,255,0.4)]"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Tabs;

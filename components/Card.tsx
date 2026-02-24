
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className = '', title, subtitle, action }) => (
  <div className={`bg-white dark:bg-brand-secondary rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-5 sm:p-6 transition-all duration-300 hover:shadow-md ${className}`}>
    {(title || action) && (
      <div className="flex justify-between items-start mb-5">
        <div>
            {title && <h3 className="text-lg font-bold text-gray-900 dark:text-brand-text-primary leading-tight">{title}</h3>}
            {subtitle && <p className="text-xs text-gray-500 dark:text-brand-text-secondary mt-1">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
    )}
    {children}
  </div>
);

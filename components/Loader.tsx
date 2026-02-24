
import React from 'react';
import { motion } from 'framer-motion';

const Loader: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => (
  <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
    <div className="flex justify-center mb-2">
       <div className="w-48 h-10 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse"></div>
    </div>
    
    <div className="w-full h-[320px] bg-white dark:bg-brand-secondary rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 animate-pulse">
        <div className="w-32 h-6 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
        <div className="w-48 h-4 bg-gray-200 dark:bg-gray-700 rounded mb-8"></div>
        <div className="w-full h-48 bg-gray-100 dark:bg-gray-800 rounded-lg"></div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="h-48 bg-white dark:bg-brand-secondary rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 animate-pulse flex items-center gap-5">
            <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0"></div>
            <div className="flex-1 space-y-3">
                <div className="w-24 h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                <div className="w-3/4 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
        </div>
        <div className="h-48 bg-white dark:bg-brand-secondary rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 animate-pulse flex flex-col items-center justify-center space-y-4">
            <div className="w-32 h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700"></div>
            <div className="flex gap-4">
                <div className="w-12 h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="w-12 h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
        </div>
    </div>
    
    <div className="flex justify-center mt-4">
        <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">{message}</p>
    </div>
  </div>
);

export default Loader;
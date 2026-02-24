
import React, { useState } from 'react';
import { Card } from './Card';

type RadarLayerId = 'rain' | 'clouds' | 'temp' | 'wind';

interface RadarLayer {
  id: RadarLayerId;
  label: string;
}

const RADAR_LAYERS: RadarLayer[] = [
  { id: 'rain', label: 'Precipitation' },
  { id: 'clouds', label: 'Cloud Cover' },
  { id: 'temp', label: 'Temperature' },
  { id: 'wind', label: 'Wind Speed' },
];

interface RadarViewProps {
  latitude: number | null;
  longitude: number | null;
}

const RadarView: React.FC<RadarViewProps> = ({ latitude, longitude }) => {
  const [activeLayer, setActiveLayer] = useState<RadarLayerId>('rain');

  const lat = latitude ?? 40.7128;
  const lon = longitude ?? -74.0060;

  const mapUrl = `https://embed.windy.com/embed.html?type=map&location=coordinates&lat=${lat}&lon=${lon}&zoom=7&overlay=${activeLayer}&product=ecmwf`;

  return (
    <div className="p-4 sm:p-6 h-[calc(100vh-140px)] min-h-[600px] flex flex-col animate-fadeInOut">
        <Card className="flex flex-col h-full !p-0 overflow-hidden relative" title="">
            <div className="absolute top-4 left-4 right-4 z-10 flex flex-wrap gap-2 justify-center sm:justify-start pointer-events-none">
                 <div className="bg-white/90 dark:bg-brand-secondary/90 backdrop-blur-md p-1.5 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 pointer-events-auto flex gap-1">
                    {RADAR_LAYERS.map((layer) => (
                        <button
                            key={layer.id}
                            onClick={() => setActiveLayer(layer.id)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                activeLayer === layer.id
                                    ? 'bg-brand-accent text-white shadow-md'
                                    : 'bg-transparent text-gray-600 dark:text-brand-text-secondary hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                        >
                            {layer.label}
                        </button>
                    ))}
                 </div>
            </div>
            
            <div className="flex-grow bg-gray-100 dark:bg-brand-primary">
                <iframe
                    src={mapUrl}
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    allowFullScreen
                    title={`Radar Map - ${activeLayer}`}
                    className="w-full h-full"
                    key={activeLayer}
                ></iframe>
            </div>
            <div className="bg-white dark:bg-brand-secondary p-2 text-center border-t border-gray-200 dark:border-gray-800">
                 <p className="text-[10px] text-gray-400">Powered by <a href="https://windy.com" target="_blank" rel="noopener noreferrer" className="hover:text-brand-accent transition-colors">Windy.com</a></p>
            </div>
        </Card>
    </div>
  );
};

export default RadarView;

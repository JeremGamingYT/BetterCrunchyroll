import React from 'react';
import { Season } from '../types';

interface SeasonSelectorProps {
  seasons: Season[];
  activeSeasonId: string;
  onSelect: (id: string) => void;
}

export const SeasonSelector: React.FC<SeasonSelectorProps> = ({ seasons, activeSeasonId, onSelect }) => {
  return (
    <div className="w-full z-40 sticky top-[72px] transition-all">
        <div className="absolute inset-0 bg-dark-bg/95 backdrop-blur-xl border-b border-white/5 shadow-2xl supports-[backdrop-filter]:bg-dark-bg/80"></div>
        <div className="relative max-w-[1800px] mx-auto px-6 md:px-10 flex items-center gap-8 overflow-x-auto no-scrollbar">
            {seasons.map((season) => (
            <button
                key={season.id}
                onClick={() => onSelect(season.id)}
                className={`py-6 text-sm md:text-base font-bold transition-all relative whitespace-nowrap tracking-wide flex flex-col items-center group ${
                activeSeasonId === season.id
                    ? 'text-white'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
            >
                <span className={`px-2 py-1 rounded-lg transition-all duration-300 ${activeSeasonId === season.id ? 'text-glow' : ''}`}>
                    {season.title}
                </span>
                
                {/* Active Indicator - Soft Glow Bar */}
                <span className={`absolute bottom-0 w-full h-[3px] rounded-t-full bg-gradient-to-r from-crunchy to-orange-500 shadow-[0_-4px_20px_rgba(244,117,33,0.6)] transition-all duration-500 ease-out ${
                activeSeasonId === season.id ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'
                }`} />
            </button>
            ))}
        </div>
    </div>
  );
};
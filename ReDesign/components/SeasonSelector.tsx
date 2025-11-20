import React from 'react';
import { Season } from '../types';
import { motion } from 'framer-motion';

interface SeasonSelectorProps {
  seasons: Season[];
  activeSeasonId: string;
  onSelectSeason: (id: string) => void;
}

export const SeasonSelector: React.FC<SeasonSelectorProps> = ({ seasons, activeSeasonId, onSelectSeason }) => {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
         <h3 className="text-xl font-semibold text-white tracking-tight">Seasons</h3>
         <span className="text-sm text-gray-500 font-medium">{seasons.length} Seasons Available</span>
      </div>
      
      <div className="relative flex items-center p-1 bg-brand-surface/50 backdrop-blur-md rounded-full w-fit border border-white/5">
        {seasons.map((season) => {
          const isActive = season.id === activeSeasonId;
          return (
            <button
              key={season.id}
              onClick={() => onSelectSeason(season.id)}
              className={`relative px-6 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors duration-300 z-10 ${
                isActive 
                  ? 'text-black' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeSeason"
                  className="absolute inset-0 bg-white rounded-full -z-10 shadow-lg"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              {season.title}
            </button>
          );
        })}
      </div>
    </div>
  );
};
import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Season } from '../types';
import { EpisodeCard } from './EpisodeCard';
import { SeasonSelector } from './SeasonSelector';
import { ListFilter, ArrowUpDown } from 'lucide-react';

interface EpisodeListProps {
  seasons: Season[];
  studio: string;
  maturityRating: string;
}

export const EpisodeList: React.FC<EpisodeListProps> = ({ seasons, studio, maturityRating }) => {
  const [activeSeasonId, setActiveSeasonId] = useState(seasons[0].id);
  
  const activeSeason = seasons.find(s => s.id === activeSeasonId) || seasons[0];

  return (
    <div className="w-full bg-brand-black relative z-30">
      
      {/* Section Header Area - Sticky with Blur */}
      <div className="sticky top-[72px] z-40 py-6 bg-brand-black/90 backdrop-blur-xl border-b border-white/5 shadow-2xl transition-all duration-300">
        <div className="px-6 md:px-16 max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6">
          <SeasonSelector 
              seasons={seasons} 
              activeSeasonId={activeSeasonId} 
              onSelectSeason={setActiveSeasonId} 
          />
          
          {/* Filters Mockup */}
          <div className="flex items-center gap-3">
             <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-300 hover:text-white transition-colors border border-white/5">
                <ListFilter size={14} />
                Filter
             </button>
             <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-300 hover:text-white transition-colors border border-white/5">
                <ArrowUpDown size={14} />
                Sort
             </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="px-6 md:px-16 py-12 max-w-[1600px] mx-auto min-h-[800px]">
        
        {/* Episodes Grid */}
        <motion.div 
          key={activeSeasonId}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-12"
        >
          {activeSeason.episodes.length > 0 ? (
            activeSeason.episodes.map((episode, index) => (
              <EpisodeCard key={episode.id} episode={episode} index={index} />
            ))
          ) : (
            <div className="col-span-full py-40 flex flex-col items-center justify-center text-gray-500">
              <div className="w-20 h-20 border border-white/10 bg-white/5 rounded-full flex items-center justify-center mb-6 animate-pulse">
                <span className="text-3xl opacity-50">?</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">No Episodes Available</h3>
              <p className="text-sm opacity-50 max-w-md text-center leading-relaxed">
                Season {activeSeason.title} content hasn't been released yet. Check back later for updates.
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};
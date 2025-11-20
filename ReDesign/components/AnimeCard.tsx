import React from 'react';
import { motion } from 'framer-motion';
import { Play, Bookmark, Plus } from 'lucide-react';
import { AnimeDetails, Episode } from '../types';

interface AnimeCardProps {
  data: AnimeDetails | Episode;
  variant: 'portrait' | 'landscape';
  onClick?: () => void;
}

export const AnimeCard: React.FC<AnimeCardProps> = ({ data, variant, onClick }) => {
  const isEpisode = (item: any): item is Episode => {
    return (item as Episode).progress !== undefined || (item as Episode).duration !== undefined;
  };

  const imageSrc = isEpisode(data) ? data.thumbnailUrl : data.heroImage;
  const title = data.title;
  const subtitle = isEpisode(data) 
    ? `E${data.number} - ${data.duration}m` 
    : `${(data as AnimeDetails).tags?.[0]} • Sub | Dub`;

  if (variant === 'landscape') {
    // Resume / Episode Card Style
    return (
      <motion.div 
        whileHover={{ scale: 1.02 }}
        onClick={onClick}
        className="relative flex-shrink-0 w-[280px] sm:w-[320px] cursor-pointer group"
      >
        <div className="relative aspect-video rounded-xl overflow-hidden mb-3 shadow-lg border border-white/5">
          <img 
            src={imageSrc} 
            alt={title} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
          />
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors duration-300 flex items-center justify-center">
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              whileHover={{ opacity: 1, scale: 1 }}
              className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/30 flex items-center justify-center text-white shadow-xl"
            >
              <Play fill="currentColor" size={20} className="ml-1" />
            </motion.div>
          </div>
          
          {/* Progress Bar */}
          {isEpisode(data) && data.progress !== undefined && (
            <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/20">
               <div className="h-full bg-brand-orange shadow-[0_0_10px_rgba(244,117,33,0.8)]" style={{ width: `${data.progress}%` }} />
            </div>
          )}
        </div>

        <div className="px-1">
          <h4 className="text-white font-semibold text-sm line-clamp-1 group-hover:text-brand-orange transition-colors">{title}</h4>
          <p className="text-gray-400 text-xs mt-1 font-medium">{subtitle}</p>
        </div>
      </motion.div>
    );
  }

  // Portrait / Series Card Style
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      onClick={onClick}
      className="relative flex-shrink-0 w-[160px] sm:w-[200px] cursor-pointer group"
    >
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden mb-3 shadow-lg border border-white/5">
        <img 
          src={imageSrc} 
          alt={title} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />

        {/* Hover Actions */}
        <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 flex flex-col gap-2">
           <button className="w-full py-2 bg-brand-orange text-black text-xs font-bold rounded-full flex items-center justify-center gap-1 hover:brightness-110 transition-all">
              <Play size={12} fill="currentColor" /> WATCH NOW
           </button>
           <button 
             onClick={(e) => e.stopPropagation()}
             className="w-full py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-bold rounded-full flex items-center justify-center gap-1 hover:bg-white/20 transition-all"
            >
              <Plus size={12} /> WATCHLIST
           </button>
        </div>
        
        {/* Bookmark Icon Top Right */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
           <div className="p-1.5 bg-black/50 backdrop-blur-md rounded-full text-white hover:text-brand-orange cursor-pointer">
             <Bookmark size={14} />
           </div>
        </div>
      </div>

      <div className="px-1">
        <h4 className="text-white font-bold text-sm sm:text-base line-clamp-1 group-hover:text-brand-orange transition-colors">{title}</h4>
        <p className="text-gray-400 text-xs mt-1 font-medium">{subtitle}</p>
      </div>
    </motion.div>
  );
};
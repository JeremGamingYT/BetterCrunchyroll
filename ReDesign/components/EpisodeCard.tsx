import React from 'react';
import { Play, Lock, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { Episode } from '../types';

interface EpisodeCardProps {
  episode: Episode;
  index: number;
}

export const EpisodeCard: React.FC<EpisodeCardProps> = ({ episode, index }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ delay: index * 0.05, duration: 0.5, ease: "easeOut" }}
      className="group relative flex flex-col w-full cursor-pointer"
    >
      {/* Image Container */}
      <div className="relative w-full aspect-video rounded-2xl overflow-hidden mb-4 bg-brand-surface border border-white/5 shadow-lg group-hover:shadow-brand-orange/10 transition-all duration-500">
        <img 
          src={episode.thumbnailUrl} 
          alt={episode.title}
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 will-change-transform opacity-90 group-hover:opacity-100"
          loading="lazy"
        />
        
        {/* Dark Overlay on Hover */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Play Icon Centered */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-95 group-hover:scale-100">
           <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-2xl text-white hover:bg-brand-orange hover:border-brand-orange hover:text-black transition-all duration-300">
             <Play fill="currentColor" size={24} className="ml-1" />
           </div>
        </div>

        {/* Progress Bar - Apple style thin bar */}
        {episode.progress !== undefined && (
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/20 z-10">
            <div 
              className="h-full bg-brand-orange shadow-[0_0_10px_rgba(244,117,33,1)]" 
              style={{ width: `${episode.progress}%` }}
            />
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-3 right-3 flex gap-2">
          {episode.isPremium && (
             <div className="bg-black/60 backdrop-blur-md p-1.5 rounded-full text-brand-orange z-10 border border-white/5">
               <Lock size={12} strokeWidth={3} />
             </div>
          )}
        </div>
        
        {/* Episode Duration */}
        <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-md px-2 py-1 rounded-md text-[10px] text-white font-bold tracking-wide border border-white/5">
          {episode.duration}m
        </div>
      </div>

      {/* Text Content */}
      <div className="flex flex-col gap-1.5 px-1">
        <div className="flex items-baseline justify-between">
           <h3 className="text-white font-semibold text-base line-clamp-1 group-hover:text-brand-orange transition-colors duration-300 tracking-tight">
            {episode.title}
          </h3>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 font-medium mb-1">
           <span className="text-brand-orange font-bold">E{episode.number}</span>
           <span className="w-1 h-1 rounded-full bg-gray-700"></span>
           <span>Subbed</span>
           <span className="w-1 h-1 rounded-full bg-gray-700"></span>
           <span>Dubbed</span>
        </div>
        <p className="text-gray-400 text-xs line-clamp-2 leading-relaxed font-normal group-hover:text-gray-300 transition-colors">
          {episode.description}
        </p>
      </div>
    </motion.div>
  );
};
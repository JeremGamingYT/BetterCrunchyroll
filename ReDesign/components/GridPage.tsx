import React from 'react';
import { motion } from 'framer-motion';
import { AnimeCard } from './AnimeCard';
import { AnimeDetails } from '../types';
import { Filter, ArrowUpDown } from 'lucide-react';

interface GridPageProps {
  title: string;
  description?: string;
  items: AnimeDetails[];
  onWatch: (anime: AnimeDetails) => void;
}

export const GridPage: React.FC<GridPageProps> = ({ title, description, items, onWatch }) => {
  return (
    <div className="min-h-screen bg-brand-black pt-24 pb-12 px-6 md:px-16 max-w-[1600px] mx-auto">
      
      {/* Header Section */}
      <div className="relative mb-12 mt-6">
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-brand-orange/10 rounded-full blur-3xl -z-10"></div>
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-6xl font-black text-white tracking-tighter mb-4"
        >
          {title}
        </motion.h1>
        {description && (
           <motion.p 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.1 }}
             className="text-gray-400 text-lg max-w-2xl"
           >
             {description}
           </motion.p>
        )}
      </div>

      {/* Filter Bar */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex items-center justify-between mb-8 pb-4 border-b border-white/5"
      >
        <div className="text-sm text-gray-500 font-medium">
          Showing {items.length} Results
        </div>
        <div className="flex items-center gap-3">
           <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-300 hover:text-white transition-colors border border-white/5">
              <ListFilterIcon size={14} />
              Genre
           </button>
           <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-300 hover:text-white transition-colors border border-white/5">
              <ArrowUpDown size={14} />
              Sort by: Recommended
           </button>
        </div>
      </motion.div>

      {/* Content Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-12">
        {items.map((anime, index) => (
          <motion.div
            key={`${anime.id}-${index}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: index * 0.05 }}
          >
            <AnimeCard 
              data={anime} 
              variant="portrait" 
              onClick={() => onWatch(anime)}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const ListFilterIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
  </svg>
);
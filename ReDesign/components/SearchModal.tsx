import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Play, Calendar, Star, Hash } from 'lucide-react';
import { AnimeDetails } from '../types';
import { 
  DEMON_SLAYER_DATA, 
  SOLO_LEVELING_DATA, 
  KAIJU_NO8_DATA, 
  RECOMMENDED_ANIME, 
  TRENDING_ANIME,
  POPULAR_ANIME,
  NEW_RELEASES
} from '../constants';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResultClick: (anime: AnimeDetails) => void;
}

// Deduplicate all available anime data
const ALL_ANIME = [
  DEMON_SLAYER_DATA,
  SOLO_LEVELING_DATA,
  KAIJU_NO8_DATA,
  ...RECOMMENDED_ANIME,
  ...TRENDING_ANIME,
  ...POPULAR_ANIME,
  ...NEW_RELEASES
].reduce((acc, current) => {
  if (!acc.find(item => item.id === current.id)) {
    acc.push(current);
  }
  return acc;
}, [] as AnimeDetails[]);

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, onResultClick }) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      // Small timeout to allow animation to start
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Close on ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const filteredResults = useMemo(() => {
    if (!query.trim()) return [];
    const lowerQuery = query.toLowerCase();
    return ALL_ANIME.filter(anime => 
      anime.title.toLowerCase().includes(lowerQuery) || 
      anime.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
      anime.studio.toLowerCase().includes(lowerQuery)
    ).slice(0, 5); // Limit results for cleaner UI
  }, [query]);

  const topResults = ALL_ANIME.slice(0, 3); // Show trending if empty

  if (typeof document === 'undefined') return null;

  return ReactDOM.createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl"
            onClick={onClose}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed top-0 left-0 right-0 z-[101] p-4 sm:p-8 flex justify-center pointer-events-none"
          >
            <div className="w-full max-w-2xl bg-[#151517] border border-white/10 rounded-2xl shadow-2xl overflow-hidden pointer-events-auto flex flex-col">
              
              {/* Search Header */}
              <div className="relative flex items-center px-6 py-4 border-b border-white/5 bg-white/[0.02]">
                <Search className="w-6 h-6 text-gray-400 mr-4" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search anime, genres, studios..."
                  className="flex-1 bg-transparent text-white text-lg sm:text-xl font-medium placeholder-gray-500 outline-none border-none"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <button 
                  onClick={onClose}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors ml-4"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Results Area */}
              <div className="p-4 max-h-[60vh] overflow-y-auto no-scrollbar">
                
                {!query.trim() && (
                  <div className="mb-2">
                     <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest px-2 mb-3">Trending Searches</h3>
                     <div className="flex flex-wrap gap-2 px-2">
                       {['Demon Slayer', 'Solo Leveling', 'Action', 'Isekai', 'MAPPA'].map(tag => (
                         <button 
                           key={tag}
                           onClick={() => setQuery(tag)}
                           className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-gray-300 hover:text-brand-orange border border-white/5 transition-colors"
                         >
                           {tag}
                         </button>
                       ))}
                     </div>
                     <div className="mt-6 px-2">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Top Anime</h3>
                        {topResults.map(anime => (
                           <SearchResultItem key={anime.id} anime={anime} onClick={() => onResultClick(anime)} />
                        ))}
                     </div>
                  </div>
                )}

                {query.trim() && filteredResults.length > 0 && (
                  <div className="space-y-2">
                    {filteredResults.map((anime) => (
                      <SearchResultItem key={anime.id} anime={anime} onClick={() => onResultClick(anime)} />
                    ))}
                  </div>
                )}

                {query.trim() && filteredResults.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                    <Search size={48} className="mb-4 opacity-20" />
                    <p className="text-lg">No results found for "{query}"</p>
                  </div>
                )}
              </div>
              
              {/* Footer Tip */}
              <div className="px-6 py-3 bg-white/[0.02] border-t border-white/5 text-[10px] text-gray-500 flex justify-between items-center">
                <span>Search across titles, characters, and genres</span>
                <span className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-white/10 border border-white/5 font-mono">ESC to close</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};

const SearchResultItem = ({ anime, onClick }: { anime: AnimeDetails, onClick: () => void }) => (
  <motion.div 
    layout
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    onClick={onClick}
    className="flex items-center gap-4 p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group"
  >
    {/* Thumbnail */}
    <div className="relative w-16 h-24 sm:w-20 sm:h-28 shrink-0 rounded-lg overflow-hidden shadow-lg">
      <img src={anime.heroImage} alt={anime.title} className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="w-8 h-8 rounded-full bg-brand-orange text-black flex items-center justify-center shadow-lg">
          <Play size={12} fill="currentColor" className="ml-0.5" />
        </div>
      </div>
    </div>

    {/* Details */}
    <div className="flex-1 min-w-0">
      <h4 className="text-white font-bold text-lg truncate group-hover:text-brand-orange transition-colors">{anime.title}</h4>
      <div className="flex items-center gap-3 text-xs text-gray-400 mt-1 mb-2">
        <span className="flex items-center gap-1"><Star size={10} className="text-brand-orange" fill="currentColor"/> {anime.rating}</span>
        <span className="w-1 h-1 rounded-full bg-gray-600" />
        <span>{anime.year}</span>
        <span className="w-1 h-1 rounded-full bg-gray-600" />
        <span>{anime.episodeCount || '?'} Eps</span>
      </div>
      <div className="flex gap-2 overflow-hidden">
        {anime.tags.slice(0, 3).map(tag => (
          <span key={tag} className="px-2 py-0.5 rounded text-[10px] bg-white/5 border border-white/10 text-gray-300 whitespace-nowrap">
            {tag}
          </span>
        ))}
      </div>
    </div>
  </motion.div>
);
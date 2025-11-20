import React, { useState, useEffect } from 'react';
import { Play, Plus, Star, Info, ChevronRight, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/Button';
import { AnimeDetails, AniListMedia } from '../types';
import { InfoModal } from './InfoModal';

interface HeroCarouselProps {
  items: AnimeDetails[];
  onWatch: (anime: AnimeDetails) => void;
}

export const HeroCarousel: React.FC<HeroCarouselProps> = ({ items, onWatch }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [aniListData, setAniListData] = useState<AniListMedia | null>(null);

  // Auto-play functionality
  useEffect(() => {
    const timer = setInterval(() => {
      nextSlide();
    }, 8000); // 8 seconds per slide
    return () => clearInterval(timer);
  }, [currentIndex]);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % items.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  const currentAnime = items[currentIndex];

  const fetchAnimeInfo = async () => {
    // Logic reused from original Hero but applied to current slide
    const anime = currentAnime;
    
    if (aniListData && aniListData.title.english?.toLowerCase().includes(anime.title.toLowerCase())) {
      setIsModalOpen(true);
      return;
    }

    const cacheKey = `anistream_cache_${anime.id}`;
    try {
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        setAniListData(parsed);
        setIsModalOpen(true);
        return;
      }
    } catch (e) {
       // ignore
    }

    setIsLoading(true);
    setIsModalOpen(true);

    try {
      const query = `
        query ($search: String) {
          Media(search: $search, type: ANIME) {
            title { romaji english native }
            description
            coverImage { large extraLarge }
            bannerImage
            averageScore
            episodes
            status
            genres
            startDate { year }
            studios(isMain: true) { nodes { name } }
            staff(perPage: 6, sort: RELEVANCE) { nodes { name { full } primaryOccupations } }
          }
        }
      `;

      const response = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          query,
          variables: { search: anime.title },
        }),
      });

      const data = await response.json();
      if (data.data && data.data.Media) {
        setAniListData(data.data.Media);
        localStorage.setItem(cacheKey, JSON.stringify(data.data.Media));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="relative w-full h-[95vh] min-h-[700px] overflow-hidden bg-black group/carousel">
        
        {/* Carousel Slides */}
        <AnimatePresence mode="popLayout">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute inset-0 z-0"
          >
            <img 
              src={currentAnime.heroImage} 
              alt={currentAnime.title}
              className="w-full h-full object-cover object-center opacity-80" 
            />
            
            {/* Gradients */}
            <div className="absolute inset-0 bg-gradient-to-r from-brand-black via-brand-black/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-black via-transparent to-black/60" />
          </motion.div>
        </AnimatePresence>

        {/* Navigation Arrows (Visible on Hover) */}
        <button 
          onClick={(e) => { e.stopPropagation(); prevSlide(); }}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-black/20 text-white/50 border border-white/10 hover:bg-brand-orange hover:text-black hover:border-brand-orange transition-all duration-300 opacity-0 group-hover/carousel:opacity-100 backdrop-blur-md"
        >
          <ChevronLeft size={28} />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); nextSlide(); }}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full bg-black/20 text-white/50 border border-white/10 hover:bg-brand-orange hover:text-black hover:border-brand-orange transition-all duration-300 opacity-0 group-hover/carousel:opacity-100 backdrop-blur-md"
        >
          <ChevronRight size={28} />
        </button>

        {/* Content Container */}
        <div className="relative z-20 flex flex-col justify-end pb-32 h-full px-6 md:px-16 max-w-[1600px] mx-auto pointer-events-none">
          <div className="pointer-events-auto max-w-4xl">
            
            <AnimatePresence mode="wait">
              <motion.div
                key={currentAnime.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                {/* Featured Label */}
                <div className="mb-6 flex items-center gap-3">
                  <span className="px-4 py-1.5 bg-brand-orange text-black rounded-full text-[10px] font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(244,117,33,0.4)]">
                    New Release
                  </span>
                </div>

                {/* Title */}
                <h1 className="text-5xl md:text-7xl lg:text-9xl font-black text-white mb-6 tracking-tighter leading-[0.85] drop-shadow-2xl mix-blend-lighten">
                  {currentAnime.title}
                </h1>

                {/* Metadata */}
                <div className="flex flex-wrap items-center gap-6 mb-8 text-sm font-medium text-gray-300">
                  <div className="flex items-center gap-1.5 text-brand-orange">
                     <Star size={16} fill="currentColor" />
                     <span className="font-bold text-white text-base">{currentAnime.rating}</span>
                  </div>
                  <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                  <span className="text-gray-200">{currentAnime.year}</span>
                  <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                  <span className="text-gray-200">{currentAnime.episodeCount ? `${currentAnime.episodeCount} Eps` : 'Ongoing'}</span>
                  <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                  <span className="px-2 py-0.5 border border-white/20 rounded text-[10px] font-bold uppercase tracking-wide">{currentAnime.maturityRating}</span>
                  <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                  <div className="flex gap-2">
                    {currentAnime.tags.slice(0, 3).map((tag) => (
                       <span key={tag} className="text-gray-400">{tag}</span>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <p className="text-gray-300 text-lg md:text-xl max-w-2xl leading-relaxed mb-10 line-clamp-3 font-normal tracking-wide drop-shadow-md">
                  {currentAnime.description}
                </p>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <Button 
                    size="lg" 
                    icon={<Play size={20} fill="currentColor" />} 
                    className="w-full sm:w-auto px-10"
                    onClick={() => onWatch(currentAnime)}
                  >
                    Start Watching
                  </Button>
                  <Button variant="glass" size="lg" icon={<Plus size={20} />} className="w-full sm:w-auto px-8">
                    Add to Watchlist
                  </Button>
                   <Button 
                    variant="ghost" 
                    size="lg" 
                    className="w-full sm:w-auto !px-4 !text-gray-400 hover:!text-white hover:bg-white/10"
                    onClick={fetchAnimeInfo}
                   >
                     <span className="sr-only">More Info</span>
                     <Info size={24} />
                  </Button>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
        
        {/* Indicators */}
        <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-3 z-30">
          {items.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === currentIndex ? 'w-8 bg-brand-orange shadow-[0_0_8px_rgba(244,117,33,0.8)]' : 'w-1.5 bg-white/20 hover:bg-white/40'
              }`}
            />
          ))}
        </div>

        {/* Gradient fade at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-brand-black via-brand-black/80 to-transparent z-10 pointer-events-none" />
      </div>

      {/* API Info Modal */}
      <InfoModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        data={aniListData} 
        isLoading={isLoading}
      />
    </>
  );
};
import React, { useState } from 'react';
import { Play, Plus, Star, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from './ui/Button';
import { AnimeDetails, AniListMedia } from '../types';
import { InfoModal } from './InfoModal';

interface HeroProps {
  anime: AnimeDetails;
}

export const Hero: React.FC<HeroProps> = ({ anime }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [aniListData, setAniListData] = useState<AniListMedia | null>(null);

  const fetchAnimeInfo = async () => {
    // 1. Check component state
    if (aniListData) {
      setIsModalOpen(true);
      return;
    }

    // 2. Check localStorage
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
      console.warn("Failed to parse cached data", e);
      localStorage.removeItem(cacheKey);
    }

    // 3. Fetch from API
    setIsLoading(true);
    setIsModalOpen(true);

    try {
      // AniList GraphQL Query
      const query = `
        query ($search: String) {
          Media(search: $search, type: ANIME) {
            title {
              romaji
              english
              native
            }
            description
            coverImage {
              large
              extraLarge
            }
            bannerImage
            averageScore
            episodes
            status
            genres
            startDate {
              year
            }
            studios(isMain: true) {
              nodes {
                name
              }
            }
            staff(perPage: 6, sort: RELEVANCE) {
              nodes {
                name {
                  full
                }
                primaryOccupations
              }
            }
          }
        }
      `;

      const response = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables: {
            search: "Kimetsu no Yaiba", // Specific search to ensure better results for this demo
          },
        }),
      });

      const data = await response.json();
      if (data.data && data.data.Media) {
        setAniListData(data.data.Media);
        // Save to localStorage
        localStorage.setItem(cacheKey, JSON.stringify(data.data.Media));
      }
    } catch (error) {
      console.error("Error fetching AniList data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="relative w-full h-[95vh] min-h-[700px] overflow-hidden">
        {/* Background Image with subtle parallax feel */}
        <motion.div 
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 2, ease: "easeOut" }}
          className="absolute inset-0 z-0"
        >
          <img 
            src={anime.heroImage} 
            alt={anime.title}
            className="w-full h-full object-cover object-center opacity-80" 
          />
          
          {/* Premium Cinematic Gradients - Noise texture overlay could be added here via CSS */}
          <div className="absolute inset-0 bg-gradient-to-r from-brand-black via-brand-black/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-black via-transparent to-black/60" />
          <div className="absolute inset-0 bg-hero-glow mix-blend-overlay opacity-60" />
        </motion.div>

        {/* Content Container */}
        <div className="relative z-20 flex flex-col justify-end pb-32 h-full px-6 md:px-16 max-w-[1600px] mx-auto">
          
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-4xl"
          >
            {/* Featured Label */}
            <div className="mb-6 flex items-center gap-3">
              <motion.span 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="px-4 py-1.5 bg-white/10 backdrop-blur-md border border-white/10 rounded-full text-white text-[10px] font-bold uppercase tracking-widest shadow-lg"
              >
                #1 in Shonen
              </motion.span>
               <motion.span 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
                className="px-4 py-1.5 bg-brand-orange text-black rounded-full text-[10px] font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(244,117,33,0.4)]"
              >
                New Season
              </motion.span>
            </div>

            {/* Title */}
            <motion.h1 
              className="text-5xl md:text-7xl lg:text-9xl font-black text-white mb-6 tracking-tighter leading-[0.85] drop-shadow-2xl mix-blend-lighten"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              {anime.title}
            </motion.h1>

            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-6 mb-8 text-sm font-medium text-gray-300">
              <div className="flex items-center gap-1.5 text-brand-orange">
                 <Star size={16} fill="currentColor" />
                 <span className="font-bold text-white text-base">{anime.rating}</span>
              </div>
              <span className="w-1 h-1 rounded-full bg-gray-600"></span>
              <span className="text-gray-200">{anime.year || 2024}</span>
              <span className="w-1 h-1 rounded-full bg-gray-600"></span>
              <span className="text-gray-200">{anime.episodeCount || '2 Seasons'}</span>
              <span className="w-1 h-1 rounded-full bg-gray-600"></span>
              <span className="px-2 py-0.5 border border-white/20 rounded text-[10px] font-bold uppercase tracking-wide">{anime.maturityRating}</span>
              <span className="w-1 h-1 rounded-full bg-gray-600"></span>
              <div className="flex gap-2">
                {anime.tags.slice(0, 3).map((tag) => (
                   <span key={tag} className="text-gray-400">{tag}</span>
                ))}
              </div>
            </div>

            {/* Description */}
            <p className="text-gray-300 text-lg md:text-xl max-w-2xl leading-relaxed mb-10 line-clamp-3 font-normal tracking-wide drop-shadow-md">
              {anime.description}
            </p>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <Button size="lg" icon={<Play size={20} fill="currentColor" />} className="w-full sm:w-auto px-10">
                Play S1 E1
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
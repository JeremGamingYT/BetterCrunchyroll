import React from 'react';
import { Hero } from './Hero';
import { EpisodeList } from './EpisodeList';
import { AnimeDetails } from '../types';
import { motion } from 'framer-motion';

interface SeriesPageProps {
  anime: AnimeDetails;
}

export const SeriesPage: React.FC<SeriesPageProps> = ({ anime }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen"
    >
      {/* Re-using the single item Hero for the detailed series header */}
      <Hero anime={anime} />
      
      {/* Episode list section */}
      <EpisodeList 
        seasons={anime.seasons || []} 
        studio={anime.studio}
        maturityRating={anime.maturityRating}
      />
    </motion.div>
  );
};
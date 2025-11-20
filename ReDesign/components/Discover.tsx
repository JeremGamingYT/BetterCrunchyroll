import React from 'react';
import { Section } from './Section';
import { AnimeCard } from './AnimeCard';
import { RECOMMENDED_ANIME, RESUME_WATCHING, TRENDING_ANIME } from '../constants';
import { AnimeDetails, Episode } from '../types';

interface DiscoverProps {
  onWatch: (anime: AnimeDetails) => void;
}

export const Discover: React.FC<DiscoverProps> = ({ onWatch }) => {
  // Helper to handle clicks on episodes in resume watching
  const handleResumeClick = (episode: Episode) => {
     // For now, just log or assume it navigates to player. 
     // Since we only have 'onWatch' taking AnimeDetails, we might not fully support direct episode play in this routing demo yet,
     // or we can just pass a dummy anime object if needed, but let's leave it visual for Resume section.
     console.log("Resume", episode.id);
  };

  return (
    <div className="bg-brand-black pb-24 relative z-10 -mt-24">
      
      {/* Resume Section (Landscape Cards) */}
      <Section title="Continue Watching" accent>
        {RESUME_WATCHING.map((episode) => (
          <AnimeCard 
            key={episode.id} 
            data={episode} 
            variant="landscape" 
            onClick={() => handleResumeClick(episode)}
          />
        ))}
      </Section>

      {/* Our Selection (Portrait Cards) */}
      <Section title="Notre sélection pour vous">
        {RECOMMENDED_ANIME.map((anime) => (
          <AnimeCard 
            key={anime.id} 
            data={anime} 
            variant="portrait" 
            onClick={() => onWatch(anime)}
          />
        ))}
        {/* Duplicate for scroll effect demo */}
        {TRENDING_ANIME.map((anime) => (
          <AnimeCard 
            key={`dup-${anime.id}`} 
            data={anime} 
            variant="portrait" 
            onClick={() => onWatch(anime)}
          />
        ))}
      </Section>

      {/* Watchlist */}
      <Section title="Your Watchlist">
         {/* Mixing some data to simulate watchlist */}
         {[...RECOMMENDED_ANIME].reverse().slice(0,4).map((anime) => (
            <AnimeCard 
              key={`wl-${anime.id}`} 
              data={anime} 
              variant="portrait" 
              onClick={() => onWatch(anime)}
            />
         ))}
      </Section>

      {/* Trending */}
      <Section title="Trending in France">
        {TRENDING_ANIME.map((anime) => (
          <AnimeCard 
            key={anime.id} 
            data={anime} 
            variant="portrait" 
            onClick={() => onWatch(anime)}
          />
        ))}
        {RECOMMENDED_ANIME.slice(0,2).map((anime) => (
           <AnimeCard 
             key={`tr-${anime.id}`} 
             data={anime} 
             variant="portrait" 
             onClick={() => onWatch(anime)}
           />
        ))}
      </Section>

    </div>
  );
};
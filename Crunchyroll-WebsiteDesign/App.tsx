import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { SeasonSelector } from './components/SeasonSelector';
import { EpisodeList } from './components/EpisodeList';
import { DEMON_SLAYER_DATA } from './constants';

function App() {
  const [activeSeasonId, setActiveSeasonId] = useState(DEMON_SLAYER_DATA.seasons[0].id);

  const activeSeason = DEMON_SLAYER_DATA.seasons.find(s => s.id === activeSeasonId) || DEMON_SLAYER_DATA.seasons[0];

  return (
    <div className="min-h-screen bg-dark-bg text-white font-sans">
      <Navbar />
      
      <main>
        <Hero 
          anime={DEMON_SLAYER_DATA} 
        />
        
        <div className="relative z-30 -mt-24">
          <SeasonSelector 
            seasons={DEMON_SLAYER_DATA.seasons} 
            activeSeasonId={activeSeasonId} 
            onSelect={setActiveSeasonId}
          />
          
          <EpisodeList 
            episodes={activeSeason.episodes}
            details={DEMON_SLAYER_DATA} 
          />
        </div>
      </main>

      <footer className="bg-black border-t border-white/5 py-24 relative z-40">
        <div className="max-w-[1800px] mx-auto px-10 flex flex-col md:flex-row justify-between items-center gap-12">
            <div className="flex items-center gap-4 opacity-80 hover:opacity-100 transition-opacity duration-500 group cursor-pointer">
                <div className="w-12 h-12 rounded-full bg-crunchy flex items-center justify-center shadow-[0_0_30px_rgba(244,117,33,0.3)] group-hover:shadow-[0_0_50px_rgba(244,117,33,0.6)] transition-all duration-500">
                    <svg viewBox="0 0 24 24" fill="black" className="w-6 h-6 transform group-hover:scale-110 transition-transform">
                        <path d="M12 2L2 7l10 5 10-5-10-5zm0 9l2.5-1.25L12 8.5l-2.5 1.25L12 11zm0 2.5l-5-2.5-5 2.5L12 22l10-8.5-5-2.5-5 2.5z"/>
                    </svg>
                </div>
                <span className="font-bold tracking-tight text-2xl text-white">crunchyroll</span>
            </div>
            
            <div className="flex flex-col items-center md:items-end gap-6">
                <div className="flex gap-8 font-medium text-gray-400 text-sm">
                    <a href="#" className="hover:text-crunchy transition-colors">Terms</a>
                    <a href="#" className="hover:text-crunchy transition-colors">Privacy</a>
                    <a href="#" className="hover:text-crunchy transition-colors">Premium</a>
                    <a href="#" className="hover:text-crunchy transition-colors">Support</a>
                </div>
                <p className="font-light text-gray-600 text-xs">&copy; 2024 Crunchyroll, LLC. All rights reserved.</p>
            </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
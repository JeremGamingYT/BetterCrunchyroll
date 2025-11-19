import React from 'react';
import { AnimeDetails } from '../types';
import { Play, Plus, Star, Share2, Bookmark } from 'lucide-react';

interface HeroProps {
  anime: AnimeDetails;
}

export const Hero: React.FC<HeroProps> = ({ anime }) => {
  return (
    <div className="relative w-full h-[100vh] min-h-[850px] flex items-end pb-24 overflow-hidden">
      
      {/* Background Image with Parallax/Zoom effect */}
      <div className="absolute inset-0 z-0 select-none">
        <img 
          src={anime.backgroundImage} 
          alt={anime.title} 
          className="w-full h-full object-cover object-top animate-subtle-zoom"
        />
        {/* Complex Premium Gradients for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-dark-bg via-dark-bg/40 to-transparent z-10"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-dark-bg via-dark-bg/80 to-transparent z-10 sm:via-dark-bg/40"></div>
        <div className="absolute bottom-0 left-0 right-0 h-[60vh] bg-gradient-to-t from-dark-bg via-dark-bg/90 to-transparent z-10"></div>
      </div>

      {/* Content Container */}
      <div className="relative z-20 max-w-[1800px] w-full mx-auto px-6 md:px-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-end">
        
        {/* Left Column: Main Content */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          
          {/* Trending Tag */}
          <div className="flex items-center gap-4 opacity-0 animate-slide-up [animation-delay:100ms]">
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-crunchy/90 backdrop-blur-md shadow-[0_0_25px_rgba(244,117,33,0.4)] border border-white/10">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                <span className="text-xs font-extrabold uppercase tracking-widest text-black">
                #1 Trending
                </span>
            </div>
            <span className="text-gray-300 font-bold tracking-widest text-xs uppercase pl-4 border-l-2 border-crunchy/50">
              {anime.subtitle}
            </span>
          </div>
          
          {/* Title */}
          <h1 className="text-6xl sm:text-8xl md:text-9xl font-black text-white tracking-tighter leading-[0.85] text-glow opacity-0 animate-slide-up [animation-delay:300ms]">
            {anime.title}
          </h1>

          {/* Metadata Row */}
          <div className="flex flex-wrap items-center gap-6 text-sm font-medium text-gray-300 my-2 opacity-0 animate-slide-up [animation-delay:500ms]">
             <div className="flex items-center gap-2 bg-white/5 backdrop-blur-xl px-4 py-2 rounded-full border border-white/10 hover:bg-white/10 transition-colors cursor-default group">
                <div className="flex text-crunchy filter drop-shadow-[0_0_8px_rgba(244,117,33,0.6)]">
                    {[...Array(5)].map((_, i) => (
                        <Star key={i} size={14} fill={i < Math.floor(anime.rating) ? "currentColor" : "none"} className="mr-0.5"/>
                    ))}
                </div>
                <span className="text-white font-bold ml-2 text-base">{anime.rating}</span>
                <span className="text-gray-500 text-xs ml-1 group-hover:text-gray-300 transition-colors">({anime.votes.toLocaleString()} votes)</span>
             </div>
             
             <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-md border border-white/10 bg-white/5 text-xs font-bold text-gray-400">{anime.contentRating}</span>
                <span className="px-3 py-1 rounded-md border border-white/10 bg-white/5 text-xs font-bold text-gray-400">{anime.year}</span>
                <span className="px-3 py-1 rounded-md bg-gradient-to-r from-crunchy/20 to-transparent border border-crunchy/30 text-crunchy text-xs font-black tracking-wider">HD</span>
             </div>
          </div>

          {/* Description */}
          <p className="text-gray-300 text-lg md:text-xl max-w-2xl leading-relaxed line-clamp-3 md:line-clamp-none font-medium drop-shadow-lg opacity-0 animate-slide-up [animation-delay:700ms]">
            {anime.description}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-4 mt-4 opacity-0 animate-slide-up [animation-delay:900ms]">
            <button className="group relative bg-crunchy text-black font-black px-10 py-4 rounded-full uppercase text-sm tracking-widest flex items-center gap-3 overflow-hidden transition-all hover:scale-105 shadow-[0_0_40px_rgba(244,117,33,0.4)] hover:shadow-[0_0_60px_rgba(244,117,33,0.6)]">
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out rounded-full"></div>
              <Play fill="black" size={20} className="relative z-10" />
              <span className="relative z-10">Start Watching</span>
            </button>
            
            <button className="group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30 text-white font-bold px-6 py-4 rounded-full uppercase text-xs tracking-widest flex items-center gap-3 transition-all backdrop-blur-md hover:scale-105">
              <Bookmark size={18} className="group-hover:text-crunchy transition-colors" />
              <span>Add to List</span>
            </button>

             <button className="group p-4 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30 text-gray-300 hover:text-white transition-all backdrop-blur-md hover:scale-105">
              <Share2 size={20} className="group-hover:text-crunchy transition-colors" />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
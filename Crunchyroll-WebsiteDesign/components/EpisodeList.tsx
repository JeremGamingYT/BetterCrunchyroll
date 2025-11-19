import React, { useRef, useState } from 'react';
import { Episode, AnimeDetails } from '../types';
import { Play, ChevronRight, Clock, MoreVertical } from 'lucide-react';

interface EpisodeListProps {
  episodes: Episode[];
  details: AnimeDetails;
}

export const EpisodeList: React.FC<EpisodeListProps> = ({ episodes, details }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hoveredEp, setHoveredEp] = useState<string | null>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { current } = scrollRef;
      const scrollAmount = 600;
      current.scrollBy({
        left: direction === 'right' ? scrollAmount : -scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="w-full bg-dark-bg pb-40 pt-8 relative z-30">
      {/* Metadata Strip */}
      <div className="max-w-[1800px] mx-auto px-6 md:px-10 py-6 flex flex-wrap items-center justify-between mb-6 border-b border-white/5 pb-8">
         <div className="flex items-center gap-8 text-sm font-semibold text-gray-400">
            <div className="flex items-center gap-3">
               <span className="text-gray-300">{details.year}</span>
               <span className="w-1.5 h-1.5 rounded-full bg-gray-700"></span>
               <span className="text-gray-300">{details.studio}</span>
               <span className="w-1.5 h-1.5 rounded-full bg-gray-700"></span>
               <span className="text-crunchy">{details.totalEpisodes} Episodes</span>
            </div>
         </div>

         <div className="flex gap-2 mt-4 md:mt-0">
            {details.tags.map(tag => (
            <span key={tag} className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all text-xs font-bold tracking-wide text-gray-400 hover:text-white cursor-pointer">
                {tag}
            </span>
            ))}
         </div>
      </div>

      {/* Episode Carousel */}
      <div className="relative w-full group/carousel">
        
        <div className="max-w-[1800px] mx-auto px-6 md:px-10 mb-8 flex justify-between items-end">
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                Episodes
                <span className="text-sm font-normal text-gray-500 ml-2">Season 1</span>
            </h2>
        </div>

        {/* Right Scroll Overlay */}
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-dark-bg to-transparent z-20 pointer-events-none flex items-center justify-end pr-6 opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-500">
            <button 
            onClick={() => scroll('right')}
            className="pointer-events-auto p-3 bg-crunchy hover:bg-crunchy-hover text-black rounded-full shadow-lg transition-all hover:scale-110 active:scale-95"
            >
            <ChevronRight size={24} />
            </button>
        </div>

        <div 
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto no-scrollbar px-6 md:px-10 pb-12 snap-x snap-mandatory"
        >
          {episodes.map((ep) => (
            <div 
              key={ep.id} 
              className="flex-none w-[340px] md:w-[420px] group snap-start cursor-pointer"
              onMouseEnter={() => setHoveredEp(ep.id)}
              onMouseLeave={() => setHoveredEp(null)}
            >
              {/* Thumbnail Container */}
              <div className="relative aspect-video rounded-xl overflow-hidden bg-dark-card mb-4 shadow-xl group-hover:shadow-2xl transition-all duration-500 ring-1 ring-white/5 group-hover:ring-white/20">
                <img 
                  src={ep.thumbnail} 
                  alt={ep.title} 
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 opacity-90 group-hover:opacity-100"
                />
                
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity"></div>

                {/* Play Button Overlay */}
                <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${hoveredEp === ep.id ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
                   <div className="w-14 h-14 rounded-full bg-crunchy/90 backdrop-blur-sm flex items-center justify-center shadow-[0_0_20px_rgba(244,117,33,0.5)]">
                      <Play fill="black" className="ml-1 w-6 h-6 text-black" />
                   </div>
                </div>

                {/* Progress Bar */}
                {ep.progress && (
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-white/10">
                    <div className="h-full bg-crunchy shadow-[0_0_10px_rgba(244,117,33,1)]" style={{ width: `${ep.progress}%` }}></div>
                  </div>
                )}

                {/* Duration Badge */}
                <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 backdrop-blur-md rounded text-[10px] font-bold text-white flex items-center gap-1">
                    {ep.duration}
                </div>
              </div>

              {/* Text Info */}
              <div className="px-1">
                 <div className="flex justify-between items-start gap-2">
                    <h3 className="text-white font-bold text-lg truncate group-hover:text-crunchy transition-colors duration-300">
                        <span className="text-gray-500 mr-2 font-normal text-base">E{ep.number}</span>
                        {ep.title}
                    </h3>
                    <button className="text-gray-600 hover:text-white transition-colors p-1 opacity-0 group-hover:opacity-100">
                        <MoreVertical size={16} />
                    </button>
                 </div>
                 <p className="text-gray-400 text-sm line-clamp-2 mt-2 leading-relaxed font-medium opacity-70 group-hover:opacity-100 transition-opacity">
                   {ep.description}
                 </p>
                 <div className="mt-3 flex items-center gap-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                   <span className="text-crunchy">Subtitled</span>
                   <span className="w-1 h-1 rounded-full bg-gray-700"></span>
                   <span>Released 2019</span>
                 </div>
              </div>

            </div>
          ))}
          
           <div className="flex-none w-24"></div>
        </div>
      </div>
    </div>
  );
};
import React, { useRef } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';

interface SectionProps {
  title: string;
  children: React.ReactNode;
  accent?: boolean;
}

export const Section: React.FC<SectionProps> = ({ title, children, accent = false }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { current } = scrollRef;
      const scrollAmount = direction === 'left' ? -current.offsetWidth / 2 : current.offsetWidth / 2;
      current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="py-8 relative group/section">
      <div className="px-6 md:px-16 max-w-[1600px] mx-auto flex items-center justify-between mb-6">
        <div className="flex flex-col gap-1">
           <h2 className={`text-2xl md:text-3xl font-bold tracking-tight ${accent ? 'text-brand-orange' : 'text-white'}`}>
             {title}
           </h2>
           {accent && <div className="h-1 w-12 bg-brand-orange rounded-full mt-1"></div>}
        </div>
        <button className="text-xs font-semibold text-gray-400 hover:text-white transition-colors uppercase tracking-wider">
          View All
        </button>
      </div>

      <div className="relative">
        {/* Scroll Buttons - Visible on Hover */}
        <button 
          onClick={() => scroll('left')}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-white flex items-center justify-center opacity-0 group-hover/section:opacity-100 transition-all duration-300 hover:bg-brand-orange hover:border-brand-orange hover:text-black disabled:opacity-0"
        >
          <ChevronLeft size={24} />
        </button>
        <button 
          onClick={() => scroll('right')}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-white flex items-center justify-center opacity-0 group-hover/section:opacity-100 transition-all duration-300 hover:bg-brand-orange hover:border-brand-orange hover:text-black"
        >
          <ChevronRight size={24} />
        </button>

        {/* Scroll Container */}
        <div 
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto no-scrollbar px-6 md:px-16 pb-8 snap-x snap-mandatory"
        >
          {children}
        </div>
        
        {/* Fade edges */}
        <div className="absolute top-0 bottom-0 left-0 w-16 bg-gradient-to-r from-brand-black to-transparent pointer-events-none z-10" />
        <div className="absolute top-0 bottom-0 right-0 w-16 bg-gradient-to-l from-brand-black to-transparent pointer-events-none z-10" />
      </div>
    </div>
  );
};
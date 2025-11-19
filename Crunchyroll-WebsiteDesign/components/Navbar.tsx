import React, { useState, useEffect } from 'react';
import { Search, Bell, ChevronDown, Menu, User } from 'lucide-react';

export const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-500 border-b ${
      isScrolled 
        ? 'bg-dark-bg/80 backdrop-blur-2xl border-white/5 py-3' 
        : 'bg-gradient-to-b from-black/90 to-transparent border-transparent py-6'
    }`}>
      <div className="max-w-[1800px] mx-auto px-6 md:px-10 flex items-center justify-between">
        
        {/* Left: Logo & Links */}
        <div className="flex items-center gap-12">
          <div className="flex items-center gap-3 cursor-pointer group">
            <div className="w-9 h-9 rounded-full bg-crunchy flex items-center justify-center shadow-[0_0_25px_rgba(244,117,33,0.3)] group-hover:shadow-[0_0_35px_rgba(244,117,33,0.5)] transition-all duration-500">
              <svg viewBox="0 0 24 24" fill="black" className="w-5 h-5 transform group-hover:scale-110 transition-transform duration-500">
                <path d="M12 2L2 7l10 5 10-5-10-5zm0 9l2.5-1.25L12 8.5l-2.5 1.25L12 11zm0 2.5l-5-2.5-5 2.5L12 22l10-8.5-5-2.5-5 2.5z"/>
              </svg>
            </div>
            <span className="text-white font-bold text-xl tracking-tight hidden lg:block group-hover:text-crunchy transition-colors duration-300">crunchyroll</span>
          </div>

          <div className="hidden xl:flex items-center gap-8 text-sm font-semibold tracking-wide text-gray-400">
            <div className="flex items-center gap-1 cursor-pointer hover:text-white transition-colors duration-300 group">
              Browse <ChevronDown size={14} className="mt-0.5 group-hover:rotate-180 transition-transform duration-300 text-crunchy" />
            </div>
            <div className="cursor-pointer hover:text-white transition-colors duration-300 hover:text-glow-accent">Manga</div>
            <div className="cursor-pointer hover:text-white transition-colors duration-300 hover:text-glow-accent">Games</div>
            <div className="cursor-pointer hover:text-white transition-colors duration-300 hover:text-glow-accent">News</div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-4 text-gray-300">
          <div className="hidden md:flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/10 transition-colors cursor-pointer group">
             <Search className="w-5 h-5 group-hover:text-white transition-colors" />
          </div>
          
          <div className="relative cursor-pointer group w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">
            <Bell className="w-5 h-5 group-hover:text-white transition-colors" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-crunchy rounded-full shadow-[0_0_10px_rgba(244,117,33,1)]"></span>
          </div>
          
          <div className="flex items-center gap-3 pl-4 border-l border-white/10 ml-2">
            <div className="w-9 h-9 rounded-full bg-white/10 p-[1px] cursor-pointer hover:bg-crunchy transition-colors duration-300 group">
               <div className="w-full h-full rounded-full bg-dark-bg flex items-center justify-center overflow-hidden">
                  <User size={18} className="text-gray-400 group-hover:text-white transition-colors" />
               </div>
            </div>
            <ChevronDown size={14} className="hidden sm:block text-gray-500 cursor-pointer hover:text-white transition-colors" />
          </div>
          
          <Menu className="w-6 h-6 lg:hidden hover:text-white cursor-pointer ml-2" />
        </div>

      </div>
    </nav>
  );
};
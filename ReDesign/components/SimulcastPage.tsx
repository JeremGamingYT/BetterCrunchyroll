import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimeCard } from './AnimeCard';
import { AnimeDetails } from '../types';
import { SIMULCAST_SCHEDULE, SimulcastItem } from '../constants';
import { Calendar, Clock } from 'lucide-react';

interface SimulcastPageProps {
  onWatch: (anime: AnimeDetails) => void;
}

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

export const SimulcastPage: React.FC<SimulcastPageProps> = ({ onWatch }) => {
  // Get current day name
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
  // Default to today if in list, otherwise Monday
  const [selectedDay, setSelectedDay] = useState(DAYS.includes(today) ? today : 'MONDAY');

  return (
    <div className="min-h-screen bg-brand-black pt-24 pb-12 px-6 md:px-16 max-w-[1600px] mx-auto">
      
      {/* Header */}
      <div className="mb-10 relative z-10">
         <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
         >
            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter mb-3 flex items-center gap-3">
               <Calendar className="w-8 h-8 md:w-12 md:h-12 text-brand-orange" />
               Simulcast Calendar
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl">
              New episodes simulcast straight from Japan. Select a day to see the release schedule.
            </p>
         </motion.div>
      </div>

      {/* Day Selector */}
      <div className="sticky top-[72px] z-40 bg-brand-black/95 backdrop-blur-xl -mx-6 md:-mx-16 px-6 md:px-16 py-4 mb-8 border-b border-white/5 overflow-x-auto no-scrollbar">
        <div className="flex min-w-max gap-2 md:gap-4">
          {DAYS.map((day) => {
            const isSelected = selectedDay === day;
            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`relative px-4 py-2 md:px-8 md:py-3 rounded-full text-sm md:text-base font-bold tracking-wide transition-all duration-300 outline-none ${
                  isSelected 
                    ? 'text-black' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {isSelected && (
                  <motion.div
                    layoutId="activeDay"
                    className="absolute inset-0 bg-brand-orange rounded-full shadow-[0_0_15px_rgba(244,117,33,0.5)]"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{day.slice(0, 3)} <span className="hidden md:inline">{day.slice(3)}</span></span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedDay}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="min-h-[400px]"
        >
          {SIMULCAST_SCHEDULE[selectedDay] && SIMULCAST_SCHEDULE[selectedDay].length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {SIMULCAST_SCHEDULE[selectedDay].map((item: SimulcastItem, index) => (
                <div key={`${item.anime.id}-${index}`} className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-brand-orange font-bold text-sm tracking-widest uppercase">
                    <Clock size={14} strokeWidth={3} />
                    {item.time}
                  </div>
                  <div className="relative group">
                     {/* Decoration line connecting time to card */}
                     <div className="absolute -left-4 top-2 bottom-0 w-[2px] bg-gradient-to-b from-brand-orange to-transparent opacity-30 hidden md:block" />
                     
                     <AnimeCard 
                       data={item.anime} 
                       variant="landscape" 
                       onClick={() => onWatch(item.anime)}
                     />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
               <p className="text-lg font-medium">No simulcasts scheduled for this day.</p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

    </div>
  );
};
import React from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, Calendar, Building2, Users } from 'lucide-react';
import { AniListMedia } from '../types';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: AniListMedia | null;
  isLoading: boolean;
}

export const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose, data, isLoading }) => {
  if (typeof document === 'undefined') return null;

  const content = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-[101] flex items-center justify-center p-4 sm:p-6 pointer-events-none"
          >
            <div className="bg-[#1C1C1E] w-full max-w-4xl max-h-[85vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto border border-white/10 relative">
              
              {/* Close Button */}
              <button 
                onClick={onClose}
                className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-brand-orange transition-all duration-300"
              >
                <X size={20} />
              </button>

              {isLoading ? (
                <div className="flex-1 flex items-center justify-center min-h-[400px]">
                  <div className="w-12 h-12 border-4 border-brand-orange/30 border-t-brand-orange rounded-full animate-spin" />
                </div>
              ) : data ? (
                <div className="flex flex-col md:flex-row h-full overflow-hidden">
                  
                  {/* Left Side - Poster & Key Stats (Mobile: Top) */}
                  <div className="w-full md:w-[350px] bg-[#151517] shrink-0 relative">
                    <div className="h-[250px] md:h-full relative">
                      <img 
                        src={data.coverImage.extraLarge} 
                        alt={data.title.english} 
                        className="w-full h-full object-cover opacity-80"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#1C1C1E] via-transparent to-transparent md:bg-gradient-to-r" />
                    </div>
                  </div>

                  {/* Right Side - Content */}
                  <div className="flex-1 overflow-y-auto no-scrollbar p-6 md:p-10 relative">
                    
                    {/* Header */}
                    <div className="mb-6">
                      <h2 className="text-3xl md:text-4xl font-black text-white mb-2 tracking-tight leading-none">
                        {data.title.english || data.title.romaji}
                      </h2>
                      <h3 className="text-lg text-gray-400 font-medium mb-4 italic">
                        {data.title.native}
                      </h3>
                      
                      <div className="flex flex-wrap gap-2 mb-6">
                        {data.genres.map(genre => (
                          <span key={genre} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-bold text-gray-300 uppercase tracking-wider">
                            {genre}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center gap-6 text-sm font-medium text-gray-300 border-b border-white/5 pb-6">
                        <div className="flex items-center gap-2 text-brand-orange">
                          <Star size={18} fill="currentColor" />
                          <span className="text-white text-lg">{data.averageScore}%</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar size={16} />
                          <span>{data.startDate.year}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Building2 size={16} />
                          <span>{data.studios.nodes[0]?.name || 'Unknown Studio'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">Synopsis</h4>
                        <div 
                          className="text-gray-300 leading-relaxed text-sm md:text-base opacity-90 prose prose-invert max-w-none"
                          dangerouslySetInnerHTML={{ __html: data.description }} 
                        />
                      </div>

                      {/* Staff Grid */}
                      <div>
                         <h4 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                           <Users size={14} />
                           Principal Cast & Staff
                         </h4>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                           {data.staff.nodes.slice(0, 6).map((person, idx) => (
                             <div key={idx} className="flex items-center gap-3 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                               <div className="w-8 h-8 rounded-full bg-brand-orange/20 flex items-center justify-center text-brand-orange font-bold text-xs">
                                 {person.name.full.charAt(0)}
                               </div>
                               <div className="flex flex-col overflow-hidden">
                                 <span className="text-sm font-medium text-white truncate">{person.name.full}</span>
                                 <span className="text-[10px] text-gray-400 truncate">{person.primaryOccupations[0]}</span>
                               </div>
                             </div>
                           ))}
                         </div>
                      </div>
                    </div>

                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-400">
                  Failed to load data.
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return ReactDOM.createPortal(content, document.body);
};
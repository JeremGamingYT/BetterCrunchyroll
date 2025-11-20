import React from 'react';
import { motion } from 'framer-motion';
import { NEWS_ITEMS } from '../constants';
import { Calendar, User, ArrowRight } from 'lucide-react';

export const NewsPage: React.FC = () => {
  const featured = NEWS_ITEMS[0];
  const others = NEWS_ITEMS.slice(1);

  return (
    <div className="min-h-screen bg-brand-black pt-28 pb-16 px-6 md:px-16 max-w-[1600px] mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-4xl md:text-6xl font-black text-white mb-12 tracking-tighter">Anime News</h1>
        
        {/* Featured Article */}
        <div className="group relative w-full aspect-[21/9] md:aspect-[21/9] rounded-2xl overflow-hidden mb-16 cursor-pointer shadow-2xl border border-white/5">
           <img src={featured.imageUrl} alt={featured.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-80" />
           <div className="absolute inset-0 bg-gradient-to-t from-brand-black via-brand-black/60 to-transparent" />
           <div className="absolute bottom-0 left-0 p-8 md:p-12 max-w-4xl">
              <span className="px-3 py-1 bg-brand-orange text-black text-xs font-bold uppercase tracking-wider rounded-full mb-4 inline-block shadow-lg shadow-brand-orange/20">
                {featured.category}
              </span>
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight group-hover:text-brand-orange transition-colors drop-shadow-lg">
                {featured.title}
              </h2>
              <p className="text-gray-300 text-lg mb-6 line-clamp-2 drop-shadow-md">{featured.excerpt}</p>
              <div className="flex items-center gap-6 text-sm text-gray-400 font-medium">
                 <span className="flex items-center gap-2"><Calendar size={16} /> {featured.date}</span>
                 {featured.author && <span className="flex items-center gap-2"><User size={16} /> {featured.author}</span>}
              </div>
           </div>
        </div>

        {/* News Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
           {others.map((news, idx) => (
             <motion.div 
               key={news.id}
               initial={{ opacity: 0, y: 20 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true }}
               transition={{ delay: idx * 0.1 }}
               className="group cursor-pointer flex flex-col gap-4"
             >
               <div className="relative aspect-video rounded-xl overflow-hidden border border-white/5 shadow-lg">
                 <img src={news.imageUrl} alt={news.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-90 group-hover:opacity-100" />
                 <div className="absolute top-3 left-3">
                    <span className="px-2 py-1 bg-black/60 backdrop-blur-md border border-white/10 text-white text-[10px] font-bold uppercase tracking-wide rounded">
                      {news.category}
                    </span>
                 </div>
               </div>
               <div className="px-1">
                  <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                     <span>{news.date}</span>
                     {news.author && (
                       <>
                         <span className="w-1 h-1 rounded-full bg-gray-700" />
                         <span>{news.author}</span>
                       </>
                     )}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3 line-clamp-2 group-hover:text-brand-orange transition-colors leading-tight">
                    {news.title}
                  </h3>
                  <p className="text-gray-400 text-sm line-clamp-3 leading-relaxed">
                    {news.excerpt}
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-brand-orange text-sm font-bold uppercase tracking-wide opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0 duration-300">
                    Read Article <ArrowRight size={16} />
                  </div>
               </div>
             </motion.div>
           ))}
        </div>
      </motion.div>
    </div>
  );
};

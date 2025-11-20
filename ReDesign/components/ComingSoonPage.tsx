import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface ComingSoonPageProps {
  title: string;
  icon: LucideIcon;
}

export const ComingSoonPage: React.FC<ComingSoonPageProps> = ({ title, icon: Icon }) => {
  return (
    <div className="min-h-screen bg-brand-black flex items-center justify-center relative overflow-hidden pt-24">
       {/* Background Glow */}
       <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand-orange/10 rounded-full blur-[100px] pointer-events-none" />

       <motion.div 
         initial={{ opacity: 0, y: 20 }}
         animate={{ opacity: 1, y: 0 }}
         className="relative z-10 text-center px-6"
       >
          <div className="inline-flex items-center justify-center p-6 rounded-full bg-white/5 border border-white/10 mb-8 text-brand-orange shadow-[0_0_30px_rgba(244,117,33,0.2)]">
            <Icon size={48} strokeWidth={1.5} />
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-white mb-4 tracking-tight">{title}</h1>
          <p className="text-xl md:text-2xl text-gray-400 font-light mb-8 max-w-2xl mx-auto">
            We are working hard to bring you the best experience. Stay tuned for updates!
          </p>
          <div className="inline-block px-6 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white font-bold tracking-widest uppercase text-sm">
            Coming Soon
          </div>
       </motion.div>
    </div>
  );
};

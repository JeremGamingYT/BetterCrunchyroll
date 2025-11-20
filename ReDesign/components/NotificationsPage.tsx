import React from 'react';
import { motion } from 'framer-motion';
import { Bell, Check, Clock } from 'lucide-react';
import { NOTIFICATIONS } from '../constants';

export const NotificationsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-brand-black pt-24 pb-12 px-6 md:px-16 max-w-[1600px] mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        <div className="flex items-center justify-between mb-10">
           <h1 className="text-4xl font-black text-white tracking-tighter flex items-center gap-3">
             <Bell className="w-8 h-8 text-brand-orange" />
             Notifications
           </h1>
           <button className="text-sm font-semibold text-brand-orange hover:text-white transition-colors">
             Mark all as read
           </button>
        </div>

        <div className="space-y-4">
          {NOTIFICATIONS.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`relative p-5 rounded-xl border transition-all duration-300 flex gap-5 items-start group cursor-pointer ${
                 item.isRead 
                   ? 'bg-white/5 border-white/5 hover:bg-white/10' 
                   : 'bg-[#1C1C1E] border-l-4 border-l-brand-orange border-y-white/5 border-r-white/5 hover:bg-white/5'
              }`}
            >
               {/* Icon/Image */}
               <div className="shrink-0">
                 {item.imageUrl ? (
                   <div className="w-14 h-14 rounded-lg overflow-hidden shadow-md">
                     <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                   </div>
                 ) : (
                   <div className={`w-14 h-14 rounded-lg flex items-center justify-center ${item.type === 'system' ? 'bg-gray-800 text-gray-400' : 'bg-brand-orange/20 text-brand-orange'}`}>
                      <Bell size={24} />
                   </div>
                 )}
               </div>

               {/* Content */}
               <div className="flex-1 min-w-0">
                 <div className="flex justify-between items-start mb-1">
                    <h3 className={`text-lg font-semibold ${item.isRead ? 'text-gray-300' : 'text-white'}`}>
                      {item.title}
                    </h3>
                    {!item.isRead && <div className="w-2 h-2 rounded-full bg-brand-orange shadow-[0_0_8px_rgba(244,117,33,0.8)]" />}
                 </div>
                 <p className="text-gray-400 text-sm leading-relaxed mb-2">
                   {item.message}
                 </p>
                 <div className="flex items-center gap-2 text-xs text-gray-500">
                   <Clock size={12} />
                   <span>{item.time}</span>
                 </div>
               </div>
            </motion.div>
          ))}
        </div>

        {NOTIFICATIONS.length === 0 && (
           <div className="text-center py-20 text-gray-500">
             <Bell size={48} className="mx-auto mb-4 opacity-20" />
             <p>No notifications yet.</p>
           </div>
        )}
      </motion.div>
    </div>
  );
};
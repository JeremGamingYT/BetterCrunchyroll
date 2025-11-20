import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'premium' | 'outline';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', className = '' }) => {
  const variants = {
    default: "bg-gray-800 text-gray-200",
    premium: "bg-brand-orange text-black font-bold shadow-[0_0_10px_rgba(244,117,33,0.4)]",
    outline: "border border-white/20 text-gray-300 bg-black/40 backdrop-blur-sm"
  };

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] uppercase tracking-wider font-semibold ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};
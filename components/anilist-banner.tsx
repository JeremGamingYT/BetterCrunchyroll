"use client"

import { ExternalLink, Star, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

interface AniListBannerProps {
  className?: string
  onConnect?: () => void
}

export function AniListBanner({ className, onConnect }: AniListBannerProps) {
  const handleConnect = () => {
    if (onConnect) {
      onConnect()
    } else {
      // Open AniList OAuth link
      window.open("https://anilist.co/api/v2/oauth/authorize?client_id=YOUR_CLIENT_ID&response_type=code", "_blank")
    }
  }

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl",
        "h-72 md:h-80 lg:h-96 cursor-pointer",
        "border border-primary/30 shadow-xl hover:shadow-2xl",
        "transition-all duration-500",
        className,
      )}
    >
      {/* Premium Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-blue-600 to-purple-700 opacity-90 group-hover:opacity-100 transition-opacity duration-500" />

      {/* Animated Background Blobs - Premium Effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-cyan-400 rounded-full mix-blend-soft-light filter blur-3xl opacity-20 group-hover:opacity-30 transition-opacity duration-500 animate-blob" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-purple-400 rounded-full mix-blend-soft-light filter blur-3xl opacity-20 group-hover:opacity-30 transition-opacity duration-500 animate-blob animation-delay-2000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-400 rounded-full mix-blend-overlay filter blur-3xl opacity-10 group-hover:opacity-20 transition-opacity duration-500 animate-blob animation-delay-4000" />
      </div>

      {/* Shine Effect on Hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 transform -skew-x-12 translate-x-full group-hover:translate-x-0" />

      {/* Content */}
      <div className="relative z-20 h-full flex flex-col justify-between p-8 md:p-10">
        {/* Top Section - Badge & Icon */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            {/* Icon Container */}
            <div className="p-4 bg-white/15 backdrop-blur-xl rounded-2xl border border-white/30 group-hover:bg-white/25 group-hover:border-white/50 transition-all duration-300 shadow-xl">
              <Star className="w-8 h-8 text-white fill-white drop-shadow-lg" />
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                <span className="text-xs md:text-sm font-bold text-white/90 uppercase tracking-widest">
                  Premium Feature
                </span>
              </div>
              <div className="text-2xl md:text-3xl font-black text-white font-bangers tracking-wide drop-shadow-lg">
                Connectez AniList
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section - Main Content */}
        <div className="space-y-6 transform group-hover:-translate-y-2 transition-transform duration-300">
          <div className="space-y-3">
            <h3 className="text-3xl md:text-4xl font-black text-white font-bangers tracking-wider leading-tight drop-shadow-lg">
              Synchronisez votre profil
            </h3>
            <p className="text-white/95 text-sm md:text-base leading-relaxed max-w-xl font-medium">
              Retrouvez vos listes, scores et recommandations personnalisées basées sur votre historique d'anime.
            </p>
          </div>

          {/* CTA Button - Premium Style */}
          <button
            onClick={handleConnect}
            className={cn(
              "group/btn flex items-center gap-3 px-8 md:px-10 py-4 md:py-5",
              "bg-gradient-to-r from-white via-blue-50 to-white text-indigo-700 font-black text-sm md:text-base rounded-xl",
              "hover:from-white hover:to-blue-100 hover:shadow-2xl hover:scale-110",
              "transition-all duration-300 active:scale-95",
              "whitespace-nowrap inline-flex backdrop-blur-sm",
              "border border-white/60 shadow-xl",
              "uppercase tracking-wider"
            )}
          >
            <span>Se Connecter</span>
            <ExternalLink className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform duration-300" />
          </button>
        </div>
      </div>

      {/* Bottom Gradient Overlay for Better Text Contrast */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
    </div>
  )
}

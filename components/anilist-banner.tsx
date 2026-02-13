"use client"

import { ExternalLink } from "lucide-react"
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
      // Open AniList OAuth link (would be set up with environment variables in production)
      window.open("https://anilist.co/api/v2/oauth/authorize?client_id=YOUR_CLIENT_ID&response_type=code", "_blank")
    }
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#005FCC] via-[#0066FF] to-[#005FCC]",
        "p-6 md:p-8 mb-8",
        "border border-blue-400/30",
        "shadow-lg hover:shadow-xl transition-shadow duration-300",
        "group",
        className,
      )}
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 group-hover:opacity-20 transition-opacity duration-300 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 group-hover:opacity-20 transition-opacity duration-300 animate-pulse delay-700" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Left side - Text */}
        <div className="flex-1">
          <h3 className="text-2xl md:text-3xl font-black text-white mb-2 font-bangers tracking-wide">
            Connectez AniList
          </h3>
          <p className="text-blue-100 text-sm md:text-base leading-relaxed max-w-md">
            Synchronisez votre compte AniList pour une meilleure expérience. Retrouvez vos listes, vos scores et obtenez des recommandations personnalisées basées sur votre historique.
          </p>
        </div>

        {/* Right side - Button */}
        <button
          onClick={handleConnect}
          className={cn(
            "flex items-center gap-2 px-6 py-3 md:px-8 md:py-4",
            "bg-white text-[#005FCC] font-bold rounded-xl",
            "hover:bg-blue-50 hover:scale-105 hover:shadow-lg",
            "transition-all duration-300 active:scale-95",
            "whitespace-nowrap flex-shrink-0",
          )}
        >
          <span>Se connecter</span>
          <ExternalLink className="w-4 h-4 md:w-5 md:h-5" />
        </button>
      </div>
    </div>
  )
}

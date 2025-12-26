"use client"

import { useState } from "react"
import { Play, Clock, Crown } from "lucide-react"
import { cn } from "@/lib/utils"

interface EpisodeCardProps {
  episodeNumber: number | null
  title?: string
  duration: number
  thumbnail?: string | null
  accentColor?: string
  episodeId?: string
  isPremium?: boolean
  isWatched?: boolean
}

export function EpisodeCard({ episodeNumber, title, duration, thumbnail, accentColor, episodeId, isPremium, isWatched }: EpisodeCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  const episodeTitle = title || `Épisode ${episodeNumber || '?'}`
  const thumbnailUrl = thumbnail || `/placeholder.svg?height=180&width=320&query=anime episode ${episodeNumber} scene`

  return (
    <div
      className={cn(
        "group relative flex-shrink-0 w-[280px] md:w-[320px] transition-all duration-300",
        isHovered ? "z-50" : "z-10",
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={cn(
          "relative aspect-video rounded-xl overflow-hidden",
          "transition-all duration-500 ease-out",
          "shadow-lg shadow-black/20",
          isHovered && "scale-105 shadow-2xl",
        )}
        style={{
          boxShadow: isHovered && accentColor ? `0 25px 50px -12px ${accentColor}40` : undefined,
        }}
      >
        {/* Thumbnail */}
        <img
          src={thumbnailUrl || "/placeholder.svg"}
          alt={episodeTitle}
          className={cn(
            "w-full h-full object-cover",
            "transition-transform duration-700 ease-out",
            isHovered && "scale-110",
          )}
        />

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />

        {/* Episode Number Badge */}
        <div
          className="absolute top-3 left-3 px-2.5 py-1 rounded-lg text-sm font-bold text-white"
          style={{ backgroundColor: accentColor || "hsl(var(--primary))" }}
        >
          E{episodeNumber}
        </div>

        {/* Duration Badge & Watched Label */}
        <div className="absolute top-3 right-3 flex items-center gap-1">
          {isWatched && (
            <span className="bg-black/70 backdrop-blur-sm text-white px-1.5 py-1 rounded text-xs font-medium">
              Regardé
            </span>
          )}
          <div className="px-2 py-1 rounded bg-background/80 backdrop-blur-sm flex items-center gap-1">
            <Clock className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">{duration} min</span>
          </div>
        </div>

        {/* Premium Badge */}
        {isPremium && (
          <div className="absolute top-12 right-3 px-2 py-1 rounded bg-amber-500/90 backdrop-blur-sm flex items-center gap-1">
            <Crown className="w-3 h-3 text-white" />
            <span className="text-xs font-bold text-white">Premium</span>
          </div>
        )}

        {/* Play Button */}
        <div className={cn("absolute inset-0 flex items-center justify-center", "transition-all duration-300")}>
          <button
            className={cn(
              "p-4 rounded-full text-white",
              "transition-all duration-500",
              "hover:scale-110",
              "shadow-lg",
              isHovered ? "scale-100 opacity-100" : "scale-90 opacity-70",
            )}
            style={{
              backgroundColor: accentColor ? `${accentColor}e6` : "hsl(var(--primary) / 0.9)",
              boxShadow: accentColor ? `0 10px 25px ${accentColor}50` : undefined,
            }}
          >
            <Play className="w-6 h-6" fill="currentColor" />
          </button>
        </div>

        {/* Border Glow */}
        <div
          className={cn(
            "absolute inset-0 rounded-xl border-2 transition-all duration-500 pointer-events-none",
            isHovered ? "border-opacity-50" : "border-transparent",
          )}
          style={{
            borderColor: isHovered ? accentColor || "hsl(var(--primary))" : "transparent",
          }}
        />
      </div>

      {/* Info */}
      <div className="mt-3 px-1">
        <h3
          className={cn("font-semibold text-sm text-foreground line-clamp-1", "transition-colors duration-300")}
          style={{
            color: isHovered && accentColor ? accentColor : undefined,
          }}
        >
          {episodeTitle}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">{duration} min</p>
      </div>
    </div>
  )
}

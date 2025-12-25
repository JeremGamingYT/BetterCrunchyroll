"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Play, Bookmark, Star, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import type { CombinedAnime } from "@/hooks/use-combined-anime"
import { useWatchlistOptional } from "@/hooks/use-watchlist"

interface AnimeCardProps {
  anime:
  | CombinedAnime
  | {
    id: number | string
    title: string
    image: string
    rating?: string
    genres?: string[]
    score?: number | null
    color?: string | null
    nextEpisode?: {
      episode: number
      airingAt: number
      timeUntilAiring: number
    } | null
    type?: string
    popularity?: number
    episodes?: number | null
    crunchyrollId?: string | null
    crunchyrollSlug?: string | null
    isOnCrunchyroll?: boolean
    // For watchlist items
    seriesId?: string
    seriesTitle?: string
  }
  index?: number
  showAiring?: boolean
  compact?: boolean
}

export function AnimeCard({ anime, index = 0, showAiring = false, compact = false }: AnimeCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [imageError, setImageError] = useState(false)

  // Use watchlist context to check if anime is bookmarked
  const watchlistContext = useWatchlistOptional()

  // Determine if this anime is in the watchlist
  const crunchyrollId = "crunchyrollId" in anime ? anime.crunchyrollId : null
  const seriesId = "seriesId" in anime ? anime.seriesId : null

  const isInWatchlist = watchlistContext
    ? (crunchyrollId && watchlistContext.isInWatchlist(crunchyrollId)) ||
    (seriesId && watchlistContext.isInWatchlistBySeriesId(seriesId)) ||
    watchlistContext.isInWatchlistByTitle(anime.title)
    : false

  const [isBookmarked, setIsBookmarked] = useState(isInWatchlist)

  // Sync with watchlist context
  useEffect(() => {
    setIsBookmarked(isInWatchlist)
  }, [isInWatchlist])

  const score = "score" in anime ? anime.score : null
  const nextEpisode = "nextEpisode" in anime ? anime.nextEpisode : null
  const animeColor = "color" in anime ? anime.color : null
  const genres = "genres" in anime && anime.genres ? anime.genres : []
  const rating = "rating" in anime && anime.rating ? anime.rating : null
  const relationType = "type" in anime ? anime.type : null
  const popularity = "popularity" in anime ? anime.popularity : 0
  const totalEpisodes = "episodes" in anime ? anime.episodes : null
  const crunchyrollSlug = "crunchyrollSlug" in anime ? anime.crunchyrollSlug : null
  const isOnCrunchyroll = "isOnCrunchyroll" in anime ? anime.isOnCrunchyroll : false

  // Use Crunchyroll info for sub/dub when available
  const crunchyrollInfo = "crunchyrollInfo" in anime ? anime.crunchyrollInfo : null
  const hasSubDub = crunchyrollInfo
    ? (crunchyrollInfo.isDubbed && crunchyrollInfo.isSubbed)
    : ((popularity || 0) > 50000 || (score && score > 7.5))
  const audioLabel = hasSubDub ? "Sub | Dub" : "Sub"

  // Format time until airing
  const formatTimeUntil = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)

    if (days > 0) return `${days}j ${hours}h`
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
  }

  const getEpisodeText = () => {
    if (nextEpisode) return `Ep ${nextEpisode.episode}`
    if (totalEpisodes) return `${totalEpisodes} eps`
    return null
  }

  const episodeText = getEpisodeText()

  // Build the link URL - use Crunchyroll ID when available for better compatibility
  const animeUrl = crunchyrollId
    ? `/anime/${anime.id}?cr=${crunchyrollId}`
    : `/anime/${anime.id}`

  return (
    <Link
      href={animeUrl}
      scroll={false}
      onClick={() => {
        window.scrollTo({ top: 0, behavior: "instant" })
      }}
      className={cn(
        "group/card relative flex-shrink-0 transition-all duration-300 block",
        compact ? "w-[160px] md:w-[180px]" : "w-[180px] md:w-[200px] lg:w-[220px]",
        isHovered ? "z-50 transform-gpu" : "z-10",
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        animationDelay: `${index * 50}ms`,
      }}
    >
      {/* Card Container */}
      <div
        className={cn(
          "relative aspect-[2/3] rounded-xl overflow-hidden",
          "transition-all duration-500 ease-out",
          "shadow-lg shadow-black/20",
          isHovered && "scale-105 shadow-2xl",
        )}
        style={{
          boxShadow: isHovered && animeColor ? `0 25px 50px -12px ${animeColor}40` : undefined,
        }}
      >
        {/* Image */}
        <img
          src={imageError ? "/placeholder.svg?height=400&width=280&query=anime" : anime.image}
          alt={anime.title}
          className={cn(
            "w-full h-full object-cover",
            "transition-transform duration-700 ease-out",
            isHovered && "scale-110",
          )}
          onError={() => setImageError(true)}
        />

        {(rating || !relationType) && (
          <div className="absolute top-3 left-3 flex flex-col items-start gap-1">
            {rating && (
              <div
                className={cn(
                  "px-2 py-0.5 rounded text-xs font-bold",
                  "bg-background/80 backdrop-blur-sm border border-primary/30",
                  "transition-all duration-300",
                )}
                style={{
                  backgroundColor: isHovered && animeColor ? animeColor : undefined,
                  color: isHovered && animeColor ? "#fff" : undefined,
                  borderColor: isHovered && animeColor ? animeColor : undefined,
                }}
              >
                {rating}
              </div>
            )}
            {/* Sub/Dub badge */}
            <div
              className={cn(
                "px-2 py-0.5 rounded text-xs font-medium",
                "bg-background/80 backdrop-blur-sm border border-muted-foreground/30",
                "transition-all duration-300",
              )}
            >
              {audioLabel}
            </div>
          </div>
        )}

        {relationType && (
          <div
            className="absolute top-3 left-3 px-2 py-0.5 rounded text-xs font-bold text-white"
            style={{ backgroundColor: animeColor || "hsl(var(--primary))" }}
          >
            {relationType.replace(/_/g, " ")}
          </div>
        )}

        {/* Airing Badge */}
        {showAiring && nextEpisode && (
          <div className="absolute top-3 left-20 px-2 py-0.5 rounded text-xs font-bold bg-green-500/90 text-white flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatTimeUntil(nextEpisode.timeUntilAiring)}
          </div>
        )}

        {/* Bookmark Button */}
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setIsBookmarked(!isBookmarked)
          }}
          className={cn(
            "absolute top-3 right-3 p-1.5 rounded-full",
            "transition-all duration-300",
            isBookmarked
              ? "bg-primary text-primary-foreground"
              : "bg-background/80 backdrop-blur-sm text-foreground hover:bg-primary hover:text-primary-foreground",
            !isHovered && !isBookmarked && "opacity-0",
            isHovered && "opacity-100",
          )}
          style={{
            backgroundColor: isBookmarked && animeColor ? animeColor : undefined,
          }}
        >
          <Bookmark className="w-4 h-4" fill={isBookmarked ? "currentColor" : "none"} />
        </button>

        {/* Hover Overlay */}
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent",
            "transition-opacity duration-500",
            isHovered ? "opacity-100" : "opacity-0",
          )}
        >
          {/* Play Button */}
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              className={cn(
                "rounded-full text-white",
                "transition-all duration-500",
                "hover:scale-110",
                "shadow-lg",
                compact ? "p-3" : "p-4",
                isHovered ? "scale-100 opacity-100" : "scale-75 opacity-0",
              )}
              style={{
                backgroundColor: animeColor ? `${animeColor}e6` : "hsl(var(--primary) / 0.9)",
                boxShadow: animeColor ? `0 10px 25px ${animeColor}50` : undefined,
              }}
            >
              <Play className={cn(compact ? "w-4 h-4" : "w-6 h-6")} fill="currentColor" />
            </button>
          </div>

          {/* Bottom Info - Always show score/episode when available */}
          <div
            className={cn(
              "absolute bottom-0 left-0 right-0 p-4",
              "transition-all duration-500",
              isHovered ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              {score && (
                <>
                  <Star
                    className="w-4 h-4"
                    fill="currentColor"
                    style={{ color: animeColor || "hsl(var(--primary))" }}
                  />
                  <span className="text-sm font-medium text-foreground">{score.toFixed(1)}</span>
                </>
              )}
              {!score && (
                <>
                  <Star className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">N/A</span>
                </>
              )}
              {episodeText && <span className="text-xs text-muted-foreground ml-auto">{episodeText}</span>}
            </div>
            {genres.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {genres.slice(0, 2).map((genre) => (
                  <span key={genre} className="text-xs px-2 py-0.5 rounded-full bg-secondary/80 text-muted-foreground">
                    {genre}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Border Glow - Dynamic color */}
        <div
          className={cn(
            "absolute inset-0 rounded-xl border-2 transition-all duration-500 pointer-events-none",
            isHovered ? "border-opacity-50" : "border-transparent",
          )}
          style={{
            borderColor: isHovered ? animeColor || "hsl(var(--primary))" : "transparent",
            boxShadow: isHovered && animeColor ? `inset 0 0 20px ${animeColor}20` : undefined,
          }}
        />
      </div>

      <div className={cn("mt-3 px-1", compact && "mt-2")}>
        <h3
          className={cn("font-semibold line-clamp-2 transition-colors duration-300", compact ? "text-xs" : "text-sm")}
          style={{
            color: animeColor || undefined,
          }}
        >
          {anime.title}
        </h3>
        {!compact && (
          <p className="text-xs text-muted-foreground mt-1">
            {"studio" in anime && anime.studio ? anime.studio : "Sous-titrage | Doublage"}
          </p>
        )}
      </div>
    </Link>
  )
}

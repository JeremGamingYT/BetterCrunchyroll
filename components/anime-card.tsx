"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Play, Bookmark, Star, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import type { CombinedAnime } from "@/hooks/use-combined-anime"
import { useWatchlistOptional } from "@/hooks/use-watchlist"
import { AnimePreviewDialog } from "@/components/anime-preview-dialog"

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
    currentEpisode?: number | null
    currentEpisodeId?: string | null
    isDubbed?: boolean
    isSubbed?: boolean
  }
  index?: number
  showAiring?: boolean
  compact?: boolean
  layout?: "poster" | "landscape"
  /** If true, this is a relation/recommendation card - links to AniList if no Crunchyroll */
  isRelation?: boolean
}

// Relation types that indicate this is a related work
const RELATION_TYPES = ['PREQUEL', 'SEQUEL', 'PARENT', 'SIDE_STORY', 'SPIN_OFF', 'ADAPTATION', 'ALTERNATIVE', 'SOURCE', 'CHARACTER', 'OTHER']

export function AnimeCard({ anime, index = 0, showAiring = false, compact = false, layout = "poster", isRelation = false }: AnimeCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const isLandscape = layout === "landscape"

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
  const isPopularityScore = "combinedScore" in anime || "popularityScore" in anime
  const totalEpisodes = "episodes" in anime ? anime.episodes : null
  const crunchyrollSlug = "crunchyrollSlug" in anime ? anime.crunchyrollSlug : null
  const isOnCrunchyroll = "isOnCrunchyroll" in anime ? anime.isOnCrunchyroll : false

  // Watchlist specific properties
  const currentEpisode = "currentEpisode" in anime ? anime.currentEpisode : null
  const currentEpisodeId = "currentEpisodeId" in anime ? anime.currentEpisodeId : null
  const isDubbed = "isDubbed" in anime ? anime.isDubbed : false
  const isSubbed = "isSubbed" in anime ? anime.isSubbed : true
  const isWatchlistItem = !!currentEpisodeId

  // Use Crunchyroll info for sub/dub when available
  const crunchyrollInfo = "crunchyrollInfo" in anime ? anime.crunchyrollInfo : null
  const hasSubDub = crunchyrollInfo
    ? (crunchyrollInfo.isDubbed && crunchyrollInfo.isSubbed)
    : isWatchlistItem
      ? (isDubbed && isSubbed)
      : ((popularity || 0) > 50000 || (score && score > 7.5))
  const audioLabel = hasSubDub ? "Sub | Dub" : (isDubbed ? "Dub" : "Sub")

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
    // For watchlist items, show current episode being watched
    if (currentEpisode) return `Ep ${currentEpisode}`
    if (nextEpisode) return `Ep ${nextEpisode.episode}`
    if (totalEpisodes) return `${totalEpisodes} eps`
    return null
  }

  const episodeText = getEpisodeText()

  // Build the link URL
  // For watchlist items with current episode, go directly to watch page
  // For relations without Crunchyroll ID, link to AniList (external)
  // Otherwise go to anime details page
  const isRelatedWork = isRelation || (relationType && RELATION_TYPES.includes(relationType.toUpperCase()))
  const shouldLinkToAniList = isRelatedWork && !crunchyrollId && !isOnCrunchyroll

  const animeUrl = shouldLinkToAniList
    ? `https://anilist.co/anime/${anime.id}`
    : crunchyrollId
      ? `/anime/${anime.id}?cr=${crunchyrollId}`
      : `/anime/${anime.id}`

  const isExternalLink = shouldLinkToAniList
  const bannerImage = "bannerImage" in anime && typeof anime.bannerImage === "string" ? anime.bannerImage : null
  const imageSource = imageError
    ? `/placeholder.svg?height=${isLandscape ? 320 : 400}&width=${isLandscape ? 560 : 280}&query=anime`
    : (isLandscape && bannerImage ? bannerImage : anime.image)

  const handlePreviewOpen = () => {
    if (!isExternalLink) {
      setIsPreviewOpen(true)
    }
  }

  // We wrap the card in a div, and use the Link for the inner content (Image + Text)
  // The Bookmark button is placed OUTSIDE the Link to prevent event bubbling/nesting issues
  return (
    <div
      className={cn(
        "group/card relative flex-shrink-0 transition-all duration-300 block",
        isLandscape
          ? "w-[240px] sm:w-[260px] md:w-[280px] lg:w-[300px]"
          : compact ? "w-[160px] md:w-[180px]" : "w-[180px] md:w-[200px] lg:w-[220px]",
        isHovered ? "z-50 transform-gpu" : "z-10",
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        animationDelay: `${index * 50}ms`,
      }}
    >
      {/* Container Logic */}
      <div
        className={cn(
          "relative overflow-hidden transition-all duration-300 ease-out shadow-lg shadow-black/30",
          isLandscape ? "aspect-video rounded-[4px]" : "aspect-[2/3] rounded-xl",
          isHovered && (isLandscape ? "scale-[1.08] shadow-2xl" : "scale-105 shadow-2xl"),
        )}
        style={{
          boxShadow: isHovered && animeColor ? `0 25px 50px -12px ${animeColor}40` : undefined,
        }}
      >
        {/* Main Link Area (Image + Overlay) */}
        {isExternalLink ? (
          <Link
            href={animeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full h-full"
          >
            <img
              src={imageSource}
              alt={anime.title}
              className={cn(
                "w-full h-full object-cover",
                "transition-transform duration-500 ease-out",
                isHovered && "scale-110",
              )}
              onError={() => setImageError(true)}
            />

            <div
              className={cn(
                "absolute inset-0 transition-opacity duration-300",
                isLandscape
                  ? "bg-gradient-to-t from-black/95 via-black/38 to-transparent opacity-100"
                  : cn(
                      "bg-gradient-to-t from-background via-background/40 to-transparent",
                      isHovered ? "opacity-100" : "opacity-0",
                    ),
              )}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <span
                  className={cn(
                    "rounded-full text-white",
                    "transition-all duration-300",
                    "shadow-lg",
                    compact ? "p-3" : isLandscape ? "p-3.5" : "p-4",
                    isHovered ? "scale-100 opacity-100" : isLandscape ? "scale-90 opacity-0" : "scale-75 opacity-0",
                  )}
                  style={{
                    backgroundColor: animeColor ? `${animeColor}e6` : "hsl(var(--primary) / 0.9)",
                    boxShadow: animeColor ? `0 10px 25px ${animeColor}50` : undefined,
                  }}
                >
                  <Play className={cn(compact ? "w-4 h-4" : isLandscape ? "w-5 h-5" : "w-6 h-6")} fill="currentColor" />
                </span>
              </div>

              <div
                className={cn(
                  "absolute bottom-0 left-0 right-0",
                  isLandscape
                    ? "p-3 md:p-3.5"
                    : cn(
                        "p-4 transition-all duration-500",
                        isHovered ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
                      ),
                )}
              >
                {currentEpisode && (
                  <div
                    className="text-xs font-bold mb-1 px-2 py-0.5 rounded inline-block"
                    style={{
                      backgroundColor: animeColor || "hsl(var(--primary))",
                      color: "#fff"
                    }}
                  >
                    Ep {currentEpisode}
                  </div>
                )}
                <h3 className={cn("font-semibold text-white leading-tight line-clamp-2", isLandscape ? "text-sm md:text-[0.95rem] mb-1.5" : "hidden")}>
                  {anime.title}
                </h3>
                <div className="flex items-center gap-2 mb-1.5">
                  {score !== null && score !== undefined && (
                    <>
                      {isPopularityScore ? (
                        <>
                          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Popularité
                          </span>
                          <span className="text-sm font-medium text-foreground">
                            {score.toFixed(1)}/100
                          </span>
                        </>
                      ) : (
                        <>
                          <Star
                            className="w-4 h-4"
                            fill="currentColor"
                            style={{ color: animeColor || "hsl(var(--primary))" }}
                          />
                          <span className={cn("font-medium", isLandscape ? "text-xs text-white/90" : "text-sm text-foreground")}>{score.toFixed(1)}</span>
                        </>
                      )}
                    </>
                  )}
                  {(score === null || score === undefined) && (
                    <>
                      <Star className="w-4 h-4 text-muted-foreground" />
                      <span className={cn("font-medium text-muted-foreground", isLandscape ? "text-xs" : "text-sm")}>N/A</span>
                    </>
                  )}
                  {!currentEpisode && episodeText && <span className={cn("ml-auto", isLandscape ? "text-[11px] text-white/72" : "text-xs text-muted-foreground")}>{episodeText}</span>}
                </div>
                {genres.length > 0 && (
                  <div className={cn("flex flex-wrap gap-1", isLandscape && !isHovered && "opacity-90")}>
                    {genres.slice(0, isLandscape ? 3 : 2).map((genre) => (
                      <span key={genre} className={cn(
                        "text-xs px-2 py-0.5 rounded-full",
                        isLandscape ? "bg-black/45 text-white/75 border border-white/10" : "bg-secondary/80 text-muted-foreground",
                      )}>
                        {genre}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Link>
        ) : (
          <button
            type="button"
            onClick={handlePreviewOpen}
            className="block h-full w-full text-left"
          >
            <img
              src={imageSource}
              alt={anime.title}
              className={cn(
                "w-full h-full object-cover",
                "transition-transform duration-500 ease-out",
                isHovered && "scale-110",
              )}
              onError={() => setImageError(true)}
            />

            <div
              className={cn(
                "absolute inset-0 transition-opacity duration-300",
                isLandscape
                  ? "bg-gradient-to-t from-black/95 via-black/38 to-transparent opacity-100"
                  : cn(
                      "bg-gradient-to-t from-background via-background/40 to-transparent",
                      isHovered ? "opacity-100" : "opacity-0",
                    ),
              )}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <span
                  className={cn(
                    "rounded-full text-white",
                    "transition-all duration-300",
                    "shadow-lg",
                    compact ? "p-3" : isLandscape ? "p-3.5" : "p-4",
                    isHovered ? "scale-100 opacity-100" : isLandscape ? "scale-90 opacity-0" : "scale-75 opacity-0",
                  )}
                  style={{
                    backgroundColor: animeColor ? `${animeColor}e6` : "hsl(var(--primary) / 0.9)",
                    boxShadow: animeColor ? `0 10px 25px ${animeColor}50` : undefined,
                  }}
                >
                  <Play className={cn(compact ? "w-4 h-4" : isLandscape ? "w-5 h-5" : "w-6 h-6")} fill="currentColor" />
                </span>
              </div>

              <div
                className={cn(
                  "absolute bottom-0 left-0 right-0",
                  isLandscape
                    ? "p-3 md:p-3.5"
                    : cn(
                        "p-4 transition-all duration-500",
                        isHovered ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
                      ),
                )}
              >
                {currentEpisode && (
                  <div
                    className="text-xs font-bold mb-1 px-2 py-0.5 rounded inline-block"
                    style={{
                      backgroundColor: animeColor || "hsl(var(--primary))",
                      color: "#fff"
                    }}
                  >
                    Ep {currentEpisode}
                  </div>
                )}
                <h3 className={cn("font-semibold text-white leading-tight line-clamp-2", isLandscape ? "text-sm md:text-[0.95rem] mb-1.5" : "hidden")}>
                  {anime.title}
                </h3>
                <div className="flex items-center gap-2 mb-1.5">
                  {score !== null && score !== undefined && (
                    <>
                      {isPopularityScore ? (
                        <>
                          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Popularité
                          </span>
                          <span className="text-sm font-medium text-foreground">
                            {score.toFixed(1)}/100
                          </span>
                        </>
                      ) : (
                        <>
                          <Star
                            className="w-4 h-4"
                            fill="currentColor"
                            style={{ color: animeColor || "hsl(var(--primary))" }}
                          />
                          <span className={cn("font-medium", isLandscape ? "text-xs text-white/90" : "text-sm text-foreground")}>{score.toFixed(1)}</span>
                        </>
                      )}
                    </>
                  )}
                  {(score === null || score === undefined) && (
                    <>
                      <Star className="w-4 h-4 text-muted-foreground" />
                      <span className={cn("font-medium text-muted-foreground", isLandscape ? "text-xs" : "text-sm")}>N/A</span>
                    </>
                  )}
                  {!currentEpisode && episodeText && <span className={cn("ml-auto", isLandscape ? "text-[11px] text-white/72" : "text-xs text-muted-foreground")}>{episodeText}</span>}
                </div>
                {genres.length > 0 && (
                  <div className={cn("flex flex-wrap gap-1", isLandscape && !isHovered && "opacity-90")}>
                    {genres.slice(0, isLandscape ? 3 : 2).map((genre) => (
                      <span key={genre} className={cn(
                        "text-xs px-2 py-0.5 rounded-full",
                        isLandscape ? "bg-black/45 text-white/75 border border-white/10" : "bg-secondary/80 text-muted-foreground",
                      )}>
                        {genre}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </button>
        )}

        <div className="absolute top-3 left-3 flex flex-col items-start gap-1 pointer-events-none">
          {(relationType || isWatchlistItem) && (
            <div
              className={cn(
                "px-2 py-0.5 rounded text-xs font-bold",
                "bg-primary/90 text-white",
                "transition-all duration-300",
              )}
              style={{
                backgroundColor: animeColor || undefined,
              }}
            >
              {relationType?.replace(/_/g, " ") || "TV"}
            </div>
          )}
          {/* CR Stats Badge (Visible for verification) */}
          {"crRating" in anime && ((anime as any).crVoteCount > 0) && (
            <div className="px-2 py-0.5 mt-1 rounded text-[10px] font-bold bg-black/60 text-white/90 backdrop-blur-sm border border-white/10 flex items-center gap-1">
              <span>★ {Number((anime as any).crRating).toFixed(1)}</span>
              <span className="text-white/60">({(anime as any).crVoteCount})</span>
            </div>
          )}
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
          {audioLabel && (
            <div
              className={cn(
                "px-2 py-0.5 rounded text-xs font-medium",
                "bg-background/80 backdrop-blur-sm border border-muted-foreground/30",
                "transition-all duration-300",
              )}
            >
              {audioLabel}
            </div>
          )}
        </div>

        {/* Airing Badge */}
        {showAiring && nextEpisode && (
          <div className="absolute top-3 left-20 px-2 py-0.5 rounded text-xs font-bold bg-green-500/90 text-white flex items-center gap-1 pointer-events-none">
            <Clock className="w-3 h-3" />
            {formatTimeUntil(nextEpisode.timeUntilAiring)}
          </div>
        )}

        {/* Bookmark Button - NOW OUTSIDE LINK */}
        <button
          onClick={async (e) => {
            e.preventDefault()
            e.stopPropagation()

            // Optimistic update
            const newState = !isBookmarked
            setIsBookmarked(newState)

            if (watchlistContext && (crunchyrollId || seriesId)) {
              try {
                const idToUse = crunchyrollId || seriesId
                if (!idToUse) return

                if (newState) {
                  await watchlistContext.addToWatchlist(idToUse)
                } else {
                  await watchlistContext.removeFromWatchlist(idToUse)
                }
              } catch (error) {
                console.error("Failed to update watchlist", error)
                setIsBookmarked(!newState)
              }
            }
          }}
          className={cn(
            "absolute top-3 right-3 p-1.5 rounded-full z-20 cursor-pointer transition-all duration-300",
            isBookmarked
              ? "bg-primary text-primary-foreground"
              : isLandscape
                ? "bg-black/62 backdrop-blur-sm text-white hover:bg-primary hover:text-primary-foreground"
                : "bg-background/80 backdrop-blur-sm text-foreground hover:bg-primary hover:text-primary-foreground",
            !isHovered && !isBookmarked && (isLandscape ? "opacity-0" : "opacity-0"),
            isHovered && "opacity-100",
          )}
          style={{
            backgroundColor: isBookmarked && animeColor ? animeColor : undefined,
          }}
        >
          <Bookmark className="w-4 h-4" fill={isBookmarked ? "currentColor" : "none"} />
        </button>

        {/* Border Glow */}
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

      {!isLandscape && (
        isExternalLink ? (
          <Link
            href={animeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn("block mt-3 px-1", compact && "mt-2")}
          >
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
          </Link>
        ) : (
          <button
            type="button"
            onClick={handlePreviewOpen}
            className={cn("mt-3 block px-1 text-left", compact && "mt-2")}
          >
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
          </button>
        )
      )}

      {!isExternalLink && (
        <AnimePreviewDialog
          anime={{
            id: anime.id,
            title: anime.title,
            image: anime.image,
            bannerImage,
            description: "description" in anime ? anime.description : null,
            rating,
            genres,
            score,
            color: animeColor,
            year: "year" in anime ? anime.year : null,
            episodes: totalEpisodes,
            crunchyrollId,
          }}
          open={isPreviewOpen}
          onOpenChange={setIsPreviewOpen}
          animeUrl={animeUrl}
        />
      )}
    </div>
  )
}

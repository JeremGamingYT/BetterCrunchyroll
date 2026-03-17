"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { createPortal } from "react-dom"
import { ChevronLeft, ChevronRight, Play, Info, X, Star, Calendar, Clock, Check, Plus, Volume2, VolumeX } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTrendingAnime } from "@/hooks/use-combined-anime"
import { useWatchlistOptional } from "@/hooks/use-watchlist"
import Link from "next/link"
import { BetterCrLogo } from "@/components/bettercr-logo"

function extractYoutubeIdFromUrl(url: string) {
  try {
    const parsedUrl = new URL(url)
    const hostname = parsedUrl.hostname.toLowerCase()

    if (hostname.includes("youtu.be")) {
      return parsedUrl.pathname.replace(/^\//, "") || null
    }

    if (hostname.includes("youtube.com")) {
      if (parsedUrl.pathname === "/watch") {
        return parsedUrl.searchParams.get("v")
      }

      const parts = parsedUrl.pathname.split("/").filter(Boolean)
      if (parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "live") {
        return parts[1] || null
      }
    }
  } catch {
    return null
  }

  return null
}

function getYoutubeVideoId(
  anime: {
    trailer?: { id: string; site: string } | null
    externalLinks?: Array<{ site: string; url: string }>
  } | null,
) {
  if (!anime) return null

  if (anime.trailer?.id) {
    const site = anime.trailer.site?.toLowerCase() || ""
    if (site.includes("youtube")) {
      return anime.trailer.id
    }
  }

  const youtubeLink = anime.externalLinks?.find((link) => {
    const site = link.site?.toLowerCase() || ""
    const url = link.url?.toLowerCase() || ""
    return site.includes("youtube") || url.includes("youtube.com") || url.includes("youtu.be")
  })

  if (!youtubeLink?.url) return null
  return extractYoutubeIdFromUrl(youtubeLink.url)
}

function getYoutubeEmbedUrl(videoId: string, origin?: string | null) {
  const params = new URLSearchParams({
    autoplay: "1",
    mute: "1",
    controls: "0",
    rel: "0",
    modestbranding: "1",
    playsinline: "1",
    loop: "1",
    playlist: videoId,
    iv_load_policy: "3",
    fs: "0",
    disablekb: "1",
    cc_load_policy: "0",
    enablejsapi: "1",
  })

  if (origin) {
    params.set("origin", origin)
  }

  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`
}

export function HeroCarousel() {
  const { data: trendingAnimes, isLoading } = useTrendingAnime(1, 6) // Fetch a few more items for better rotation
  const watchlistContext = useWatchlistOptional()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [showInfoPopup, setShowInfoPopup] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [showVideoPreview, setShowVideoPreview] = useState(false)
  const [isVideoMuted, setIsVideoMuted] = useState(true)
  const [playerOrigin, setPlayerOrigin] = useState<string | null>(null)
  const [isPlayerReady, setIsPlayerReady] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)

  const animes = trendingAnimes || []
  const hasAnimes = animes.length > 0

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPlayerOrigin(window.location.origin)
    }
  }, [])

  const goToSlide = useCallback(
    (index: number) => {
      if (isAnimating || !hasAnimes) return
      setIsAnimating(true)
      setCurrentIndex(index)
      setTimeout(() => setIsAnimating(false), 800)
    },
    [isAnimating, hasAnimes],
  )

  const goToPrevious = useCallback(() => {
    if (!hasAnimes) return
    const newIndex = currentIndex === 0 ? animes.length - 1 : currentIndex - 1
    goToSlide(newIndex)
  }, [currentIndex, goToSlide, hasAnimes, animes.length])

  const goToNext = useCallback(() => {
    if (!hasAnimes) return
    const newIndex = currentIndex === animes.length - 1 ? 0 : currentIndex + 1
    goToSlide(newIndex)
  }, [currentIndex, goToSlide, hasAnimes, animes.length])

  useEffect(() => {
    if (showInfoPopup) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }
    return () => {
      document.body.style.overflow = "unset"
    }
  }, [showInfoPopup])

  useEffect(() => {
    if (isPaused || !hasAnimes || showInfoPopup) return
    const interval = setInterval(goToNext, 8000) // Slightly longer duration for cinematic feel
    return () => clearInterval(interval)
  }, [goToNext, isPaused, hasAnimes, showInfoPopup])

  const currentAnime = hasAnimes ? animes[currentIndex] : null
  const currentTrailerId = getYoutubeVideoId(currentAnime)

  // Sync bookmark state with watchlist on anime change
  useEffect(() => {
    if (currentAnime && watchlistContext) {
      const crId = 'crunchyrollId' in currentAnime ? currentAnime.crunchyrollId : null
      const inWatchlist = (typeof crId === 'string' && crId)
        ? watchlistContext.isInWatchlist(crId)
        : watchlistContext.isInWatchlistByTitle(currentAnime.title)
      setIsBookmarked(inWatchlist)
    }
  }, [currentAnime, watchlistContext])

  useEffect(() => {
    setShowVideoPreview(false)
    setIsPlayerReady(false)

    if (!currentTrailerId || showInfoPopup) {
      return
    }

    const timer = window.setTimeout(() => {
      setShowVideoPreview(true)
    }, 900)

    return () => window.clearTimeout(timer)
  }, [currentIndex, currentTrailerId, showInfoPopup])

  // Fallback data for loading state
  const fallbackAnime = {
    id: 0,
    title: "Chargement...",
    description: "Découvrez les meilleurs anime en streaming sur Crunchyroll.",
    image: "/placeholder.svg?height=1080&width=1920",
    rating: "14+",
    genres: ["Action", "Fantasy"],
    nextEpisode: { episode: 1 },
    year: 2024,
    score: null,
    episodes: null,
    status: "RELEASING",
  }

  const displayAnime = currentAnime || fallbackAnime
  const releaseYear = "year" in displayAnime ? displayAnime.year : new Date().getFullYear()
  const matchPercent = displayAnime.score ? Math.min(99, Math.max(82, Math.round(displayAnime.score * 10))) : 96
  const bannerSource = "bannerImage" in displayAnime && displayAnime.bannerImage ? displayAnime.bannerImage : displayAnime.image
  const episodeCount = displayAnime.episodes || (displayAnime.nextEpisode ? displayAnime.nextEpisode.episode : null)
  const previewEmbedUrl = useMemo(
    () => (currentTrailerId ? getYoutubeEmbedUrl(currentTrailerId, playerOrigin) : null),
    [currentTrailerId, playerOrigin],
  )

  useEffect(() => {
    if (!showVideoPreview || !isPlayerReady || !iframeRef.current) {
      return
    }

    const targetOrigin = playerOrigin || "https://www.youtube-nocookie.com"
    const command = isVideoMuted ? "mute" : "unMute"

    iframeRef.current.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func: command, args: [] }),
      targetOrigin,
    )
  }, [isPlayerReady, isVideoMuted, playerOrigin, showVideoPreview])

  return (
    <section
      className="relative w-full h-[92vh] min-h-[680px] overflow-hidden bg-background"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {hasAnimes ? (
        animes.map((anime, index) => (
          <div
            key={anime.id}
            className={cn(
              "absolute inset-0 transition-all duration-[1200ms] ease-in-out",
              index === currentIndex ? "opacity-100 scale-[1.03] z-10" : "opacity-0 scale-100 z-0",
            )}
          >
            {index === currentIndex && showVideoPreview && previewEmbedUrl ? (
              <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none bg-black">
                <iframe
                  key={currentTrailerId}
                  ref={iframeRef}
                  src={previewEmbedUrl}
                  title={`${anime.title} trailer`}
                  className="absolute left-1/2 top-1/2 h-[112%] w-[112%] min-h-full min-w-full -translate-x-1/2 -translate-y-1/2 scale-[1.14]"
                  allow="autoplay; encrypted-media; picture-in-picture"
                  referrerPolicy="strict-origin-when-cross-origin"
                  tabIndex={-1}
                  onLoad={() => setIsPlayerReady(true)}
                />
              </div>
            ) : null}
            <img
              src={anime.bannerImage || anime.image}
              alt={anime.title}
              className={cn(
                "absolute inset-0 w-full h-full object-cover transition-opacity duration-500",
                index === currentIndex && showVideoPreview && previewEmbedUrl ? "opacity-0" : "opacity-100",
              )}
              style={{ objectPosition: "center 22%" }}
            />
            <div className="absolute inset-0 bg-black/30 z-10" />
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/55 to-transparent z-20" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/15 to-transparent z-20" />
            <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-black/85 to-transparent z-20" />
          </div>
        ))
      ) : (
        <div className="absolute inset-0 z-0">
          <div className="w-full h-full bg-secondary animate-pulse" />
        </div>
      )}

      <div className="absolute inset-0 z-30 flex items-center px-6 md:px-10 lg:px-14 xl:px-16">
        <div className="w-full max-w-[640px] space-y-6 pt-20 md:pt-12">
          <div
            className={cn(
              "flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.35em] text-white/70",
              "transition-all duration-700 ease-out transform",
              isAnimating ? "opacity-0 translate-y-8" : "opacity-100 translate-y-0",
            )}
          >
            <BetterCrLogo className="w-[124px] md:w-[138px]" compact />
            <span className="w-10 h-px bg-white/25" />
            <span>Série à la une</span>
          </div>

          <h1
            className={cn(
              "font-black text-white leading-[0.88] tracking-[0.02em] font-bangers uppercase",
              "drop-shadow-[0_10px_24px_rgba(0,0,0,0.55)]",
              "transition-all duration-700 ease-out transform",
              displayAnime.title.length > 30 ? "text-5xl md:text-6xl lg:text-7xl" :
                displayAnime.title.length > 20 ? "text-6xl md:text-7xl lg:text-8xl" :
                  "text-7xl md:text-8xl lg:text-[7rem]",
              isAnimating ? "opacity-0 translate-y-12" : "opacity-100 translate-y-0",
            )}
          >
            {displayAnime.title}
          </h1>

          <div
            className={cn(
              "flex flex-wrap items-center gap-x-4 gap-y-2 text-sm md:text-base text-white/86 font-medium",
              "transition-all duration-700 ease-out delay-100 transform",
              isAnimating ? "opacity-0 translate-y-8" : "opacity-100 translate-y-0",
            )}
          >
            <span className="font-semibold text-[#46d369]">{matchPercent}% de pertinence</span>
            <span>{releaseYear}</span>
            <span className="px-2 py-0.5 border border-white/30 text-white/92 text-xs uppercase tracking-[0.15em]">
              {displayAnime.rating}
            </span>
            {episodeCount && <span>{episodeCount} épisodes</span>}
            <div className="w-1 h-1 rounded-full bg-white/35" />
            <span className="uppercase tracking-[0.18em] text-white/72">
              {displayAnime.genres.slice(0, 3).join(" • ")}
            </span>
            {displayAnime.score && (
              <>
                <div className="w-1 h-1 rounded-full bg-white/35" />
                <div className="flex items-center gap-1 text-white/90">
                  <Star className="w-4 h-4 fill-current" />
                  <span>{displayAnime.score.toFixed(1)}</span>
                </div>
              </>
            )}
          </div>

          <p
            className={cn(
              "text-base md:text-xl text-white/76 leading-relaxed max-w-2xl line-clamp-4",
              "drop-shadow-md",
              "transition-all duration-700 ease-out delay-200 transform",
              isAnimating ? "opacity-0 translate-y-8" : "opacity-100 translate-y-0",
            )}
          >
            {displayAnime.description || "Découvrez cet anime passionnant sur Crunchyroll."}
          </p>

          <div
            className={cn(
              "flex flex-wrap items-center gap-3 pt-2",
              "transition-all duration-700 ease-out delay-300 transform",
              isAnimating ? "opacity-0 translate-y-8" : "opacity-100 translate-y-0",
            )}
          >
            <Link
              href={`/anime/${displayAnime.id}`}
              onClick={() => window.scrollTo({ top: 0, behavior: "auto" })}
              className="group inline-flex items-center gap-3 px-8 py-3.5 bg-white text-black rounded-md font-bold text-lg hover:bg-white/85 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Play className="w-6 h-6 fill-current transition-transform duration-200 group-hover:scale-110" />
              <span>Lecture</span>
            </Link>

            <button
              onClick={async () => {
                if (!currentAnime || !watchlistContext) return
                const crId = 'crunchyrollId' in currentAnime ? currentAnime.crunchyrollId : null
                const newState = !isBookmarked
                setIsBookmarked(newState)
                try {
                  if (typeof crId === 'string' && crId) {
                    if (newState) {
                      await watchlistContext.addToWatchlist(crId)
                    } else {
                      await watchlistContext.removeFromWatchlist(crId)
                    }
                  }
                } catch (error) {
                  console.error('Failed to update watchlist:', error)
                  setIsBookmarked(!newState)
                }
              }}
              className={cn(
                "inline-flex items-center gap-3 px-6 py-3.5 rounded-md border border-white/18 transition-all duration-200 hover:bg-white/12 active:scale-[0.98]",
                isBookmarked
                  ? "bg-white/14 text-white border-white/22"
                  : "bg-white/8 text-white hover:bg-white/14"
              )}
              title={isBookmarked ? "Retirer de la watchlist" : "Ajouter à la watchlist"}
            >
              {isBookmarked ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              <span className="font-semibold">Ma liste</span>
            </button>

            <button
              onClick={() => setShowInfoPopup(true)}
              className="inline-flex items-center gap-3 px-6 py-3.5 rounded-md bg-[#6d6d6eb3] hover:bg-[#808081cc] text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] font-semibold"
            >
              <Info className="w-5 h-5" />
              <span>Plus d'infos</span>
            </button>
          </div>
        </div>
      </div>

      {hasAnimes && (
        <div className="absolute right-10 bottom-12 z-30 hidden lg:flex items-center gap-4">
          <button
            onClick={goToPrevious}
            className="h-12 w-12 flex items-center justify-center rounded-full bg-black/35 hover:bg-black/55 text-white border border-white/12 transition-all duration-200"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex gap-3">
            {animes.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  index === currentIndex
                    ? "w-10 bg-primary"
                    : "w-3 bg-white/28 hover:bg-white/56"
                )}
              />
            ))}
          </div>
          <button
            onClick={goToNext}
            className="h-12 w-12 flex items-center justify-center rounded-full bg-black/35 hover:bg-black/55 text-white border border-white/12 transition-all duration-200"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      )}

      <div className="absolute right-8 bottom-24 z-30 hidden lg:flex items-center gap-3">
        {currentTrailerId ? (
          <button
            onClick={() => setIsVideoMuted((value) => !value)}
            className="h-11 w-11 rounded-full border border-white/35 bg-black/24 text-white flex items-center justify-center transition-colors duration-200 hover:bg-black/42"
            aria-label={isVideoMuted ? "Activer le son du trailer" : "Couper le son du trailer"}
            title={isVideoMuted ? "Activer le son" : "Couper le son"}
          >
            {isVideoMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
        ) : null}
        <div className="h-10 px-4 flex items-center bg-black/38 border-l-2 border-white/80 text-white text-lg font-medium tracking-wide">
          {displayAnime.rating}
        </div>
      </div>

      {showInfoPopup && currentAnime && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-xl transition-all duration-300 animate-in fade-in"
          onClick={() => setShowInfoPopup(false)}
        >
          <div
            className="relative netflix-panel max-w-4xl w-full mx-6 shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[85vh] animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full md:w-2/5 h-64 md:h-auto overflow-hidden">
              <img
                src={bannerSource}
                alt={currentAnime.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] via-transparent to-transparent md:bg-gradient-to-r" />
            </div>

            <div className="flex-1 p-8 md:p-12 overflow-y-auto custom-scrollbar bg-gradient-to-br from-[#111111] to-[#181818]">
              <button
                onClick={() => setShowInfoPopup(false)}
                className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-all z-10"
              >
                <X className="w-6 h-6" />
              </button>

              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 leading-tight">
                {currentAnime.title}
              </h2>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="p-4 rounded-md bg-white/5 border border-white/5">
                  <div className="flex items-center gap-2 text-primary mb-1">
                    <Star className="w-5 h-5 fill-current" />
                    <span className="font-bold text-lg">{currentAnime.score ? currentAnime.score.toFixed(1) : "N/A"}</span>
                  </div>
                  <span className="text-xs text-zinc-400 uppercase tracking-wider">Score moyen</span>
                </div>
                <div className="p-4 rounded-md bg-white/5 border border-white/5">
                  <div className="flex items-center gap-2 text-white mb-1">
                    <Calendar className="w-5 h-5" />
                    <span className="font-bold text-lg">{currentAnime.year || "N/A"}</span>
                  </div>
                  <span className="text-xs text-zinc-400 uppercase tracking-wider">Année</span>
                </div>
                <div className="p-4 rounded-md bg-white/5 border border-white/5">
                  <div className="flex items-center gap-2 text-white mb-1">
                    <Clock className="w-5 h-5" />
                    <span className="font-bold text-lg">{currentAnime.episodes || "?"}</span>
                  </div>
                  <span className="text-xs text-zinc-400 uppercase tracking-wider">Épisodes</span>
                </div>
                <div className="p-4 rounded-md bg-white/5 border border-white/5">
                  <div className="text-white font-bold text-lg mb-1">{currentAnime.rating}</div>
                  <span className="text-xs text-zinc-400 uppercase tracking-wider">Classification</span>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <h3 className="text-white font-semibold">Genres</h3>
                <div className="flex flex-wrap gap-2">
                  {currentAnime.genres.map((genre) => (
                    <span key={genre} className="px-4 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-full text-sm text-zinc-300 transition-colors cursor-default">
                      {genre}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <h3 className="text-white font-semibold">Synopsis</h3>
                <p className="text-zinc-400 leading-relaxed text-sm md:text-base">
                  {currentAnime.description || "Aucune description disponible pour cet anime."}
                </p>
              </div>

              <Link
                href={`/anime/${currentAnime.id}`}
                onClick={() => {
                  setShowInfoPopup(false)
                  window.scrollTo({ top: 0, behavior: "auto" })
                }}
                className="flex items-center justify-center gap-2 w-full py-4 bg-primary text-primary-foreground rounded-md font-bold text-lg hover:bg-primary/90 transition-all"
              >
                <Play className="w-5 h-5 fill-current" />
                Regarder maintenant
              </Link>

            </div>
          </div>
        </div>,
        document.body
      )}
    </section>
  )
}

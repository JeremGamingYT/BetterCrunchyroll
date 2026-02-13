"use client"

import { useState, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import { ChevronLeft, ChevronRight, Play, Bookmark, Info, X, Star, Calendar, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTrendingAnime } from "@/hooks/use-combined-anime"
import { useWatchlistOptional } from "@/hooks/use-watchlist"
import Link from "next/link"

export function HeroCarousel() {
  const { data: trendingAnimes, isLoading } = useTrendingAnime(1, 6) // Fetch a few more items for better rotation
  const watchlistContext = useWatchlistOptional()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [showInfoPopup, setShowInfoPopup] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)

  const animes = trendingAnimes || []
  const hasAnimes = animes.length > 0

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

  return (
    <section
      className="relative w-full h-[90vh] overflow-hidden bg-background"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Background Images with Parallax-like effect */}
      {hasAnimes ? (
        animes.map((anime, index) => (
          <div
            key={anime.id}
            className={cn(
              "absolute inset-0 transition-all duration-1000 ease-in-out",
              index === currentIndex ? "opacity-100 scale-105 z-10" : "opacity-0 scale-100 z-0",
            )}
          >
            {/* 
              High-quality banner image. 
              Using object-cover to fill the screen.
            */}
            <div className="absolute inset-0 bg-black/40 z-10" /> {/* General dimming */}
            <img
              src={anime.bannerImage || anime.image}
              alt={anime.title}
              className="w-full h-full object-cover"
              style={{ objectPosition: 'center 20%' }}
            />

            {/* Cinematic Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/40 to-transparent z-20" />
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-background to-transparent z-20" />
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/60 to-transparent z-20" />
          </div>
        ))
      ) : (
        <div className="absolute inset-0 z-0">
          <div className="w-full h-full bg-secondary animate-pulse" />
        </div>
      )}

      {/* Main Content Area */}
      <div className="absolute inset-0 z-30 flex items-center px-6 md:px-12 lg:px-20 xl:px-32">
        <div className="w-full max-w-4xl space-y-8 mt-16 md:mt-0">

          {/* Title with premium typography */}
          <h1
            className={cn(
              "text-5xl md:text-6xl lg:text-8xl font-black text-white leading-none tracking-wide font-bangers",
              "drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]",
              "transition-all duration-700 ease-out transform",
              isAnimating ? "opacity-0 translate-y-12" : "opacity-100 translate-y-0",
            )}
          >
            {displayAnime.title}
          </h1>

          {/* Meta Tags - Clean and Minimal */}
          <div
            className={cn(
              "flex items-center gap-4 text-sm md:text-base text-gray-200 font-medium",
              "transition-all duration-700 ease-out delay-100 transform",
              isAnimating ? "opacity-0 translate-y-8" : "opacity-100 translate-y-0",
            )}
          >
            <span className="px-2.5 py-1 bg-white/20 backdrop-blur-md rounded border border-white/10 text-white">
              {displayAnime.rating}
            </span>
            <span>
              {"year" in displayAnime ? displayAnime.year : new Date().getFullYear()}
            </span>
            <div className="w-1 h-1 rounded-full bg-gray-400" />
            <span className="uppercase tracking-wider">
              {displayAnime.genres.slice(0, 3).join(" • ")}
            </span>
            {displayAnime.score && (
              <>
                <div className="w-1 h-1 rounded-full bg-gray-400" />
                <div className="flex items-center gap-1 text-yellow-400">
                  <Star className="w-4 h-4 fill-current" />
                  <span>{displayAnime.score.toFixed(1)}</span>
                </div>
              </>
            )}
          </div>

          {/* Description - Clamped for elegance */}
          <p
            className={cn(
              "text-lg md:text-xl text-gray-300 leading-relaxed max-w-2xl line-clamp-3 md:line-clamp-4",
              "drop-shadow-md",
              "transition-all duration-700 ease-out delay-200 transform",
              isAnimating ? "opacity-0 translate-y-8" : "opacity-100 translate-y-0",
            )}
          >
            {displayAnime.description || "Découvrez cet anime passionnant sur Crunchyroll."}
          </p>

          {/* Action Buttons - Glassmorphism */}
          <div
            className={cn(
              "flex flex-wrap items-center gap-4 pt-4",
              "transition-all duration-700 ease-out delay-300 transform",
              isAnimating ? "opacity-0 translate-y-8" : "opacity-100 translate-y-0",
            )}
          >
            <Link
              href={`/anime/${displayAnime.id}`}
              onClick={() => window.scrollTo({ top: 0, behavior: "instant" })}
              className="group flex items-center gap-3 px-8 py-4 bg-primary text-primary-foreground rounded-full font-bold text-lg hover:bg-primary/90 transition-all duration-300 hover:scale-105 active:scale-95 shadow-[0_0_40px_-10px_rgba(var(--primary),0.5)]"
            >
              <Play className="w-6 h-6 fill-current transition-transform duration-300 group-hover:scale-125 group-hover:rotate-12" />
              <span>Regarder</span>
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
                "p-4 rounded-full border border-white/20 backdrop-blur-md transition-all duration-300 hover:scale-110 active:scale-95",
                isBookmarked
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-white/10 text-white hover:bg-white/20"
              )}
              title={isBookmarked ? "Retirer de la watchlist" : "Ajouter à la watchlist"}
            >
              <Bookmark className="w-6 h-6" fill={isBookmarked ? "currentColor" : "none"} />
            </button>

            <button
              onClick={() => setShowInfoPopup(true)}
              className="flex items-center gap-2 px-6 py-4 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md transition-all duration-300 hover:scale-105 active:scale-95 font-semibold"
            >
              <Info className="w-6 h-6" />
              <span>Détails</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Controls */}
      {hasAnimes && (
        <div className="absolute right-8 bottom-12 z-30 flex items-center gap-4 hidden lg:flex">
          <button
            onClick={goToPrevious}
            className="p-4 rounded-full bg-black/20 hover:bg-black/40 text-white border border-white/10 backdrop-blur-md transition-all duration-300 hover:scale-110 active:scale-95"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex gap-3">
            {animes.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-500",
                  index === currentIndex
                    ? "w-12 bg-primary shadow-[0_0_10px_rgba(var(--primary),0.8)]"
                    : "w-3 bg-white/30 hover:bg-white/60"
                )}
              />
            ))}
          </div>
          <button
            onClick={goToNext}
            className="p-4 rounded-full bg-black/20 hover:bg-black/40 text-white border border-white/10 backdrop-blur-md transition-all duration-300 hover:scale-110 active:scale-95"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* Info Popup - Premium Modular */}
      {showInfoPopup && currentAnime && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-xl transition-all duration-300 animate-in fade-in"
          onClick={() => setShowInfoPopup(false)}
        >
          <div
            className="relative bg-[#0a0a0a] border border-white/10 rounded-3xl max-w-4xl w-full mx-6 shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[85vh] animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Visual Side */}
            <div className="relative w-full md:w-2/5 h-64 md:h-auto overflow-hidden">
              <img
                src={currentAnime.image} // Use large cover image here
                alt={currentAnime.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent md:bg-gradient-to-r" />
            </div>

            {/* Info Side */}
            <div className="flex-1 p-8 md:p-12 overflow-y-auto custom-scrollbar bg-gradient-to-br from-[#0a0a0a] to-[#121212]">
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
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-2 text-primary mb-1">
                    <Star className="w-5 h-5 fill-current" />
                    <span className="font-bold text-lg">{currentAnime.score ? currentAnime.score.toFixed(1) : "N/A"}</span>
                  </div>
                  <span className="text-xs text-zinc-400 uppercase tracking-wider">Score moyen</span>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-2 text-white mb-1">
                    <Calendar className="w-5 h-5" />
                    <span className="font-bold text-lg">{currentAnime.year || "N/A"}</span>
                  </div>
                  <span className="text-xs text-zinc-400 uppercase tracking-wider">Année</span>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-2 text-white mb-1">
                    <Clock className="w-5 h-5" />
                    <span className="font-bold text-lg">{currentAnime.episodes || "?"}</span>
                  </div>
                  <span className="text-xs text-zinc-400 uppercase tracking-wider">Épisodes</span>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
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
                  window.scrollTo({ top: 0, behavior: "instant" })
                }}
                className="flex items-center justify-center gap-2 w-full py-4 bg-primary text-primary-foreground rounded-xl font-bold text-lg hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
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

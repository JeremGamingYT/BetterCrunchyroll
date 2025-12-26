"use client"

import { useState, useEffect, useCallback } from "react"
import { ChevronLeft, ChevronRight, Play, Bookmark, Info, X, Star, Calendar, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTrendingAnime } from "@/hooks/use-anilist"
import Link from "next/link"

export function HeroCarousel() {
  const { data: trendingAnimes, isLoading } = useTrendingAnime(1, 4)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [showInfoPopup, setShowInfoPopup] = useState(false)

  const animes = trendingAnimes || []
  const hasAnimes = animes.length > 0

  const goToSlide = useCallback(
    (index: number) => {
      if (isAnimating || !hasAnimes) return
      setIsAnimating(true)
      setCurrentIndex(index)
      setTimeout(() => setIsAnimating(false), 700)
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
    if (isPaused || !hasAnimes) return
    const interval = setInterval(goToNext, 6000)
    return () => clearInterval(interval)
  }, [goToNext, isPaused, hasAnimes])

  const currentAnime = hasAnimes ? animes[currentIndex] : null

  // Fallback data for loading state
  const fallbackAnime = {
    id: 0,
    title: "Chargement...",
    description: "Découvrez les meilleurs anime en streaming sur Crunchyroll.",
    image: "/placeholder.svg?height=800&width=1600",
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
      className="relative h-[85vh] min-h-[600px] max-h-[900px] overflow-hidden pt-16 z-10"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Background Images */}
      {hasAnimes ? (
        animes.map((anime, index) => (
          <div
            key={anime.id}
            className={cn(
              "absolute inset-0 transition-all duration-700 ease-out",
              index === currentIndex ? "opacity-100 scale-100" : "opacity-0 scale-105",
            )}
          >
            <img
              src={anime.bannerImage || anime.image}
              alt={anime.title}
              className="w-full h-full object-cover object-center"
            />
            {/* Gradients */}
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/30" />
            <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-transparent to-background" />
          </div>
        ))
      ) : (
        <div className="absolute inset-0">
          <div className="w-full h-full bg-gradient-to-br from-secondary to-background" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/30" />
        </div>
      )}

      {/* Content - Added max-w and padding to avoid arrow overlap */}
      <div className="relative z-10 h-full flex items-center px-4 md:px-8 lg:px-16 xl:px-24">
        <div className="max-w-2xl space-y-6">
          <h1
            className={cn(
              "text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-tight line-clamp-2",
              "transition-all duration-700 ease-out",
              isAnimating ? "opacity-0 translate-y-8" : "opacity-100 translate-y-0",
            )}
            style={{ textShadow: "0 2px 20px rgba(0,0,0,0.5)" }}
          >
            {displayAnime.title}
          </h1>

          {/* Meta */}
          <div
            className={cn(
              "flex items-center gap-3 flex-wrap transition-all duration-700 ease-out delay-100",
              isAnimating ? "opacity-0 translate-y-8" : "opacity-100 translate-y-0",
            )}
          >
            <span className="px-2 py-1 bg-primary/20 border border-primary/50 rounded text-xs font-semibold text-primary">
              {displayAnime.rating}
            </span>
            <span className="text-muted-foreground text-sm">•</span>
            <span className="text-muted-foreground text-sm">
              {"year" in displayAnime ? displayAnime.year : new Date().getFullYear()}
            </span>
            <span className="text-muted-foreground text-sm">•</span>
            {displayAnime.genres.map((genre, i) => (
              <span key={genre} className="text-muted-foreground text-sm">
                {genre}
                {i < displayAnime.genres.length - 1 && ", "}
              </span>
            ))}
          </div>

          {/* Description */}
          <p
            className={cn(
              "text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl line-clamp-3",
              "transition-all duration-700 ease-out delay-150",
              isAnimating ? "opacity-0 translate-y-8" : "opacity-100 translate-y-0",
            )}
          >
            {displayAnime.description || "Découvrez cet anime passionnant sur Crunchyroll."}
          </p>

          {/* Actions - Made buttons functional */}
          <div
            className={cn(
              "flex items-center gap-3 pt-2 transition-all duration-700 ease-out delay-200",
              isAnimating ? "opacity-0 translate-y-8" : "opacity-100 translate-y-0",
            )}
          >
            <Link
              href={`/anime/${displayAnime.id}`}
              onClick={() => window.scrollTo({ top: 0, behavior: "instant" })}
              className="group flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-xl font-bold text-sm shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all duration-300 hover:scale-105 active:scale-95"
            >
              <Play className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" fill="currentColor" />
              <span>À SUIVRE E{displayAnime.nextEpisode?.episode || 1}</span>
            </Link>
            <button className="p-4 bg-secondary/80 hover:bg-secondary text-foreground rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 border border-border/50 shadow-lg backdrop-blur-sm">
              <Bookmark className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowInfoPopup(true)}
              className="p-4 bg-secondary/80 hover:bg-secondary text-foreground rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 border border-border/50 shadow-lg backdrop-blur-sm"
            >
              <Info className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Arrows - Moved arrows to edges and increased z-index */}
      {hasAnimes && (
        <>
          <button
            onClick={goToPrevious}
            className={cn(
              "absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-30",
              "p-3 rounded-full bg-background/50 backdrop-blur-sm border border-border/30",
              "text-foreground/70 hover:text-foreground hover:bg-background/80",
              "transition-all duration-300 hover:scale-110",
            )}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={goToNext}
            className={cn(
              "absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-30",
              "p-3 rounded-full bg-background/50 backdrop-blur-sm border border-border/30",
              "text-foreground/70 hover:text-foreground hover:bg-background/80",
              "transition-all duration-300 hover:scale-110",
            )}
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Dots Indicator */}
      {hasAnimes && (
        <div className="absolute bottom-8 left-4 md:left-8 lg:left-16 xl:left-24 z-20 flex items-center gap-2">
          {animes.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-500",
                index === currentIndex ? "w-8 bg-primary" : "w-3 bg-foreground/30 hover:bg-foreground/50",
              )}
            />
          ))}
        </div>
      )}

      {/* Progress Bar */}
      {hasAnimes && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-border/30">
          <div
            className="h-full bg-primary/50 transition-all duration-300"
            style={{
              width: `${((currentIndex + 1) / animes.length) * 100}%`,
            }}
          />
        </div>
      )}

      {showInfoPopup && currentAnime && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-background/90 backdrop-blur-md transition-all duration-300 animate-in fade-in"
          onClick={() => setShowInfoPopup(false)}
        >
          <div
            className="relative bg-card border border-border rounded-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden shadow-2xl flex flex-col scale-100 animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Image */}
            <div className="relative h-64 flex-shrink-0">
              <img
                src={currentAnime.bannerImage || currentAnime.image}
                alt={currentAnime.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
              <button
                onClick={() => setShowInfoPopup(false)}
                className="absolute top-4 right-4 p-2 bg-background/50 backdrop-blur-sm rounded-full hover:bg-background/80 transition-all hover:scale-110 z-10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content Area */}
            <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
              <h2 className="text-2xl font-bold text-foreground">{currentAnime.title}</h2>

              {/* Meta info */}
              <div className="flex flex-wrap items-center gap-3">
                {currentAnime.score && (
                  <div className="flex items-center gap-1 text-primary">
                    <Star className="w-4 h-4" fill="currentColor" />
                    <span className="font-semibold">{currentAnime.score.toFixed(1)}</span>
                  </div>
                )}
                <span className="px-2 py-0.5 bg-primary/20 border border-primary/50 rounded text-xs font-semibold text-primary">
                  {currentAnime.rating}
                </span>
                <div className="flex items-center gap-1 text-muted-foreground text-sm">
                  <Calendar className="w-4 h-4" />
                  <span>{currentAnime.year}</span>
                </div>
                {currentAnime.episodes && (
                  <div className="flex items-center gap-1 text-muted-foreground text-sm">
                    <Clock className="w-4 h-4" />
                    <span>{currentAnime.episodes} épisodes</span>
                  </div>
                )}
              </div>

              {/* Genres */}
              <div className="flex flex-wrap gap-2">
                {currentAnime.genres.map((genre) => (
                  <span key={genre} className="px-3 py-1 bg-secondary rounded-full text-sm text-muted-foreground">
                    {genre}
                  </span>
                ))}
              </div>

              {/* Description */}
              <p className="text-muted-foreground leading-relaxed">
                {currentAnime.description || "Aucune description disponible."}
              </p>

              {/* Studio */}
              {currentAnime.studio && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Studio : </span>
                  <span className="text-foreground font-medium">{currentAnime.studio}</span>
                </div>
              )}

              {/* Status */}
              <div className="text-sm">
                <span className="text-muted-foreground">Statut : </span>
                <span className="text-foreground font-medium">
                  {currentAnime.status === "RELEASING"
                    ? "En cours"
                    : currentAnime.status === "FINISHED"
                      ? "Terminé"
                      : currentAnime.status === "NOT_YET_RELEASED"
                        ? "À venir"
                        : currentAnime.status}
                </span>
              </div>

              {/* Action button */}
              <Link
                href={`/anime/${currentAnime.id}`}
                onClick={() => {
                  setShowInfoPopup(false)
                  window.scrollTo({ top: 0, behavior: "instant" })
                }}
                className="flex items-center justify-center gap-2 w-full py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors"
              >
                <Play className="w-5 h-5" fill="currentColor" />
                Voir l'anime
              </Link>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

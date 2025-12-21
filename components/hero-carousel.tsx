"use client"

import { useState, useEffect, useCallback } from "react"
import { ChevronLeft, ChevronRight, Play, Bookmark, Info } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTrendingAnime } from "@/hooks/use-anilist"

export function HeroCarousel() {
  const { data: trendingAnimes, isLoading } = useTrendingAnime(1, 4)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [isPaused, setIsPaused] = useState(false)

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
    if (isPaused || !hasAnimes) return
    const interval = setInterval(goToNext, 6000)
    return () => clearInterval(interval)
  }, [goToNext, isPaused, hasAnimes])

  const currentAnime = hasAnimes ? animes[currentIndex] : null

  // Fallback data for loading state
  const fallbackAnime = {
    title: "Chargement...",
    description: "Découvrez les meilleurs anime en streaming sur Crunchyroll.",
    image: "/placeholder.svg?height=800&width=1600",
    rating: "14+",
    genres: ["Action", "Fantasy"],
    nextEpisode: { episode: 1 },
    year: 2024,
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

      {/* Content */}
      <div className="relative z-10 h-full flex items-center px-4 md:px-8 lg:px-12">
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

          {/* Actions */}
          <div
            className={cn(
              "flex items-center gap-3 pt-2 transition-all duration-700 ease-out delay-200",
              isAnimating ? "opacity-0 translate-y-8" : "opacity-100 translate-y-0",
            )}
          >
            <button className="group flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold text-sm hover:bg-primary/90 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary/25">
              <Play className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" fill="currentColor" />
              <span>À SUIVRE E{displayAnime.nextEpisode?.episode || 1}</span>
            </button>
            <button className="p-3 bg-secondary/80 hover:bg-secondary text-foreground rounded-lg transition-all duration-300 hover:scale-105 border border-border/50">
              <Bookmark className="w-5 h-5" />
            </button>
            <button className="p-3 bg-secondary/80 hover:bg-secondary text-foreground rounded-lg transition-all duration-300 hover:scale-105 border border-border/50">
              <Info className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Arrows */}
      {hasAnimes && (
        <>
          <button
            onClick={goToPrevious}
            className={cn(
              "absolute left-4 top-1/2 -translate-y-1/2 z-20",
              "p-3 rounded-full bg-background/30 backdrop-blur-sm border border-border/30",
              "text-foreground/70 hover:text-foreground hover:bg-background/50",
              "transition-all duration-300 hover:scale-110",
              "opacity-0 hover:opacity-100 group-hover:opacity-100",
              "md:opacity-70",
            )}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={goToNext}
            className={cn(
              "absolute right-4 top-1/2 -translate-y-1/2 z-20",
              "p-3 rounded-full bg-background/30 backdrop-blur-sm border border-border/30",
              "text-foreground/70 hover:text-foreground hover:bg-background/50",
              "transition-all duration-300 hover:scale-110",
              "opacity-0 hover:opacity-100 group-hover:opacity-100",
              "md:opacity-70",
            )}
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Dots Indicator */}
      {hasAnimes && (
        <div className="absolute bottom-8 left-4 md:left-8 lg:left-12 z-20 flex items-center gap-2">
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
    </section>
  )
}

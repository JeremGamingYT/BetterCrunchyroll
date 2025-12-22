"use client"

import { useRef, useState } from "react"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { AnimeCard } from "./anime-card"
import { cn } from "@/lib/utils"
import Link from "next/link"
import type { CombinedAnime } from "@/hooks/use-combined-anime"

interface AnimeSectionProps {
  title: string
  animes?:
  | CombinedAnime[]
  | Array<{
    id: number
    title: string
    image: string
    rating: string
    genres: string[]
    color?: string | null
    crunchyrollId?: string | null
  }>
  isLoading?: boolean
  error?: Error | null
  showAiring?: boolean
  sectionSlug?: string
}

export function AnimeSection({ title, animes, isLoading, error, showAiring, sectionSlug }: AnimeSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
      setCanScrollLeft(scrollLeft > 0)
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
    }
  }

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = direction === "left" ? -400 : 400
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" })
      setTimeout(checkScroll, 300)
    }
  }

  const getSectionHref = () => {
    if (sectionSlug) return sectionSlug
    const titleLower = title.toLowerCase()
    if (titleLower.includes("nouveauté") || titleLower.includes("nouveau")) return "/nouveau"
    if (titleLower.includes("populaire")) return "/populaire"
    if (titleLower.includes("simulcast")) return "/simulcast"
    if (titleLower.includes("sélection") || titleLower.includes("tendance")) return "/populaire"
    return "#"
  }

  return (
    <section className="relative isolate group/section" style={{ zIndex: 1 }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl md:text-2xl font-bold text-foreground">{title}</h2>
        <Link
          href={getSectionHref()}
          className="text-sm font-medium text-primary hover:text-primary/80 transition-colors duration-300 flex items-center gap-1"
        >
          Voir tout
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Scroll Container */}
      <div className="relative">
        {/* Left Arrow */}
        <button
          onClick={() => scroll("left")}
          className={cn(
            "absolute -left-4 top-1/2 -translate-y-1/2 z-[60]",
            "p-2 rounded-full bg-background/90 backdrop-blur-sm border border-border",
            "text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary",
            "transition-all duration-300 hover:scale-110",
            "opacity-0 group-hover/section:opacity-100",
            !canScrollLeft && "hidden",
          )}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            Erreur lors du chargement. Veuillez réessayer.
          </div>
        )}

        {!isLoading && !error && animes && (
          <div
            ref={scrollRef}
            onScroll={checkScroll}
            className="flex gap-4 overflow-x-auto pb-16 pt-4 -mx-4 px-4"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              overflowY: "visible",
            }}
          >
            {animes.map((anime, index) => (
              <AnimeCard key={anime.id} anime={anime} index={index} showAiring={showAiring} />
            ))}
          </div>
        )}

        {/* Right Arrow */}
        <button
          onClick={() => scroll("right")}
          className={cn(
            "absolute -right-4 top-1/2 -translate-y-1/2 z-[60]",
            "p-2 rounded-full bg-background/90 backdrop-blur-sm border border-border",
            "text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary",
            "transition-all duration-300 hover:scale-110",
            "opacity-0 group-hover/section:opacity-100",
            !canScrollRight && "hidden",
          )}
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Fade Edges */}
        <div
          className={cn(
            "absolute left-0 top-0 bottom-16 w-12 bg-gradient-to-r from-background to-transparent pointer-events-none z-[55]",
            "transition-opacity duration-300",
            canScrollLeft ? "opacity-100" : "opacity-0",
          )}
        />
        <div
          className={cn(
            "absolute right-0 top-0 bottom-16 w-12 bg-gradient-to-l from-background to-transparent pointer-events-none z-[55]",
            "transition-opacity duration-300",
            canScrollRight ? "opacity-100" : "opacity-0",
          )}
        />
      </div>
    </section>
  )
}

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
  showNewBadge?: boolean
  sectionSlug?: string
  hideViewAll?: boolean
  /** Force landscape (16:9) cards for Disney+ style rows */
  cardLayout?: "poster" | "landscape"
}

export function AnimeSection({ title, animes, isLoading, error, showAiring, showNewBadge, sectionSlug, hideViewAll = false, cardLayout = "landscape" }: AnimeSectionProps) {
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
      const cardW = cardLayout === "landscape" ? 320 : 230
      const scrollAmount = direction === "left" ? -(cardW * 3 + 48) : cardW * 3 + 48
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" })
      setTimeout(checkScroll, 300)
    }
  }

  const getSectionHref = () => {
    if (sectionSlug) return sectionSlug
    const titleLower = title.toLowerCase()
    if (titleLower.includes("nouveaut\u00e9") || titleLower.includes("nouveau")) return "/nouveau"
    if (titleLower.includes("populaire")) return "/populaire"
    if (titleLower.includes("simulcast")) return "/simulcast"
    if (titleLower.includes("s\u00e9lection") || titleLower.includes("tendance")) return "/populaire"
    return "#"
  }

  return (
    <section className="relative isolate group/section" style={{ zIndex: 1 }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 group/title">
        <h2
          className={cn(
            "text-base md:text-lg font-semibold text-white/90 tracking-wide",
            !hideViewAll && "hover:underline underline-offset-2 cursor-default"
          )}
        >
          {title}
        </h2>
        {!hideViewAll && (
          <Link
            href={getSectionHref()}
            className="flex items-center gap-0.5 text-xs font-semibold text-[#01b4e4] opacity-0 group-hover/title:opacity-100 transition-opacity duration-200 mt-0.5"
          >
            Voir tout
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* Scroll Container */}
      <div className="relative">
        {/* Left fade + button */}
        <div
          className={cn(
            "absolute left-0 top-0 bottom-4 w-16 bg-gradient-to-r from-[#040404] to-transparent pointer-events-none z-10 transition-opacity duration-200",
            canScrollLeft ? "opacity-100" : "opacity-0"
          )}
        />
        <button
          onClick={() => scroll("left")}
          className={cn(
            "absolute -left-4 top-1/2 -translate-y-1/2 z-20",
            "h-full max-h-[160px] px-2 rounded-sm",
            "bg-black/60 backdrop-blur-sm text-white",
            "hover:bg-black/85 transition-all duration-150",
            "opacity-0 group-hover/section:opacity-100",
            !canScrollLeft && "!opacity-0 pointer-events-none",
          )}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {isLoading && (
          <div className="flex items-center gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={cn(
                  "flex-shrink-0 bg-white/[0.06] rounded-[4px] animate-pulse",
                  cardLayout === "landscape" ? "w-[280px] aspect-video" : "w-[160px] aspect-[2/3]"
                )}
              />
            ))}
          </div>
        )}

        {error && !isLoading && (
          <div className="flex items-center py-10 text-white/40 text-sm">
            Erreur lors du chargement.
          </div>
        )}

        {!isLoading && !error && animes && (
          <div
            ref={scrollRef}
            onScroll={checkScroll}
            className="flex gap-2 overflow-x-auto pb-2"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {animes.map((anime, index) => (
              <AnimeCard
                key={anime.id}
                anime={anime}
                index={index}
                showAiring={showAiring}
                showNewBadge={showNewBadge}
                layout={cardLayout}
              />
            ))}
          </div>
        )}

        {/* Right fade + button */}
        <div
          className={cn(
            "absolute right-0 top-0 bottom-4 w-16 bg-gradient-to-l from-[#040404] to-transparent pointer-events-none z-10 transition-opacity duration-200",
            canScrollRight ? "opacity-100" : "opacity-0"
          )}
        />
        <button
          onClick={() => scroll("right")}
          className={cn(
            "absolute -right-4 top-1/2 -translate-y-1/2 z-20",
            "h-full max-h-[160px] px-2 rounded-sm",
            "bg-black/60 backdrop-blur-sm text-white",
            "hover:bg-black/85 transition-all duration-150",
            "opacity-0 group-hover/section:opacity-100",
            !canScrollRight && "!opacity-0 pointer-events-none",
          )}
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
    </section>
  )
}

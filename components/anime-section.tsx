"use client"

import { useRef, useState } from "react"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { AnimeCard } from "./anime-card"
import { cn } from "@/lib/utils"
import Link from "next/link"
import type { CombinedAnime } from "@/hooks/use-combined-anime"
import { useI18n } from "@/hooks/use-i18n"

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
  const { t } = useI18n()

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
    <section className="relative z-10 group/section py-4 md:py-5 overflow-visible hover:z-[300]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-1.5 group/title">
        <h2
          className={cn(
            "text-lg md:text-xl font-bold text-white tracking-normal",
            !hideViewAll && "hover:underline underline-offset-2 cursor-default"
          )}
        >
          {title}
        </h2>
        {!hideViewAll && (
          <Link
            href={getSectionHref()}
            className="flex items-center gap-0.5 text-xs font-semibold text-white/52 opacity-0 group-hover/title:opacity-100 transition-opacity duration-200 mt-0.5 hover:text-white"
          >
            {t("sections.viewAll")}
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* Scroll Container */}
      <div className="relative z-20 overflow-visible">
        {/* Left fade + button */}
        <div
          className={cn(
            "absolute left-0 top-0 bottom-16 w-10 bg-gradient-to-r from-black to-transparent pointer-events-none z-10 transition-opacity duration-200",
            canScrollLeft ? "opacity-100" : "opacity-0"
          )}
        />
        <button
          aria-label="Faire défiler vers la gauche"
          onClick={() => scroll("left")}
          className={cn(
            "absolute -left-4 top-[calc(50%-2.5rem)] -translate-y-1/2 z-[320]",
            "h-full px-3 rounded-sm",
            cardLayout === "landscape" ? "max-h-[170px]" : "max-h-[330px]",
            "bg-black/34 text-white",
            "hover:bg-black/58 transition-all duration-150",
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
                  cardLayout === "landscape" ? "w-[300px] aspect-video" : "w-[160px] aspect-[2/3]"
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
            className="relative z-20 flex gap-3 overflow-x-auto px-8 pt-8 pb-28 -mx-8 -my-6"
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
            "absolute right-0 top-0 bottom-16 w-10 bg-gradient-to-l from-black to-transparent pointer-events-none z-10 transition-opacity duration-200",
            canScrollRight ? "opacity-100" : "opacity-0"
          )}
        />
        <button
          aria-label="Faire défiler vers la droite"
          onClick={() => scroll("right")}
          className={cn(
            "absolute -right-4 top-[calc(50%-2.5rem)] -translate-y-1/2 z-[320]",
            "h-full px-3 rounded-sm",
            cardLayout === "landscape" ? "max-h-[170px]" : "max-h-[330px]",
            "bg-black/34 text-white",
            "hover:bg-black/58 transition-all duration-150",
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

"use client"

import { useRef, useState, useEffect } from "react"
import { ChevronLeft, ChevronRight, Play, X, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useWatchHistory, useCrunchyrollAccount } from "@/hooks/use-crunchyroll"
import type { TransformedWatchlistItem } from "@/lib/crunchyroll"
import Link from "next/link"

export function ContinueWatching() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const { data: account } = useCrunchyrollAccount()
  const { data: historyItems, isLoading } = useWatchHistory(account?.account_id || null, {
    page_size: 20
  })

  // Filter out items that are fully watched or have very little progress if desired
  // For now, just show what API returns but ensuring meaningful playhead
  const items = historyItems?.filter(item => item.playhead > 0) || []

  // Update scroll buttons
  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
      setCanScrollLeft(scrollLeft > 0)
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
    }
  }

  useEffect(() => {
    checkScroll()
    window.addEventListener("resize", checkScroll)
    return () => window.removeEventListener("resize", checkScroll)
  }, [items])

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = direction === "left" ? -400 : 400
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" })
      setTimeout(checkScroll, 300)
    }
  }

  if (isLoading) {
    return (
      <section className="mt-8 pt-8">
        <div className="h-8 w-48 bg-secondary/50 rounded-lg animate-pulse mb-5" />
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-[280px] md:w-[320px] aspect-video bg-secondary/30 rounded-xl animate-pulse flex-shrink-0" />
          ))}
        </div>
      </section>
    )
  }

  if (items.length === 0) {
    return null
  }

  return (
    <section className="relative isolate group/section mt-8 pt-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl md:text-2xl font-bold text-foreground">Reprendre</h2>
        <Link
          href="/historique"
          className="text-sm font-medium text-primary hover:text-primary/80 transition-colors duration-300 flex items-center gap-1"
        >
          Voir l'historique
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

        {/* Cards */}
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex gap-4 overflow-x-auto overflow-y-visible scrollbar-hide pb-12 pt-2 -mx-4 px-4"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {items.map((item, index) => (
            <ContinueWatchingCard key={item.crunchyrollId || index} item={item} index={index} />
          ))}
        </div>

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
      </div>
    </section>
  )
}

interface ContinueWatchingCardProps {
  item: TransformedWatchlistItem
  index: number
}

function ContinueWatchingCard({ item, index }: ContinueWatchingCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [imageError, setImageError] = useState(false)

  // Calculate progress
  const durationSec = (item.durationMs || 0) / 1000
  const progress = durationSec > 0 ? (item.playhead / durationSec) * 100 : 0
  const remainingSec = Math.max(0, durationSec - item.playhead)
  const remainingMin = Math.ceil(remainingSec / 60)

  // Episode label
  const episodeLabel = item.currentEpisode
    ? `E${item.currentEpisode}`
    : (item.type === 'Movie' ? 'Film' : '')

  return (
    <Link
      href={`/watch/${item.crunchyrollId}`}
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
          isHovered && "scale-105 shadow-2xl shadow-primary/20",
        )}
      >
        {/* Image */}
        <img
          src={imageError ? "/placeholder.svg?height=180&width=320&query=anime" : (item.image || "/placeholder.svg")}
          alt={item.title}
          className={cn(
            "w-full h-full object-cover",
            "transition-transform duration-700 ease-out",
            isHovered && "scale-110",
          )}
          onError={() => setImageError(true)}
        />

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />

        {/* Play Button */}
        <div className={cn("absolute inset-0 flex items-center justify-center", "transition-all duration-300")}>
          <div
            className={cn(
              "p-4 rounded-full bg-background/80 backdrop-blur-sm text-foreground",
              "transition-all duration-300",
              "group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-110",
              "border border-border/50",
              isHovered ? "scale-100 opacity-100" : "scale-90 opacity-70",
            )}
          >
            <Play className="w-6 h-6" fill="currentColor" />
          </div>
        </div>

        {/* Remaining Time */}
        <div className="absolute bottom-12 right-3 px-2 py-1 rounded bg-background/80 backdrop-blur-sm">
          <span className="text-xs font-medium text-foreground">{remainingMin}m restantes</span>
        </div>

        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted/30">
          <div
            className="h-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      </div>

      {/* Info */}
      <div className="mt-3 px-1">
        <h3
          className={cn(
            "font-semibold text-sm text-foreground line-clamp-1",
            "transition-colors duration-300",
            isHovered && "text-primary",
          )}
        >
          {item.seriesTitle || item.title}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
          {episodeLabel ? `${episodeLabel} - ` : ''}{item.currentEpisodeTitle || item.title}
        </p>
      </div>
    </Link>
  )
}

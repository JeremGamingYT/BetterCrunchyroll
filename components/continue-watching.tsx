"use client"

import { useRef, useState } from "react"
import { ChevronLeft, ChevronRight, Play, X } from "lucide-react"
import { cn } from "@/lib/utils"

const continueWatchingItems = [
  {
    id: 1,
    title: "Solo Leveling",
    episode: "E12",
    progress: 75,
    remaining: "19m",
    image: "/placeholder.svg?height=200&width=350",
  },
  {
    id: 2,
    title: "Frieren",
    episode: "E24",
    progress: 45,
    remaining: "21m",
    image: "/placeholder.svg?height=200&width=350",
  },
  {
    id: 3,
    title: "Demon Slayer",
    episode: "E8",
    progress: 90,
    remaining: "3m",
    image: "/placeholder.svg?height=200&width=350",
  },
  {
    id: 4,
    title: "Jujutsu Kaisen",
    episode: "E47",
    progress: 30,
    remaining: "23m",
    image: "/placeholder.svg?height=200&width=350",
  },
  {
    id: 5,
    title: "My Hero Academia",
    episode: "E138",
    progress: 60,
    remaining: "12m",
    image: "/placeholder.svg?height=200&width=350",
  },
  {
    id: 6,
    title: "One Piece",
    episode: "E1102",
    progress: 25,
    remaining: "20m",
    image: "/placeholder.svg?height=200&width=350",
  },
]

export function ContinueWatching() {
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

  return (
    <section className="relative isolate group/section mt-8 pt-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl md:text-2xl font-bold text-foreground">Reprendre</h2>
        <a
          href="#"
          className="text-sm font-medium text-primary hover:text-primary/80 transition-colors duration-300 flex items-center gap-1"
        >
          Voir l'historique
          <ChevronRight className="w-4 h-4" />
        </a>
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
          {continueWatchingItems.map((item, index) => (
            <ContinueWatchingCard key={item.id} item={item} index={index} />
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
  item: {
    id: number
    title: string
    episode: string
    progress: number
    remaining: string
    image: string
  }
  index: number
}

function ContinueWatchingCard({ item, index }: ContinueWatchingCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
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
          src={item.image || "/placeholder.svg"}
          alt={item.title}
          className={cn(
            "w-full h-full object-cover",
            "transition-transform duration-700 ease-out",
            isHovered && "scale-110",
          )}
        />

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />

        {/* Play Button */}
        <div className={cn("absolute inset-0 flex items-center justify-center", "transition-all duration-300")}>
          <button
            className={cn(
              "p-4 rounded-full bg-background/80 backdrop-blur-sm text-foreground",
              "transition-all duration-300",
              "hover:bg-primary hover:text-primary-foreground hover:scale-110",
              "border border-border/50",
              isHovered ? "scale-100 opacity-100" : "scale-90 opacity-70",
            )}
          >
            <Play className="w-6 h-6" fill="currentColor" />
          </button>
        </div>

        {/* Remove Button */}
        <button
          className={cn(
            "absolute top-2 right-2 p-1.5 rounded-full",
            "bg-background/60 backdrop-blur-sm text-muted-foreground",
            "hover:bg-destructive hover:text-destructive-foreground",
            "transition-all duration-300",
            isHovered ? "opacity-100" : "opacity-0",
          )}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Remaining Time */}
        <div className="absolute bottom-12 right-3 px-2 py-1 rounded bg-background/80 backdrop-blur-sm">
          <span className="text-xs font-medium text-foreground">{item.remaining} restantes</span>
        </div>

        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted">
          <div className="h-full bg-primary transition-all duration-300" style={{ width: `${item.progress}%` }} />
        </div>
      </div>

      {/* Info */}
      <div className="mt-3 px-1">
        <h3
          className={cn(
            "font-semibold text-sm text-foreground",
            "transition-colors duration-300",
            isHovered && "text-primary",
          )}
        >
          {item.title}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">{item.episode}</p>
      </div>
    </div>
  )
}

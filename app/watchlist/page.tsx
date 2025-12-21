"use client"

import { useState, useEffect, useMemo } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { AnimeCard } from "@/components/anime-card"
import { cn } from "@/lib/utils"
import { Loader2, Bookmark, Grid, List, Trash2, Plus } from "lucide-react"
import Link from "next/link"
import type { TransformedAnime } from "@/lib/anilist"

type ViewMode = "grid" | "list"
type FilterStatus = "all" | "watching" | "completed" | "plan_to_watch" | "dropped"

const STATUS_LABELS: Record<FilterStatus, string> = {
  all: "Tous",
  watching: "En cours",
  completed: "Terminés",
  plan_to_watch: "À voir",
  dropped: "Abandonnés",
}

interface WatchlistItem extends TransformedAnime {
  status: FilterStatus
  addedAt: number
  progress?: number
}

export default function WatchlistPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all")
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  // Load watchlist from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("crunchyroll_watchlist")
    if (stored) {
      try {
        setWatchlist(JSON.parse(stored))
      } catch {
        setWatchlist([])
      }
    }
    setIsLoading(false)
  }, [])

  // Filter watchlist
  const filteredWatchlist = useMemo(() => {
    if (filterStatus === "all") return watchlist
    return watchlist.filter((item) => item.status === filterStatus)
  }, [watchlist, filterStatus])

  // Count by status
  const statusCounts = useMemo(() => {
    const counts: Record<FilterStatus, number> = {
      all: watchlist.length,
      watching: 0,
      completed: 0,
      plan_to_watch: 0,
      dropped: 0,
    }
    watchlist.forEach((item) => {
      if (item.status !== "all") {
        counts[item.status]++
      }
    })
    return counts
  }, [watchlist])

  // Remove from watchlist
  const removeFromWatchlist = (id: number) => {
    const updated = watchlist.filter((item) => item.id !== id)
    setWatchlist(updated)
    localStorage.setItem("crunchyroll_watchlist", JSON.stringify(updated))
  }

  return (
    <main className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="relative pt-16">
        <div className="h-[300px] bg-gradient-to-br from-primary/20 via-background to-background relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
          <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
              <Bookmark className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4">Ma Watchlist</h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Gérez votre liste d'anime à regarder. Organisez vos séries par statut et suivez votre progression.
            </p>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="px-4 md:px-8 lg:px-12 py-8 border-b border-border">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Status Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {(Object.keys(STATUS_LABELS) as FilterStatus[]).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  filterStatus === status
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground",
                )}
              >
                {STATUS_LABELS[status]}
                <span
                  className={cn(
                    "px-1.5 py-0.5 text-xs rounded-full",
                    filterStatus === status ? "bg-primary-foreground/20" : "bg-background",
                  )}
                >
                  {statusCounts[status]}
                </span>
              </button>
            ))}
          </div>

          {/* View Mode */}
          <div className="flex items-center bg-secondary rounded-lg p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                viewMode === "grid"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Grid className="w-4 h-4" />
              Grille
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                viewMode === "list"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <List className="w-4 h-4" />
              Liste
            </button>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="px-4 md:px-8 lg:px-12 py-8 pb-16">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
          </div>
        ) : filteredWatchlist.length === 0 ? (
          <div className="text-center py-20">
            <Bookmark className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              {filterStatus === "all" ? "Votre watchlist est vide" : `Aucun anime "${STATUS_LABELS[filterStatus]}"`}
            </h2>
            <p className="text-muted-foreground mb-6">
              {filterStatus === "all"
                ? "Commencez à ajouter des anime pour les retrouver ici."
                : "Changez le statut d'un anime pour le voir apparaître ici."}
            </p>
            <Link
              href="/populaire"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Découvrir des anime
            </Link>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-8">
            {filteredWatchlist.map((anime, index) => (
              <div key={anime.id} className="relative group">
                <AnimeCard anime={anime} index={index} />
                <button
                  onClick={() => removeFromWatchlist(anime.id)}
                  className="absolute top-2 right-2 p-2 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-destructive/90"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredWatchlist.map((anime) => (
              <WatchlistListItem key={anime.id} anime={anime} onRemove={() => removeFromWatchlist(anime.id)} />
            ))}
          </div>
        )}
      </section>

      <Footer />
    </main>
  )
}

function WatchlistListItem({
  anime,
  onRemove,
}: {
  anime: WatchlistItem
  onRemove: () => void
}) {
  const [imageError, setImageError] = useState(false)

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary/50 transition-all duration-300 group">
      {/* Image */}
      <Link href={`/anime/${anime.id}`} className="w-16 h-24 rounded-lg overflow-hidden flex-shrink-0">
        <img
          src={imageError ? "/placeholder.svg?height=96&width=64&query=anime" : anime.image}
          alt={anime.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={() => setImageError(true)}
        />
      </Link>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <Link href={`/anime/${anime.id}`}>
          <h3 className="font-semibold text-foreground line-clamp-1 hover:text-primary transition-colors">
            {anime.title}
          </h3>
        </Link>
        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
          {anime.year && <span>{anime.year}</span>}
          {anime.studio && (
            <>
              <span>•</span>
              <span>{anime.studio}</span>
            </>
          )}
          {anime.episodes && (
            <>
              <span>•</span>
              <span>{anime.episodes} épisodes</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 mt-2">
          {anime.genres.slice(0, 3).map((genre) => (
            <span key={genre} className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
              {genre}
            </span>
          ))}
        </div>
      </div>

      {/* Score */}
      {anime.score && (
        <div className="text-right">
          <div className="flex items-center gap-1">
            <span className="text-primary">★</span>
            <span className="font-semibold text-foreground">{anime.score.toFixed(1)}</span>
          </div>
        </div>
      )}

      {/* Status Badge */}
      <span
        className={cn(
          "px-3 py-1 rounded-full text-xs font-medium",
          anime.status === "watching" && "bg-green-500/20 text-green-500",
          anime.status === "completed" && "bg-blue-500/20 text-blue-500",
          anime.status === "plan_to_watch" && "bg-yellow-500/20 text-yellow-500",
          anime.status === "dropped" && "bg-red-500/20 text-red-500",
        )}
      >
        {STATUS_LABELS[anime.status]}
      </span>

      {/* Remove Button */}
      <button
        onClick={onRemove}
        className="p-2 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
      >
        <Trash2 className="w-5 h-5" />
      </button>
    </div>
  )
}

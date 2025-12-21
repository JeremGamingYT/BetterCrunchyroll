"use client"

import { useState, useMemo } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { AnimeCard } from "@/components/anime-card"
import { useAiringSchedule, useSimulcastAnime } from "@/hooks/use-anilist"
import { cn } from "@/lib/utils"
import { Loader2, Calendar, Clock, Filter, Grid } from "lucide-react"
import type { TransformedAnime } from "@/lib/anilist"

type ViewMode = "grid" | "schedule"
type DayFilter = "all" | "today" | "tomorrow" | "week"

const DAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"]

export default function SimulcastPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("grid")
  const [dayFilter, setDayFilter] = useState<DayFilter>("all")
  const [showCrunchyrollOnly, setShowCrunchyrollOnly] = useState(false)

  const { data: airingAnimes, isLoading: loadingAiring } = useAiringSchedule(1, 100)
  const { data: simulcastAnimes, isLoading: loadingSimulcast } = useSimulcastAnime(1, 100)

  const isLoading = loadingAiring || loadingSimulcast

  // Get current season info
  const seasonInfo = useMemo(() => {
    const now = new Date()
    const month = now.getMonth()
    const year = now.getFullYear()

    let season: string
    if (month >= 0 && month <= 2) season = "Hiver"
    else if (month >= 3 && month <= 5) season = "Printemps"
    else if (month >= 6 && month <= 8) season = "Été"
    else season = "Automne"

    return { season, year }
  }, [])

  // Filter and organize animes
  const filteredAnimes = useMemo(() => {
    const animes = viewMode === "schedule" ? airingAnimes : simulcastAnimes
    if (!animes) return []

    let filtered = [...animes]

    // Filter by Crunchyroll
    if (showCrunchyrollOnly) {
      filtered = filtered.filter((a) => a.isCrunchyroll)
    }

    // Filter by day
    if (dayFilter !== "all" && viewMode === "schedule") {
      const now = new Date()
      const today = now.getDay()

      filtered = filtered.filter((anime) => {
        if (!anime.nextEpisode) return false
        const airingDate = new Date(anime.nextEpisode.airingAt)
        const airingDay = airingDate.getDay()

        switch (dayFilter) {
          case "today":
            return airingDay === today
          case "tomorrow":
            return airingDay === (today + 1) % 7
          case "week":
            return true
          default:
            return true
        }
      })
    }

    return filtered
  }, [airingAnimes, simulcastAnimes, viewMode, dayFilter, showCrunchyrollOnly])

  // Group by day for schedule view
  const animesByDay = useMemo(() => {
    if (viewMode !== "schedule") return null

    const grouped: Record<number, TransformedAnime[]> = {}

    for (const anime of filteredAnimes) {
      if (!anime.nextEpisode) continue
      const airingDate = new Date(anime.nextEpisode.airingAt)
      const day = airingDate.getDay()
      if (!grouped[day]) grouped[day] = []
      grouped[day].push(anime)
    }

    // Sort each day by airing time
    for (const day in grouped) {
      grouped[day].sort((a, b) => {
        const timeA = a.nextEpisode?.airingAt || 0
        const timeB = b.nextEpisode?.airingAt || 0
        return timeA - timeB
      })
    }

    return grouped
  }, [filteredAnimes, viewMode])

  // Get ordered days starting from today
  const orderedDays = useMemo(() => {
    const today = new Date().getDay()
    const days = []
    for (let i = 0; i < 7; i++) {
      days.push((today + i) % 7)
    }
    return days
  }, [])

  return (
    <main className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="relative pt-16">
        <div className="h-[300px] bg-gradient-to-br from-primary/20 via-background to-background relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
          <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4">
              Simulcast {seasonInfo.season} {seasonInfo.year}
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Découvrez tous les anime diffusés cette saison. Nouveaux épisodes disponibles peu après leur diffusion au
              Japon.
            </p>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="px-4 md:px-8 lg:px-12 py-8 border-b border-border">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Left Filters */}
          <div className="flex flex-wrap items-center gap-3">
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
                onClick={() => setViewMode("schedule")}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                  viewMode === "schedule"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Calendar className="w-4 h-4" />
                Calendrier
              </button>
            </div>

            {/* Day Filter (only for schedule view) */}
            {viewMode === "schedule" && (
              <div className="flex items-center gap-2">
                {(["all", "today", "tomorrow", "week"] as DayFilter[]).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setDayFilter(filter)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                      dayFilter === filter
                        ? "bg-primary/20 text-primary border border-primary/50"
                        : "bg-secondary text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {filter === "all" && "Tous"}
                    {filter === "today" && "Aujourd'hui"}
                    {filter === "tomorrow" && "Demain"}
                    {filter === "week" && "Cette semaine"}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Filters */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCrunchyrollOnly(!showCrunchyrollOnly)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                showCrunchyrollOnly
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground",
              )}
            >
              <Filter className="w-4 h-4" />
              Crunchyroll uniquement
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
          <span>
            {filteredAnimes.length} anime{filteredAnimes.length > 1 ? "s" : ""}
          </span>
          {showCrunchyrollOnly && <span className="text-primary">• Filtre Crunchyroll actif</span>}
        </div>
      </section>

      {/* Content */}
      <section className="px-4 md:px-8 lg:px-12 py-8 pb-16">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
          </div>
        ) : viewMode === "grid" ? (
          /* Grid View - Added relative and proper spacing for hover */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-8">
            {filteredAnimes.map((anime, index) => (
              <AnimeCard key={anime.id} anime={anime} index={index} showAiring />
            ))}
          </div>
        ) : (
          /* Schedule View */
          <div className="space-y-8">
            {orderedDays.map((dayIndex) => {
              const dayAnimes = animesByDay?.[dayIndex]
              if (!dayAnimes || dayAnimes.length === 0) return null

              const isToday = dayIndex === new Date().getDay()

              return (
                <div key={dayIndex} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <h2 className={cn("text-xl font-bold", isToday ? "text-primary" : "text-foreground")}>
                      {DAYS[dayIndex]}
                      {isToday && <span className="ml-2 text-sm font-normal text-primary">(Aujourd'hui)</span>}
                    </h2>
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-sm text-muted-foreground">
                      {dayAnimes.length} anime{dayAnimes.length > 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="grid gap-3">
                    {dayAnimes.map((anime) => (
                      <ScheduleCard key={anime.id} anime={anime} />
                    ))}
                  </div>
                </div>
              )
            })}

            {filteredAnimes.length === 0 && (
              <div className="text-center py-20 text-muted-foreground">Aucun anime trouvé avec ces filtres.</div>
            )}
          </div>
        )}
      </section>

      <Footer />
    </main>
  )
}

// Schedule Card Component
function ScheduleCard({ anime }: { anime: TransformedAnime }) {
  const [imageError, setImageError] = useState(false)

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatTimeUntil = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)

    if (hours > 24) {
      const days = Math.floor(hours / 24)
      return `Dans ${days}j ${hours % 24}h`
    }
    if (hours > 0) return `Dans ${hours}h ${minutes}m`
    return `Dans ${minutes}m`
  }

  const isAiringSoon = anime.nextEpisode && anime.nextEpisode.timeUntilAiring < 3600

  return (
    <div
      className={cn(
        "flex items-center gap-4 p-4 rounded-xl bg-card border border-border",
        "hover:border-primary/50 transition-all duration-300",
        isAiringSoon && "border-green-500/50 bg-green-500/5",
      )}
    >
      {/* Time */}
      <div className="flex flex-col items-center min-w-[60px]">
        <Clock className={cn("w-5 h-5 mb-1", isAiringSoon ? "text-green-500" : "text-muted-foreground")} />
        <span className={cn("text-lg font-bold", isAiringSoon ? "text-green-500" : "text-foreground")}>
          {anime.nextEpisode ? formatTime(anime.nextEpisode.airingAt) : "--:--"}
        </span>
      </div>

      {/* Image */}
      <div className="w-16 h-24 rounded-lg overflow-hidden flex-shrink-0">
        <img
          src={imageError ? "/placeholder.svg?height=96&width=64&query=anime" : anime.image}
          alt={anime.title}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-foreground line-clamp-1">{anime.title}</h3>
        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
          <span>Épisode {anime.nextEpisode?.episode || "?"}</span>
          {anime.studio && (
            <>
              <span>•</span>
              <span>{anime.studio}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 mt-2">
          {anime.genres.slice(0, 2).map((genre) => (
            <span key={genre} className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
              {genre}
            </span>
          ))}
          {anime.isCrunchyroll && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">Crunchyroll</span>
          )}
        </div>
      </div>

      {/* Time Until */}
      <div className="text-right">
        <span className={cn("text-sm font-medium", isAiringSoon ? "text-green-500" : "text-muted-foreground")}>
          {anime.nextEpisode ? formatTimeUntil(anime.nextEpisode.timeUntilAiring) : "N/A"}
        </span>
        {anime.score && (
          <div className="flex items-center justify-end gap-1 mt-1">
            <span className="text-xs text-primary">★</span>
            <span className="text-xs text-muted-foreground">{anime.score.toFixed(1)}</span>
          </div>
        )}
      </div>
    </div>
  )
}

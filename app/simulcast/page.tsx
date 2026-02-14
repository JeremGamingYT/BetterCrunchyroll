"use client"

import { useState, useMemo } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { AnimeCard } from "@/components/anime-card"
import { LoadingScreen, useInitialLoading } from "@/components/loading-screen"
import { useAiringSchedule, useSimulcastAnime, type CombinedAnime } from "@/hooks/use-combined-anime"
import { cn } from "@/lib/utils"
import { Calendar, Clock, Filter, Grid } from "lucide-react"

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
  const showInitialLoading = useInitialLoading([loadingAiring, loadingSimulcast])

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

    const grouped: Record<number, CombinedAnime[]> = {}

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
    <>
      <LoadingScreen isLoading={showInitialLoading} message="Chargement du calendrier..." />
      <main className="min-h-screen bg-background">
        <Header />

        {/* Hero Section - Enhanced with Premium Design */}
        <section className="relative pt-32 pb-16 overflow-hidden">
          {/* Dynamic Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/40 via-background to-background" />
          
          {/* Animated blob effects */}
          <div className="absolute -top-64 -right-64 w-96 h-96 bg-primary rounded-full mix-blend-soft-light filter blur-3xl opacity-20 animate-blob" />
          <div className="absolute -bottom-64 -left-64 w-96 h-96 bg-blue-600 rounded-full mix-blend-soft-light filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
          <div className="absolute top-1/2 right-1/4 w-80 h-80 bg-purple-600 rounded-full mix-blend-overlay filter blur-3xl opacity-10 animate-blob animation-delay-4000" />

          {/* Content */}
          <div className="relative z-10 px-4 md:px-8 lg:px-12 text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-3 mb-6 px-4 py-2 bg-primary/20 border border-primary/50 rounded-full backdrop-blur-sm">
              <Calendar className="w-5 h-5 text-primary" />
              <span className="text-xs md:text-sm font-black text-primary uppercase tracking-widest">
                Saison en Direct
              </span>
            </div>

            {/* Main Title */}
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-foreground mb-4 font-bangers tracking-wider drop-shadow-lg">
              {seasonInfo.season} {seasonInfo.year}
            </h1>

            {/* Subtitle */}
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed mb-8 font-medium">
              Découvrez tous les anime en simulcast cette saison. Nouveaux épisodes disponibles peu après leur diffusion au Japon directement sur Crunchyroll.
            </p>

            {/* Stats Row */}
            <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8">
              <div className="px-6 py-3 bg-card/50 backdrop-blur-sm border border-primary/30 rounded-xl">
                <div className="text-2xl md:text-3xl font-black text-primary">{filteredAnimes.length}</div>
                <div className="text-xs md:text-sm text-muted-foreground uppercase tracking-wider">Anime à venir</div>
              </div>
              <div className="px-6 py-3 bg-card/50 backdrop-blur-sm border border-primary/30 rounded-xl">
                <div className="text-2xl md:text-3xl font-black text-primary">
                  {filteredAnimes.filter((a) => a.isCrunchyroll).length}
                </div>
                <div className="text-xs md:text-sm text-muted-foreground uppercase tracking-wider">Sur Crunchyroll</div>
              </div>
            </div>
          </div>
        </section>

        {/* Filters Section - Premium Design */}
        <section className="px-4 md:px-8 lg:px-12 py-8 border-b border-border/50 relative z-20">
          <div className="max-w-7xl mx-auto">
            {/* Filters Row */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-6">
              {/* Left - View & Day Filters */}
              <div className="flex flex-wrap items-center gap-4">
                {/* View Mode Toggle - Premium Style */}
                <div className="flex items-center bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-1.5 shadow-sm hover:shadow-md transition-all duration-300">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 uppercase tracking-wider",
                      viewMode === "grid"
                        ? "bg-gradient-to-r from-primary to-orange-500 text-primary-foreground shadow-lg scale-105"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Grid className="w-4 h-4" />
                    Grille
                  </button>
                  <button
                    onClick={() => setViewMode("schedule")}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 uppercase tracking-wider",
                      viewMode === "schedule"
                        ? "bg-gradient-to-r from-primary to-orange-500 text-primary-foreground shadow-lg scale-105"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Calendar className="w-4 h-4" />
                    Calendrier
                  </button>
                </div>

                {/* Day Filter - Only for schedule view */}
                {viewMode === "schedule" && (
                  <div className="flex items-center gap-2">
                    {(["all", "today", "tomorrow", "week"] as DayFilter[]).map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setDayFilter(filter)}
                        className={cn(
                          "px-4 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 uppercase tracking-wider",
                          dayFilter === filter
                            ? "bg-gradient-to-r from-primary/30 to-primary/20 text-primary border border-primary/50 shadow-md scale-105"
                            : "bg-card/50 backdrop-blur-sm border border-border/50 text-muted-foreground hover:text-foreground hover:bg-card/70",
                        )}
                      >
                        {filter === "all" && "Tous"}
                        {filter === "today" && "Auj."}
                        {filter === "tomorrow" && "Dem."}
                        {filter === "week" && "Semaine"}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Right - Filter Button */}
              <button
                onClick={() => setShowCrunchyrollOnly(!showCrunchyrollOnly)}
                className={cn(
                  "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 border uppercase tracking-wider shadow-sm hover:shadow-md",
                  showCrunchyrollOnly
                    ? "bg-gradient-to-r from-primary/20 to-primary/10 text-primary border-primary/50 shadow-md"
                    : "bg-card/50 backdrop-blur-sm border-border/50 text-muted-foreground hover:text-foreground hover:bg-card/70",
                )}
              >
                <Filter className="w-4 h-4" />
                Crunchyroll uniquement
              </button>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Stats Card */}
              <div className="flex items-center gap-3 p-4 bg-card/50 backdrop-blur-sm border border-primary/20 rounded-xl hover:border-primary/40 transition-all duration-300">
                <div className="p-3 bg-primary/20 rounded-lg">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="text-sm font-bold text-foreground">
                    {filteredAnimes.length} anime{filteredAnimes.length > 1 ? "s" : ""} trouvé{filteredAnimes.length > 1 ? "s" : ""}
                  </div>
                  <div className="text-xs text-muted-foreground">Anime en simulcast</div>
                </div>
              </div>

              {/* Filter Info Card */}
              {showCrunchyrollOnly && (
                <div className="flex items-center gap-3 p-4 bg-green-500/10 backdrop-blur-sm border border-green-500/30 rounded-xl hover:border-green-500/50 transition-all duration-300">
                  <div className="p-3 bg-green-500/20 rounded-lg">
                    <Filter className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-green-500">
                      🎯 Crunchyroll uniquement
                    </div>
                    <div className="text-xs text-green-500/70">Filtre actif</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="px-4 md:px-8 lg:px-12 py-12 pb-16">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4 mx-auto" />
                <p className="text-muted-foreground">Chargement des anime du simulcast...</p>
              </div>
            </div>
          ) : viewMode === "grid" ? (
            /* Grid View - Enhanced with better spacing */
            <div className="space-y-8">
              {filteredAnimes.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-8">
                  {filteredAnimes.map((anime, index) => (
                    <AnimeCard key={anime.id} anime={anime} index={index} showAiring />
                  ))}
                </div>
              ) : (
                <div className="text-center py-20">
                  <div className="mb-4 text-5xl">🔍</div>
                  <h3 className="text-xl font-bold text-foreground mb-2">Aucun anime trouvé</h3>
                  <p className="text-muted-foreground">Essayez d'ajuster vos filtres</p>
                </div>
              )}
            </div>
          ) : (
            /* Schedule View - Enhanced */
            <div className="space-y-8">
              {filteredAnimes.length > 0 ? (
                orderedDays.map((dayIndex) => {
                  const dayAnimes = animesByDay?.[dayIndex]
                  if (!dayAnimes || dayAnimes.length === 0) return null

                  const isToday = dayIndex === new Date().getDay()

                  return (
                    <div key={dayIndex} className="space-y-4">
                      <div className="flex items-center gap-3 px-4 py-3 bg-card border border-border/50 rounded-lg">
                        <h2
                          className={cn(
                            "text-lg font-bold",
                            isToday ? "text-primary" : "text-foreground"
                          )}
                        >
                          {DAYS[dayIndex]}
                          {isToday && (
                            <span className="ml-2 text-xs font-normal text-primary bg-primary/10 px-2 py-1 rounded">
                              Aujourd'hui
                            </span>
                          )}
                        </h2>
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-xs font-medium text-muted-foreground bg-muted/30 px-3 py-1 rounded-full">
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
                })
              ) : (
                <div className="text-center py-20">
                  <div className="mb-4 text-5xl">📅</div>
                  <h3 className="text-xl font-bold text-foreground mb-2">Aucun anime trouvé</h3>
                  <p className="text-muted-foreground">Essayez d'ajuster vos filtres</p>
                </div>
              )}
            </div>
          )}
        </section>

        <Footer />
      </main>
    </>
  )
}

// Schedule Card Component
function ScheduleCard({ anime }: { anime: CombinedAnime }) {
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
          {anime.genres.slice(0, 2).map((genre: string) => (
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

"use client"

import { useParams } from "next/navigation"
import { useState, useEffect, useRef } from "react"
import {
  Star,
  Clock,
  Play,
  Bookmark,
  Share2,
  ExternalLink,
  TrendingUp,
  Film,
  Globe,
} from "lucide-react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { AnimeCard } from "@/components/anime-card"
import { EpisodeGrid, FallbackEpisodeGrid } from "@/components/episode-grid"
import { LoadingScreen } from "@/components/loading-screen"
import { useAnimeDetails } from "@/hooks/use-combined-anime"
import { cn } from "@/lib/utils"

export default function AnimePage() {
  const params = useParams()
  const id = params?.id ? Number(params.id) : null
  const { anime, isLoading, error } = useAnimeDetails(id)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [activeTab, setActiveTab] = useState<"overview" | "characters" | "related" | "episodes">("overview")

  useEffect(() => {
    console.log("[v0] AnimePage - id:", id)
    console.log("[v0] AnimePage - isLoading:", isLoading)
    console.log("[v0] AnimePage - error:", error)
    console.log("[v0] AnimePage - anime:", anime)
  }, [id, isLoading, error, anime])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" })
  }, [id])



  if (!id) {
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">Anime non trouvé</h1>
            <p className="text-muted-foreground">ID d'anime invalide.</p>
          </div>
        </div>
      </main>
    )
  }

  if (isLoading) {
    return <LoadingScreen isLoading={true} message="Chargement des détails..." />
  }

  if (error || !anime) {
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">Anime non trouvé</h1>
            <p className="text-muted-foreground">Impossible de charger les détails de cet anime.</p>
            {error && <p className="text-sm text-muted-foreground mt-2">Détail: {error?.message || String(error)}</p>}
          </div>
        </div>
      </main>
    )
  }

  const accentColor = anime.color || "hsl(var(--primary))"
  const crunchyrollLink = anime.externalLinks?.find(
    (link) => link.site.toLowerCase() === "crunchyroll" || link.url.includes("crunchyroll"),
  )

  const tabs = [
    { id: "overview", label: "Aperçu" },
    { id: "characters", label: "Personnages" },
    { id: "related", label: "Associés" },
    { id: "episodes", label: "Épisodes" },
  ]

  return (
    <main className="min-h-screen bg-background overflow-x-hidden">
      <Header />

      {/* Hero Section with Banner */}
      <div className="relative">
        {/* Banner Background */}
        <div className="absolute inset-0 h-[500px] md:h-[600px]">
          <img src={anime.bannerImage || anime.image} alt={anime.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/30" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-transparent" />
          {/* Color overlay */}
          <div className="absolute inset-0 opacity-30 mix-blend-overlay" style={{ backgroundColor: accentColor }} />
        </div>

        {/* Content */}
        <div className="relative container mx-auto px-4 pt-24 md:pt-32 pb-8">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Poster */}
            <div className="flex-shrink-0 mx-auto md:mx-0">
              <div
                className="relative w-[200px] md:w-[260px] rounded-xl overflow-hidden shadow-2xl"
                style={{ boxShadow: `0 25px 50px -12px ${accentColor}50` }}
              >
                <img
                  src={anime.image || "/placeholder.svg"}
                  alt={anime.title}
                  className="w-full aspect-[2/3] object-cover"
                />
                {/* Glow effect */}
                <div className="absolute inset-0 rounded-xl border-2" style={{ borderColor: `${accentColor}40` }} />
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 flex flex-col justify-end">
              {/* Stats Row */}
              <div className="flex flex-wrap items-center gap-4 mb-4">
                {anime.score && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/60 backdrop-blur-sm">
                    <Star className="w-4 h-4" style={{ color: accentColor }} fill={accentColor} />
                    <span className="font-bold">{anime.score.toFixed(1)}</span>
                  </div>
                )}
                {anime.episodes && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/60 backdrop-blur-sm">
                    <Film className="w-4 h-4 text-muted-foreground" />
                    <span>{anime.episodes} épisodes</span>
                  </div>
                )}
                {anime.duration && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/60 backdrop-blur-sm">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>{anime.duration} min</span>
                  </div>
                )}
                {anime.popularity && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/60 backdrop-blur-sm">
                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                    <span>#{anime.popularity.toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Title */}
              <h1 className="text-3xl md:text-5xl font-bold mb-2 text-balance" style={{ color: accentColor }}>
                {anime.title}
              </h1>
              {anime.titleRomaji !== anime.title && (
                <p className="text-lg text-muted-foreground mb-1">{anime.titleRomaji}</p>
              )}
              {anime.titleNative && <p className="text-base text-muted-foreground/70 mb-4">{anime.titleNative}</p>}

              {/* Genres */}
              <div className="flex flex-wrap gap-2 mb-6">
                {anime.genres?.map((genre) => (
                  <span
                    key={genre}
                    className="px-3 py-1 rounded-full text-sm font-medium transition-colors"
                    style={{
                      backgroundColor: `${accentColor}20`,
                      color: accentColor,
                      border: `1px solid ${accentColor}40`,
                    }}
                  >
                    {genre}
                  </span>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                {crunchyrollLink ? (
                  <a
                    href={crunchyrollLink.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white transition-all hover:scale-105"
                    style={{ backgroundColor: accentColor }}
                  >
                    <Play className="w-5 h-5" fill="currentColor" />
                    Regarder sur Crunchyroll
                  </a>
                ) : (
                  <button
                    className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white transition-all hover:scale-105"
                    style={{ backgroundColor: accentColor }}
                  >
                    <Play className="w-5 h-5" fill="currentColor" />
                    Commencer à regarder
                  </button>
                )}
                <button
                  onClick={() => setIsBookmarked(!isBookmarked)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all",
                    "bg-secondary hover:bg-secondary/80",
                    isBookmarked && "bg-primary/20 text-primary",
                  )}
                >
                  <Bookmark className="w-5 h-5" fill={isBookmarked ? "currentColor" : "none"} />
                  {isBookmarked ? "Sauvegardé" : "Ma Liste"}
                </button>
                <button className="flex items-center gap-2 px-4 py-3 rounded-xl font-medium bg-secondary hover:bg-secondary/80 transition-all">
                  <Share2 className="w-5 h-5" />
                  Partager
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="sticky top-16 z-40 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex gap-1 py-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={cn(
                  "px-4 py-2 rounded-lg font-medium transition-all",
                  activeTab === tab.id
                    ? "text-white"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary",
                )}
                style={{
                  backgroundColor: activeTab === tab.id ? accentColor : undefined,
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="grid md:grid-cols-3 gap-8">
            {/* Synopsis */}
            <div className="md:col-span-2">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <div className="w-1 h-6 rounded-full" style={{ backgroundColor: accentColor }} />
                Synopsis
              </h2>
              <p className="text-muted-foreground leading-relaxed text-pretty">
                {anime.description || "Aucune description disponible."}
              </p>

              {/* Staff */}
              {anime.staff && anime.staff.length > 0 && (
                <div className="mt-8">
                  <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <div className="w-1 h-6 rounded-full" style={{ backgroundColor: accentColor }} />
                    Staff
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {anime.staff.slice(0, 6).map((person) => (
                      <div key={person.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
                        <img
                          src={person.image || "/placeholder.svg?height=50&width=50&query=person"}
                          alt={person.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        <div className="min-w-0">
                          <p className="font-medium truncate">{person.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{person.role}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Side Info */}
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-secondary/30 space-y-4">
                <h3 className="font-bold text-lg">Informations</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Format</span>
                    <span className="font-medium">{anime.format || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Statut</span>
                    <span className="font-medium">{anime.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Source</span>
                    <span className="font-medium">{anime.source || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Saison</span>
                    <span className="font-medium">
                      {anime.season} {anime.year}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date de début</span>
                    <span className="font-medium">{anime.startDate || "N/A"}</span>
                  </div>
                </div>
              </div>

              {/* Studios */}
              {anime.studios && anime.studios.length > 0 && (
                <div className="p-4 rounded-xl bg-secondary/30">
                  <h3 className="font-bold text-lg mb-3">Studios</h3>
                  <div className="flex flex-wrap gap-2">
                    {anime.studios.map((studio) => (
                      <span
                        key={studio.id}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-sm font-medium",
                          studio.isAnimationStudio ? "bg-primary/20 text-primary" : "bg-secondary",
                        )}
                      >
                        {studio.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* External Links */}
              {anime.externalLinks && anime.externalLinks.length > 0 && (
                <div className="p-4 rounded-xl bg-secondary/30">
                  <h3 className="font-bold text-lg mb-3">Liens externes</h3>
                  <div className="space-y-2">
                    {anime.externalLinks.slice(0, 5).map((link, i) => (
                      <a
                        key={i}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary transition-colors text-sm"
                      >
                        <Globe className="w-4 h-4" style={{ color: link.color || undefined }} />
                        <span>{link.site}</span>
                        <ExternalLink className="w-3 h-3 ml-auto text-muted-foreground" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Characters Tab */}
        {activeTab === "characters" && (
          <div>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <div className="w-1 h-6 rounded-full" style={{ backgroundColor: accentColor }} />
              Personnages & Doubleurs
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {anime.characters?.map((char) => (
                <div
                  key={char.id}
                  className="flex items-center gap-4 p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
                >
                  <img
                    src={char.image || "/placeholder.svg?height=80&width=80&query=anime character"}
                    alt={char.name}
                    className="w-16 h-16 rounded-xl object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{char.name}</p>
                    <p className="text-xs text-muted-foreground">{char.role}</p>
                  </div>
                  {char.voiceActor && (
                    <div className="text-right min-w-0">
                      <p className="text-sm font-medium truncate">{char.voiceActor.name}</p>
                      <p className="text-xs text-muted-foreground">{char.voiceActor.language}</p>
                    </div>
                  )}
                  {char.voiceActor && (
                    <img
                      src={char.voiceActor.image || "/placeholder.svg?height=50&width=50&query=voice actor"}
                      alt={char.voiceActor.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Related Tab */}
        {activeTab === "related" && (
          <div className="space-y-12">
            {/* Relations */}
            {anime.relations && anime.relations.length > 0 && (
              <div className="relative isolate">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <div className="w-1 h-6 rounded-full" style={{ backgroundColor: accentColor }} />
                  Oeuvres liées
                </h2>
                <div className="flex gap-4 overflow-x-auto pb-16 pt-4 scrollbar-hide" style={{ overflowY: "visible" }}>
                  {anime.relations.map((relation) => (
                    <AnimeCard
                      key={relation.id}
                      anime={{
                        id: relation.id,
                        title: relation.title,
                        image: relation.image,
                        color: relation.color,
                        type: relation.type,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {anime.recommendations && anime.recommendations.length > 0 && (
              <div className="relative isolate">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <div className="w-1 h-6 rounded-full" style={{ backgroundColor: accentColor }} />
                  Recommandations
                </h2>
                <div className="flex gap-4 overflow-x-auto pb-16 pt-4 scrollbar-hide" style={{ overflowY: "visible" }}>
                  {anime.recommendations.map((rec) => (
                    <AnimeCard
                      key={rec.id}
                      anime={{
                        id: rec.id,
                        title: rec.title,
                        image: rec.image,
                        color: rec.color,
                        genres: rec.genres,
                        score: rec.score,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Episodes Tab */}
        {activeTab === "episodes" && (
          <div>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <div className="w-1 h-6 rounded-full" style={{ backgroundColor: accentColor }} />
              Épisodes
              {anime.crunchyrollEpisodes && anime.crunchyrollEpisodes.length > 0 ? (
                <span className="text-base font-normal text-muted-foreground ml-2">
                  ({anime.crunchyrollEpisodes.length} épisodes)
                </span>
              ) : anime.episodes && (
                <span className="text-base font-normal text-muted-foreground ml-2">({anime.episodes} épisodes)</span>
              )}
            </h2>

            {/* Episodes Grid */}
            {anime.crunchyrollEpisodes && anime.crunchyrollEpisodes.length > 0 ? (
              <EpisodeGrid
                episodes={anime.crunchyrollEpisodes.map(ep => ({
                  id: ep.id,
                  title: ep.title,
                  episodeNumber: ep.episodeNumber,
                  sequenceNumber: ep.sequenceNumber,
                  description: '',
                  duration: ep.duration || 24,
                  thumbnail: ep.thumbnail || anime.bannerImage || anime.image,
                  isPremium: ep.isPremium,
                  isDubbed: ep.isDubbed,
                  isSubbed: ep.isSubbed,
                  seasonNumber: ep.seasonNumber,
                  seasonTitle: ep.seasonTitle,
                }))}
                accentColor={accentColor}
                animeTitle={anime.title}
                animeImage={anime.bannerImage || anime.image}
              />
            ) : anime.episodes ? (
              <FallbackEpisodeGrid
                totalEpisodes={anime.episodes}
                accentColor={accentColor}
                animeImage={anime.bannerImage || anime.image}
                duration={anime.duration || 24}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Film className="w-16 h-16 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Aucun épisode disponible.</p>
              </div>
            )}

            {/* Show Crunchyroll availability message */}
            {!anime.isOnCrunchyroll && (
              <p className="text-center text-yellow-500/80 mt-6">
                ⚠️ Cet anime n'est pas disponible sur Crunchyroll
              </p>
            )}
          </div>
        )}
      </div>

      <Footer />
    </main>
  )
}

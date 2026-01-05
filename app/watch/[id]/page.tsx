"use client"

import { useParams, useRouter } from "next/navigation"
import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import {
    ChevronLeft,
    ChevronRight,
    Crown,
    Star,
    List,
    Info,
    MessageSquare,
    Play,
    ExternalLink,
} from "lucide-react"
import { Footer } from "@/components/footer"
import { LoadingScreen } from "@/components/loading-screen"
import { cn } from "@/lib/utils"

// Episode data interface
interface Episode {
    id: string
    title: string
    episodeNumber: number
    seasonNumber: number
    description: string
    duration: number
    thumbnail: string | null
    isPremium: boolean
    seriesId: string
    seriesTitle: string
    isWatched?: boolean
    progress?: number
}

interface Series {
    id: string
    title: string
    description: string
    image: string
    bannerImage: string
    color: string
    episodes: Episode[]
    genres: string[]
    score: number
}

// Navigation Button Component
function NavigationButton({
    direction,
    episode,
    accentColor
}: {
    direction: "prev" | "next"
    episode: Episode | null
    accentColor: string
}) {
    if (!episode) {
        return (
            <div className="px-4 py-2 text-muted-foreground text-sm">
                {direction === "prev" ? "Premier épisode" : "Dernier épisode"}
            </div>
        )
    }

    const isPrev = direction === "prev"

    return (
        <Link
            href={`/watch/${episode.id}`}
            className={cn(
                "group flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-300",
                "hover:scale-105 active:scale-95",
                isPrev
                    ? "bg-secondary/80 hover:bg-secondary text-foreground"
                    : "text-white shadow-lg hover:shadow-xl"
            )}
            style={!isPrev ? {
                background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
            } : undefined}
        >
            {isPrev && <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />}
            <span className="hidden sm:inline">
                {isPrev ? "Épisode précédent" : "Épisode suivant"}
            </span>
            <span className="sm:hidden">
                {isPrev ? "Préc." : "Suiv."}
            </span>
            {!isPrev && <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />}
        </Link>
    )
}

// Episode Card Component
function EpisodeCard({
    episode,
    isCurrent,
    accentColor,
    bannerImage
}: {
    episode: Episode
    isCurrent: boolean
    accentColor: string
    bannerImage: string
}) {
    return (
        <Link
            href={`/watch/${episode.id}`}
            className={cn(
                "group block rounded-xl overflow-hidden transition-all duration-300",
                "hover:scale-[1.03] hover:z-10"
            )}
            style={isCurrent ? {
                outline: `2px solid ${accentColor}`,
                outlineOffset: '2px'
            } : undefined}
        >
            <div className="relative aspect-video bg-secondary overflow-hidden">
                <img
                    src={episode.thumbnail || bannerImage}
                    alt={episode.title}
                    className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110 group-hover:brightness-110"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                <div
                    className="absolute top-2 left-2 px-2.5 py-1 rounded-lg text-xs font-bold text-white backdrop-blur-sm transition-all"
                    style={{
                        backgroundColor: isCurrent ? accentColor : "rgba(0,0,0,0.7)",
                        boxShadow: isCurrent ? `0 0 20px ${accentColor}50` : undefined
                    }}
                >
                    E{episode.episodeNumber}
                </div>

                {episode.isPremium && (
                    <div className="absolute top-2 right-2 p-1.5 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg">
                        <Crown className="w-3 h-3 text-white" />
                    </div>
                )}

                <div className="absolute bottom-2 right-2 px-2 py-1 rounded-lg bg-black/70 backdrop-blur-sm text-xs text-white font-medium">
                    {episode.duration}m
                </div>

                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <div
                        className="p-3 rounded-full text-white shadow-2xl transform scale-75 group-hover:scale-100 transition-transform duration-300"
                        style={{
                            background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
                            boxShadow: `0 4px 30px ${accentColor}60`
                        }}
                    >
                        <Play className="w-5 h-5" fill="currentColor" />
                    </div>
                </div>

                {episode.progress !== undefined && episode.progress > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
                        <div
                            className="h-full transition-all"
                            style={{ width: `${episode.progress}%`, backgroundColor: accentColor }}
                        />
                    </div>
                )}

                {isCurrent && (
                    <div className="absolute bottom-0 left-0 right-0 h-1" style={{ backgroundColor: accentColor }} />
                )}
            </div>

            <div className="p-3 bg-card/50">
                <p className={cn(
                    "text-sm font-medium line-clamp-1 transition-colors",
                    isCurrent ? "text-primary" : "group-hover:text-primary"
                )}>
                    {episode.title}
                </p>
            </div>
        </Link>
    )
}

export default function WatchPage() {
    const params = useParams()
    const router = useRouter()
    const episodeId = params?.id as string

    const [isLoading, setIsLoading] = useState(true)
    const [episode, setEpisode] = useState<Episode | null>(null)
    const [series, setSeries] = useState<Series | null>(null)
    const [activeTab, setActiveTab] = useState<"episodes" | "details" | "comments">("episodes")

    // Data loading
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true)
            await new Promise(resolve => setTimeout(resolve, 800))

            // Mock data - TODO: Replace with real Crunchyroll API
            const mockEpisode: Episode = {
                id: episodeId,
                title: "Le Début d'une Nouvelle Aventure",
                episodeNumber: 1,
                seasonNumber: 1,
                description: "L'histoire commence alors que notre héros découvre un monde extraordinaire rempli de défis et de mystères. Une aventure épique l'attend au-delà de tout ce qu'il aurait pu imaginer.",
                duration: 24,
                thumbnail: null,
                isPremium: false,
                seriesId: "12345",
                seriesTitle: "Mon Anime Préféré"
            }

            const mockSeries: Series = {
                id: "12345",
                title: "Mon Anime Préféré",
                description: "Une série captivante qui suit les aventures d'un groupe de héros dans un monde fantastique.",
                image: "/placeholder.svg?height=400&width=300",
                bannerImage: "/placeholder.svg?height=600&width=1200",
                color: "#f97316",
                genres: ["Action", "Aventure", "Fantasy", "Shōnen"],
                score: 8.7,
                episodes: Array.from({ length: 24 }, (_, i) => ({
                    id: `ep-${i + 1}`,
                    title: i === 0 ? "Le Début d'une Nouvelle Aventure" : `Épisode ${i + 1}`,
                    episodeNumber: i + 1,
                    seasonNumber: 1,
                    description: `Description de l'épisode ${i + 1}`,
                    duration: 24,
                    thumbnail: null,
                    isPremium: i > 2,
                    seriesId: "12345",
                    seriesTitle: "Mon Anime Préféré",
                    progress: i < 3 ? (i === 0 ? 100 : i === 1 ? 65 : 0) : undefined
                }))
            }

            setEpisode(mockEpisode)
            setSeries(mockSeries)
            setIsLoading(false)
        }

        if (episodeId) {
            loadData()
        }
    }, [episodeId])

    // ============================================
    // CRITICAL: Make the page transparent so the 
    // native Crunchyroll player is visible underneath
    // ============================================
    useEffect(() => {
        // Save original backgrounds
        const originalHtmlBg = document.documentElement.style.background
        const originalBodyBg = document.body.style.background

        // Make transparent
        document.documentElement.style.background = 'transparent'
        document.body.style.background = 'transparent'

        return () => {
            // Restore on unmount
            document.documentElement.style.background = originalHtmlBg
            document.body.style.background = originalBodyBg
        }
    }, [])

    const accentColor = series?.color || "#f97316"
    const currentEpisodeIndex = series?.episodes.findIndex(ep => ep.id === episodeId) ?? -1
    const prevEpisode = currentEpisodeIndex > 0 ? series?.episodes[currentEpisodeIndex - 1] : null
    const nextEpisode = currentEpisodeIndex < (series?.episodes.length ?? 0) - 1 ? series?.episodes[currentEpisodeIndex + 1] : null

    const tabs = [
        { id: "episodes", label: "Épisodes", icon: List },
        { id: "details", label: "Détails", icon: Info },
        { id: "comments", label: "Commentaires", icon: MessageSquare },
    ] as const

    if (isLoading) {
        return <LoadingScreen isLoading={true} message="Chargement de l'épisode..." />
    }

    if (!episode || !series) {
        return (
            <main className="min-h-screen bg-background">
                <div className="flex items-center justify-center min-h-screen">
                    <div className="text-center p-8">
                        <h1 className="text-2xl font-bold mb-2">Épisode non trouvé</h1>
                        <p className="text-muted-foreground mb-4">Impossible de charger cet épisode.</p>
                        <button
                            onClick={() => router.back()}
                            className="px-6 py-2.5 rounded-xl bg-primary text-white font-medium hover:opacity-90 transition-opacity"
                        >
                            Retour
                        </button>
                    </div>
                </div>
            </main>
        )
    }

    return (
        <main
            className="min-h-screen"
            style={{ background: 'transparent' }}
        >
            {/* ============================================
                VIDEO PLAYER SPACER
                This transparent zone allows the native 
                Crunchyroll player (running underneath the 
                extension iframe) to be visible.
                
                The content script positions the player here:
                - position: fixed
                - top: 0
                - width: 100%
                - aspectRatio: 16/9
                ============================================ */}
            <div
                className="w-full"
                style={{
                    aspectRatio: '16/9',
                    background: 'transparent',
                    pointerEvents: 'none', // Allow clicks to pass through to native player
                    maxHeight: 'calc(100vh - 100px)'
                }}
                aria-hidden="true"
            />

            {/* ============================================
                UI CONTENT - Opaque background from here
                ============================================ */}

            {/* Episode Info Bar */}
            <section
                className="relative border-b border-border bg-background"
                style={{
                    background: `linear-gradient(180deg, rgba(10,10,10,0.95) 0%, hsl(var(--background)) 100%)`
                }}
            >
                <div className="px-4 md:px-8 lg:px-12 py-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex-shrink-0">
                            <NavigationButton
                                direction="prev"
                                episode={prevEpisode ?? null}
                                accentColor={accentColor}
                            />
                        </div>

                        <div className="flex-1 text-center min-w-0">
                            <Link
                                href={`/anime/${series.id}`}
                                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
                            >
                                {series.title}
                                <ExternalLink className="w-3 h-3" />
                            </Link>
                            <h1
                                className="text-lg md:text-xl font-bold truncate"
                                style={{ color: accentColor }}
                            >
                                Épisode {episode.episodeNumber}: {episode.title}
                            </h1>
                        </div>

                        <div className="flex-shrink-0">
                            <NavigationButton
                                direction="next"
                                episode={nextEpisode ?? null}
                                accentColor={accentColor}
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* Tabs Section */}
            <section className="sticky top-0 z-20 bg-card/95 backdrop-blur-md border-b border-border">
                <div className="px-4 md:px-8 lg:px-12">
                    <div className="flex gap-2 py-3 overflow-x-auto scrollbar-hide">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all duration-300 whitespace-nowrap",
                                    "hover:scale-105 active:scale-95",
                                    activeTab === tab.id
                                        ? "text-white shadow-lg"
                                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                                )}
                                style={activeTab === tab.id ? {
                                    background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
                                    boxShadow: `0 4px 20px ${accentColor}40`
                                } : undefined}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                                {tab.id === "episodes" && (
                                    <span className={cn(
                                        "text-xs px-1.5 py-0.5 rounded-full",
                                        activeTab === tab.id ? "bg-white/20" : "bg-secondary"
                                    )}>
                                        {series.episodes.length}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </section>

            {/* Tab Content */}
            <section className="px-4 md:px-8 lg:px-12 py-8 bg-background min-h-[50vh]">
                {/* Episodes Tab */}
                {activeTab === "episodes" && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold flex items-center gap-3">
                                <div className="w-1 h-6 rounded-full" style={{ backgroundColor: accentColor }} />
                                Tous les épisodes
                            </h2>
                            <span className="text-sm text-muted-foreground">
                                Saison {episode.seasonNumber} • {series.episodes.length} épisodes
                            </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                            {series.episodes.map((ep) => (
                                <EpisodeCard
                                    key={ep.id}
                                    episode={ep}
                                    isCurrent={ep.id === episodeId}
                                    accentColor={accentColor}
                                    bannerImage={series.bannerImage}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Details Tab */}
                {activeTab === "details" && (
                    <div className="grid md:grid-cols-3 gap-8 animate-in fade-in duration-300">
                        <div className="md:col-span-2 space-y-8">
                            <div>
                                <h2 className="text-xl font-bold flex items-center gap-3 mb-4">
                                    <div className="w-1 h-6 rounded-full" style={{ backgroundColor: accentColor }} />
                                    Description de l'épisode
                                </h2>
                                <p className="text-muted-foreground leading-relaxed text-lg">
                                    {episode.description}
                                </p>
                            </div>

                            <div>
                                <h2 className="text-xl font-bold flex items-center gap-3 mb-4">
                                    <div className="w-1 h-6 rounded-full" style={{ backgroundColor: accentColor }} />
                                    À propos de {series.title}
                                </h2>
                                <p className="text-muted-foreground leading-relaxed">
                                    {series.description}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="p-5 rounded-2xl bg-card border border-border space-y-4">
                                <h3 className="font-bold text-lg">Informations</h3>
                                <div className="space-y-3">
                                    {[
                                        { label: "Épisode", value: episode.episodeNumber },
                                        { label: "Saison", value: episode.seasonNumber },
                                        { label: "Durée", value: `${episode.duration} min` },
                                        { label: "Type", value: episode.isPremium ? "Premium" : "Gratuit" },
                                    ].map((item) => (
                                        <div key={item.label} className="flex justify-between items-center">
                                            <span className="text-muted-foreground">{item.label}</span>
                                            <span className="font-medium">{item.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="p-5 rounded-2xl bg-card border border-border space-y-4">
                                <h3 className="font-bold text-lg">Série</h3>
                                <Link
                                    href={`/anime/${series.id}`}
                                    className="flex items-center gap-4 p-3 -m-3 rounded-xl hover:bg-secondary/50 transition-colors"
                                >
                                    <img
                                        src={series.image}
                                        alt={series.title}
                                        className="w-14 h-20 rounded-lg object-cover"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold truncate">{series.title}</p>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                            <Star className="w-4 h-4" fill={accentColor} style={{ color: accentColor }} />
                                            <span>{series.score}</span>
                                            <span>•</span>
                                            <span>{series.episodes.length} épisodes</span>
                                        </div>
                                    </div>
                                </Link>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {series.genres.map((genre) => (
                                    <span
                                        key={genre}
                                        className="px-4 py-1.5 rounded-full text-sm font-medium transition-transform hover:scale-105"
                                        style={{
                                            backgroundColor: `${accentColor}20`,
                                            color: accentColor,
                                            border: `1px solid ${accentColor}40`
                                        }}
                                    >
                                        {genre}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Comments Tab */}
                {activeTab === "comments" && (
                    <div className="text-center py-20 animate-in fade-in duration-300">
                        <div
                            className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-6"
                            style={{ backgroundColor: `${accentColor}20` }}
                        >
                            <MessageSquare className="w-10 h-10" style={{ color: accentColor }} />
                        </div>
                        <h3 className="text-2xl font-bold mb-3">Commentaires à venir</h3>
                        <p className="text-muted-foreground max-w-md mx-auto">
                            Les commentaires et discussions de la communauté seront bientôt disponibles.
                        </p>
                    </div>
                )}
            </section>

            <Footer />
        </main>
    )
}

"use client"

import { useParams, useRouter } from "next/navigation"
import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import {
    Play,
    Pause,
    SkipBack,
    SkipForward,
    Volume2,
    VolumeX,
    Maximize,
    Settings,
    ChevronLeft,
    ChevronRight,
    Clock,
    Crown,
    Star,
    Film,
    List,
    Info,
    MessageSquare,
} from "lucide-react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { LoadingScreen } from "@/components/loading-screen"
import { cn } from "@/lib/utils"

// Simulated episode data - in production this would come from Crunchyroll API
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

export default function WatchPage() {
    const params = useParams()
    const router = useRouter()
    const episodeId = params?.id as string

    const [isLoading, setIsLoading] = useState(true)
    const [episode, setEpisode] = useState<Episode | null>(null)
    const [series, setSeries] = useState<Series | null>(null)
    const [activeTab, setActiveTab] = useState<"episodes" | "details" | "comments">("episodes")

    // Video player state
    const [isPlaying, setIsPlaying] = useState(false)
    const [isMuted, setIsMuted] = useState(false)
    const [progress, setProgress] = useState(0)
    const [showControls, setShowControls] = useState(true)
    const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    // Simulated data loading
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true)

            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 1000))

            // Mock episode data
            const mockEpisode: Episode = {
                id: episodeId,
                title: "Le Début d'une Nouvelle Aventure",
                episodeNumber: 1,
                seasonNumber: 1,
                description: "L'histoire commence alors que notre héros découvre un monde extraordinaire rempli de défis et de mystères. Une aventure épique l'attend au-delà de tout ce qu'il aurait pu imaginer. Chaque pas le rapproche de son destin, tandis que de nouveaux alliés et ennemis se révèlent.",
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
                genres: ["Action", "Aventure", "Fantasy"],
                score: 8.5,
                episodes: Array.from({ length: 12 }, (_, i) => ({
                    id: `ep-${i + 1}`,
                    title: `Épisode ${i + 1}`,
                    episodeNumber: i + 1,
                    seasonNumber: 1,
                    description: `Description de l'épisode ${i + 1}`,
                    duration: 24,
                    thumbnail: null,
                    isPremium: i > 2,
                    seriesId: "12345",
                    seriesTitle: "Mon Anime Préféré"
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

    // Hide controls after inactivity
    useEffect(() => {
        const handleMouseMove = () => {
            setShowControls(true)
            if (controlsTimeoutRef.current) {
                clearTimeout(controlsTimeoutRef.current)
            }
            controlsTimeoutRef.current = setTimeout(() => {
                if (isPlaying) {
                    setShowControls(false)
                }
            }, 3000)
        }

        document.addEventListener("mousemove", handleMouseMove)
        return () => {
            document.removeEventListener("mousemove", handleMouseMove)
            if (controlsTimeoutRef.current) {
                clearTimeout(controlsTimeoutRef.current)
            }
        }
    }, [isPlaying])

    // Handle transparency for video player visibility and Scroll Sync
    useEffect(() => {
        // Save original styles
        const originalHtmlBg = document.documentElement.style.background
        const originalBodyBg = document.body.style.background

        // Set transparent
        document.documentElement.style.background = 'transparent'
        document.body.style.background = 'transparent'

        // Handle scroll sync with native player
        const handleScroll = () => {
            const scrollY = window.scrollY
            window.parent.postMessage({ type: 'BCR_SCROLL_SYNC', scrollY }, '*')
        }

        window.addEventListener('scroll', handleScroll, { passive: true })
        // Initial sync
        handleScroll()

        return () => {
            // Restore
            document.documentElement.style.background = originalHtmlBg
            document.body.style.background = originalBodyBg
            window.removeEventListener('scroll', handleScroll)
        }
    }, [])

    // Sync Play/Pause with Native Player
    useEffect(() => {
        const type = isPlaying ? 'BCR_PLAY' : 'BCR_PAUSE'
        window.parent.postMessage({ type }, '*')
    }, [isPlaying])

    const accentColor = series?.color || "#f97316"

    const currentEpisodeIndex = series?.episodes.findIndex(ep => ep.id === episodeId) ?? -1
    const prevEpisode = currentEpisodeIndex > 0 ? series?.episodes[currentEpisodeIndex - 1] : null
    const nextEpisode = currentEpisodeIndex < (series?.episodes.length ?? 0) - 1 ? series?.episodes[currentEpisodeIndex + 1] : null

    if (isLoading) {
        return <LoadingScreen isLoading={true} message="Chargement de l'épisode..." />
    }

    if (!episode || !series) {
        return (
            <main className="min-h-screen bg-background">
                <Header />
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold mb-2">Épisode non trouvé</h1>
                        <p className="text-muted-foreground">Impossible de charger cet épisode.</p>
                        <button
                            onClick={() => router.back()}
                            className="mt-4 px-4 py-2 rounded-lg bg-primary text-white"
                        >
                            Retour
                        </button>
                    </div>
                </div>
            </main>
        )
    }

    return (
        <main className="min-h-screen bg-transparent">
            {/* Header with opaque background */}
            <div className="bg-background">
                <Header />
            </div>

            {/* Video Player Section */}
            <section className="relative pt-24 bg-background/0">
                {/* Video Container - Transparent hole for underlying player */}
                {/* Added explicit min-height and slightly taller aspect ratio to prevent clipping */}
                <div
                    className="relative w-full aspect-video bg-transparent mb-16"
                    style={{
                        pointerEvents: 'none',
                        // Ensuring we don't clip the bottom of the native player controls
                        minHeight: 'calc(100vw * 9 / 16)'
                    }}
                >
                </div>
            </section>

            {/* Episode Navigation - Opaque background */}
            <section className="px-4 md:px-8 lg:px-12 py-4 border-b border-border bg-background">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {prevEpisode ? (
                            <Link
                                href={`/watch/${prevEpisode.id}`}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                Épisode précédent
                            </Link>
                        ) : (
                            <div className="px-4 py-2 text-muted-foreground">Premier épisode</div>
                        )}
                    </div>

                    <div className="text-center">
                        <Link
                            href={`/anime/${series.id}`}
                            className="text-sm text-muted-foreground hover:text-primary transition-colors"
                        >
                            {series.title}
                        </Link>
                        <h2 className="font-bold" style={{ color: accentColor }}>
                            Épisode {episode.episodeNumber}: {episode.title}
                        </h2>
                    </div>

                    <div className="flex items-center gap-4">
                        {nextEpisode ? (
                            <Link
                                href={`/watch/${nextEpisode.id}`}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors hover:opacity-90"
                                style={{ backgroundColor: accentColor }}
                            >
                                Épisode suivant
                                <ChevronRight className="w-4 h-4" />
                            </Link>
                        ) : (
                            <div className="px-4 py-2 text-muted-foreground">Dernier épisode</div>
                        )}
                    </div>
                </div>
            </section>

            {/* Tabs - Opaque background */}
            <section className="px-4 md:px-8 lg:px-12 border-b border-border bg-background">
                <div className="flex gap-1 py-2">
                    {[
                        { id: "episodes", label: "Épisodes", icon: List },
                        { id: "details", label: "Détails", icon: Info },
                        { id: "comments", label: "Commentaires", icon: MessageSquare },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as typeof activeTab)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all",
                                activeTab === tab.id
                                    ? "text-white"
                                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                            )}
                            style={{
                                backgroundColor: activeTab === tab.id ? accentColor : undefined,
                            }}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </section>

            {/* Tab Content - Opaque background */}
            <section className="px-4 md:px-8 lg:px-12 py-8 bg-background">
                {/* Episodes Tab */}
                {activeTab === "episodes" && (
                    <div className="space-y-6">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <div className="w-1 h-5 rounded-full" style={{ backgroundColor: accentColor }} />
                            Tous les épisodes
                            <span className="text-sm font-normal text-muted-foreground">
                                ({series.episodes.length} épisodes)
                            </span>
                        </h3>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                            {series.episodes.map((ep) => (
                                <Link
                                    key={ep.id}
                                    href={`/watch/${ep.id}`}
                                    className={cn(
                                        "group block rounded-xl overflow-hidden transition-all duration-300",
                                        "hover:scale-105 hover:z-10"
                                    )}
                                    style={{
                                        outline: ep.id === episodeId ? `2px solid ${accentColor}` : undefined,
                                        outlineOffset: '-2px'
                                    }}
                                >
                                    <div className="relative aspect-video bg-secondary">
                                        <img
                                            src={ep.thumbnail || series.bannerImage}
                                            alt={ep.title}
                                            className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />

                                        {/* Episode number */}
                                        <div
                                            className="absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-bold text-white"
                                            style={{ backgroundColor: ep.id === episodeId ? accentColor : "rgba(0,0,0,0.7)" }}
                                        >
                                            E{ep.episodeNumber}
                                        </div>

                                        {/* Premium badge */}
                                        {ep.isPremium && (
                                            <div className="absolute top-2 right-2 p-1 rounded bg-amber-500">
                                                <Crown className="w-3 h-3 text-white" />
                                            </div>
                                        )}

                                        {/* Duration */}
                                        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/70 text-xs text-white">
                                            {ep.duration}m
                                        </div>

                                        {/* Play icon on hover */}
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div
                                                className="p-2 rounded-full text-white"
                                                style={{ backgroundColor: accentColor }}
                                            >
                                                <Play className="w-4 h-4" fill="currentColor" />
                                            </div>
                                        </div>

                                        {/* Currently watching indicator */}
                                        {ep.id === episodeId && (
                                            <div className="absolute bottom-0 left-0 right-0 h-1" style={{ backgroundColor: accentColor }} />
                                        )}
                                    </div>

                                    <div className="p-2">
                                        <p className={cn(
                                            "text-sm font-medium line-clamp-1",
                                            ep.id === episodeId && "text-primary"
                                        )}>
                                            {ep.title}
                                        </p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* Details Tab */}
                {activeTab === "details" && (
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="md:col-span-2 space-y-6">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <div className="w-1 h-5 rounded-full" style={{ backgroundColor: accentColor }} />
                                Description de l'épisode
                            </h3>
                            <p className="text-muted-foreground leading-relaxed">
                                {episode.description}
                            </p>

                            <div className="pt-4">
                                <h3 className="text-xl font-bold flex items-center gap-2 mb-4">
                                    <div className="w-1 h-5 rounded-full" style={{ backgroundColor: accentColor }} />
                                    À propos de {series.title}
                                </h3>
                                <p className="text-muted-foreground leading-relaxed">
                                    {series.description}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="p-4 rounded-xl bg-secondary/30 space-y-3">
                                <h4 className="font-bold">Informations</h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Épisode</span>
                                        <span className="font-medium">{episode.episodeNumber}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Saison</span>
                                        <span className="font-medium">{episode.seasonNumber}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Durée</span>
                                        <span className="font-medium">{episode.duration} min</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Type</span>
                                        <span className="font-medium">{episode.isPremium ? "Premium" : "Gratuit"}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 rounded-xl bg-secondary/30 space-y-3">
                                <h4 className="font-bold">Série</h4>
                                <Link
                                    href={`/anime/${series.id}`}
                                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary transition-colors"
                                >
                                    <img
                                        src={series.image}
                                        alt={series.title}
                                        className="w-12 h-16 rounded object-cover"
                                    />
                                    <div>
                                        <p className="font-medium">{series.title}</p>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Star className="w-3 h-3 text-primary" fill="currentColor" />
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
                                        className="px-3 py-1 rounded-full text-xs font-medium"
                                        style={{
                                            backgroundColor: `${accentColor}20`,
                                            color: accentColor,
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
                    <div className="text-center py-16">
                        <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-bold mb-2">Commentaires à venir</h3>
                        <p className="text-muted-foreground">
                            Les commentaires seront bientôt disponibles.
                        </p>
                    </div>
                )}
            </section>

            <Footer />
        </main>
    )
}

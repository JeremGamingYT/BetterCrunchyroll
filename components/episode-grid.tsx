"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Play, Clock, Crown, ChevronDown, CheckCircle2, Lock } from "lucide-react"
import { cn } from "@/lib/utils"

interface EpisodeData {
    id: string
    title: string
    episodeNumber: number | null
    sequenceNumber: number
    description?: string
    duration: number
    thumbnail: string | null
    isPremium: boolean
    isDubbed?: boolean
    isSubbed?: boolean
    seasonNumber?: number
    seasonTitle?: string
    availableFrom?: string | null
    isWatched?: boolean
}

interface EpisodeGridProps {
    episodes: EpisodeData[]
    accentColor?: string
    animeTitle?: string
    animeImage?: string
}

export function EpisodeGrid({ episodes, accentColor = "hsl(var(--primary))", animeTitle, animeImage }: EpisodeGridProps) {
    const [visibleCount, setVisibleCount] = useState(18)
    const [hoveredId, setHoveredId] = useState<string | null>(null)

    const visibleEpisodes = episodes.slice(0, visibleCount)
    const hasMore = visibleCount < episodes.length

    const loadMore = () => {
        setVisibleCount(prev => Math.min(prev + 18, episodes.length))
    }

    if (episodes.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-20 h-20 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
                    <Play className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">Aucun épisode disponible</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {visibleEpisodes.map((episode) => (
                    <EpisodeGridCard
                        key={episode.id}
                        episode={episode}
                        accentColor={accentColor}
                        animeImage={animeImage}
                        isHovered={hoveredId === episode.id}
                        onHover={() => setHoveredId(episode.id)}
                        onLeave={() => setHoveredId(null)}
                    />
                ))}
            </div>

            {/* Load More Button */}
            {hasMore && (
                <div className="flex justify-center pt-4">
                    <button
                        onClick={loadMore}
                        className={cn(
                            "flex items-center gap-2 px-6 py-3 rounded-xl font-medium",
                            "bg-secondary hover:bg-secondary/80 transition-all",
                            "hover:scale-105"
                        )}
                    >
                        <ChevronDown className="w-5 h-5" />
                        Voir plus ({episodes.length - visibleCount} épisodes restants)
                    </button>
                </div>
            )}

            {/* Episode count */}
            <p className="text-center text-sm text-muted-foreground">
                Affichage de {visibleEpisodes.length} sur {episodes.length} épisodes
            </p>
        </div>
    )
}

interface EpisodeGridCardProps {
    episode: EpisodeData
    accentColor: string
    animeImage?: string
    isHovered: boolean
    onHover: () => void
    onLeave: () => void
}

function EpisodeGridCard({ episode, accentColor, animeImage, isHovered, onHover, onLeave }: EpisodeGridCardProps) {
    const [timeLeft, setTimeLeft] = useState("")
    const thumbnail = episode.thumbnail || animeImage || "/placeholder.svg?height=180&width=320"
    const displayNumber = episode.episodeNumber || episode.sequenceNumber
    const isAvailable = !episode.availableFrom || new Date(episode.availableFrom) <= new Date()

    useEffect(() => {
        if (!isAvailable && episode.availableFrom) {
            const updateTime = () => {
                const now = new Date().getTime()
                const available = new Date(episode.availableFrom!).getTime()
                const diff = available - now

                if (diff <= 0) {
                    setTimeLeft("")
                } else {
                    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
                    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
                    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
                    if (days > 0) setTimeLeft(`${days}j ${hours}h`)
                    else if (hours > 0) setTimeLeft(`${hours}h ${minutes}m`)
                    else setTimeLeft(`${minutes}m`)
                }
            }
            updateTime()
            const timer = setInterval(updateTime, 60000)
            return () => clearInterval(timer)
        }
    }, [episode.availableFrom, isAvailable])

    // Navigate to the real Crunchyroll watch page
    const handleClick = (e: React.MouseEvent) => {
        if (!isAvailable) {
            e.preventDefault()
            return
        }
        e.preventDefault()
        const crunchyrollUrl = `https://www.crunchyroll.com/fr/watch/${episode.id}`
        // If we're in an iframe, navigate the parent window
        if (typeof window !== 'undefined' && window.parent !== window) {
            window.parent.location.href = crunchyrollUrl
        } else if (typeof window !== 'undefined') {
            window.location.href = crunchyrollUrl
        }
    }

    return (
        <a
            href={isAvailable ? `https://www.crunchyroll.com/fr/watch/${episode.id}` : '#'}
            onClick={handleClick}
            className={cn("group block", !isAvailable && "cursor-default")}
            onMouseEnter={onHover}
            onMouseLeave={onLeave}
        >
            <div className={cn(
                "relative rounded-xl overflow-hidden transition-all duration-300",
                isHovered && isAvailable && "scale-105 z-20"
            )}>
                {/* Thumbnail */}
                <div className="relative aspect-video">
                    <img
                        src={thumbnail}
                        alt={episode.title}
                        className={cn(
                            "w-full h-full object-cover transition-transform duration-500",
                            isHovered && isAvailable && "scale-110",
                            !isAvailable && "blur-[2px] opacity-70"
                        )}
                    />

                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    {/* Coming Soon Overlay */}
                    {!isAvailable && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[1px]">
                            <Lock className="w-8 h-8 text-white mb-2" />
                            <p className="text-white font-bold text-sm drop-shadow-md">Bientôt disponible</p>
                            <p className="text-white/80 text-xs font-medium mt-1 drop-shadow-md">{timeLeft}</p>
                        </div>
                    )}

                    {/* Watched Overlay */}
                    {isAvailable && episode.isWatched && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="flex flex-col items-center">
                                <span className="text-white font-medium text-xs bg-black/60 px-2 py-1 rounded-full mb-2">Déjà vu</span>
                            </div>
                        </div>
                    )}

                    {/* Watched Badge (Always visible if watched) */}
                    {isAvailable && episode.isWatched && (
                        <div className="absolute top-2 right-2 z-10">
                            <div className="bg-primary/90 text-primary-foreground p-1 rounded-full shadow-lg">
                                <CheckCircle2 className="w-3 h-3" />
                            </div>
                        </div>
                    )}

                    {/* Episode Number Badge */}
                    <div
                        className="absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-bold text-white z-10"
                        style={{ backgroundColor: accentColor }}
                    >
                        E{displayNumber}
                    </div>

                    {/* Premium Badge */}
                    {episode.isPremium && (
                        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-amber-500 flex items-center gap-1">
                            <Crown className="w-3 h-3 text-white" />
                        </div>
                    )}

                    {/* Duration */}
                    {isAvailable && (
                        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-sm flex items-center gap-1">
                            <Clock className="w-3 h-3 text-white/70" />
                            <span className="text-xs text-white">{episode.duration}m</span>
                        </div>
                    )}

                    {/* Play button on hover */}
                    {isAvailable && (
                        <div className={cn(
                            "absolute inset-0 flex items-center justify-center transition-all duration-300",
                            isHovered && !episode.isWatched ? "opacity-100" : "opacity-0"
                        )}>
                            <div
                                className="p-3 rounded-full text-white shadow-lg transition-transform duration-300 hover:scale-110"
                                style={{ backgroundColor: accentColor }}
                            >
                                <Play className="w-5 h-5" fill="currentColor" />
                            </div>
                        </div>
                    )}

                    {/* Border glow */}
                    {isAvailable && (
                        <div
                            className={cn(
                                "absolute inset-0 rounded-xl border-2 transition-all duration-300",
                                isHovered ? "opacity-100" : "opacity-0"
                            )}
                            style={{ borderColor: accentColor }}
                        />
                    )}
                </div>
            </div>

            {/* Episode info */}
            <div className="mt-2">
                <h4
                    className={cn(
                        "text-sm font-medium line-clamp-1 transition-colors duration-300",
                        isHovered && isAvailable && "text-primary"
                    )}
                    style={{ color: isHovered && isAvailable ? accentColor : undefined }}
                >
                    {episode.title || `Épisode ${displayNumber}`}
                </h4>
                {episode.seasonTitle && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {episode.seasonTitle}
                    </p>
                )}
            </div>
        </a>
    )
}

// Fallback grid for when no Crunchyroll data is available
interface FallbackEpisodeGridProps {
    totalEpisodes: number
    accentColor?: string
    animeImage?: string
    duration?: number
}

export function FallbackEpisodeGrid({ totalEpisodes, accentColor = "hsl(var(--primary))", animeImage, duration = 24 }: FallbackEpisodeGridProps) {
    const [visibleCount, setVisibleCount] = useState(18)

    const visibleEpisodes = Math.min(visibleCount, totalEpisodes)
    const hasMore = visibleCount < totalEpisodes

    const loadMore = () => {
        setVisibleCount(prev => Math.min(prev + 18, totalEpisodes))
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {Array.from({ length: visibleEpisodes }, (_, i) => (
                    <div key={i + 1} className="group block">
                        <div className="relative rounded-xl overflow-hidden transition-all duration-300 hover:scale-105">
                            <div className="relative aspect-video bg-secondary">
                                <img
                                    src={animeImage || "/placeholder.svg?height=180&width=320"}
                                    alt={`Épisode ${i + 1}`}
                                    className="w-full h-full object-cover opacity-50"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                                <div
                                    className="absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-bold text-white"
                                    style={{ backgroundColor: accentColor }}
                                >
                                    E{i + 1}
                                </div>
                                <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-sm flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-white/70" />
                                    <span className="text-xs text-white">{duration}m</span>
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div
                                        className="p-3 rounded-full text-white shadow-lg"
                                        style={{ backgroundColor: accentColor }}
                                    >
                                        <Play className="w-5 h-5" fill="currentColor" />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="mt-2">
                            <h4 className="text-sm font-medium line-clamp-1 group-hover:text-primary transition-colors">
                                Épisode {i + 1}
                            </h4>
                        </div>
                    </div>
                ))}
            </div>

            {hasMore && (
                <div className="flex justify-center pt-4">
                    <button
                        onClick={loadMore}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium bg-secondary hover:bg-secondary/80 transition-all hover:scale-105"
                    >
                        <ChevronDown className="w-5 h-5" />
                        Voir plus ({totalEpisodes - visibleCount} épisodes restants)
                    </button>
                </div>
            )}

            <p className="text-center text-sm text-muted-foreground">
                Affichage de {visibleEpisodes} sur {totalEpisodes} épisodes
            </p>
        </div>
    )
}

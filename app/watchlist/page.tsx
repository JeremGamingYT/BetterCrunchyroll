"use client"

import { useState, useEffect, useMemo } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { cn } from "@/lib/utils"
import { Loader2, Bookmark, Grid, List, Heart, Plus, RefreshCw, Star } from "lucide-react"
import Link from "next/link"
import { useWatchlist, type EnrichedWatchlistItem } from "@/hooks/use-watchlist"
import { AnimeCard } from "@/components/anime-card"

type ViewMode = "grid" | "list"
type SortBy = "date_updated" | "date_watched" | "date_added" | "alphabetical"
type FilterType = "all" | "favorites"

const SORT_LABELS: Record<SortBy, string> = {
    date_updated: "Récemment mis à jour",
    date_watched: "Récemment regardé",
    date_added: "Récemment ajouté",
    alphabetical: "Alphabétique",
}

export default function WatchlistPage() {
    const [viewMode, setViewMode] = useState<ViewMode>("grid")
    const [sortBy, setSortBy] = useState<SortBy>("date_updated")
    const [filterType, setFilterType] = useState<FilterType>("all")

    // Use the global watchlist context (enriched with AniList data)
    const {
        watchlist: rawWatchlist,
        isLoading,
        refresh: refreshWatchlist,
        totalCount,
        favoritesCount
    } = useWatchlist()

    // Filter and sort the watchlist locally
    const watchlist = useMemo(() => {
        let filtered = [...rawWatchlist]

        // Filter by favorites
        if (filterType === "favorites") {
            filtered = filtered.filter(item => item.isFavorite)
        }

        // Sort
        if (sortBy === "alphabetical") {
            filtered.sort((a, b) => a.title.localeCompare(b.title))
        }
        // Note: Other sort options are handled by the API call in the context

        return filtered
    }, [rawWatchlist, filterType, sortBy])

    // Scroll to top on mount
    useEffect(() => {
        window.scrollTo(0, 0)
    }, [])

    return (
        <main className="min-h-screen bg-background">
            <Header />

            {/* Hero Section */}
            <section className="relative pt-24">
                <div className="h-[300px] bg-gradient-to-br from-primary/20 via-background to-background relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
                    <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4">
                        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                            <Bookmark className="w-8 h-8 text-primary" />
                        </div>
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4">Ma Watchlist</h1>
                        <p className="text-lg text-muted-foreground max-w-2xl">
                            Votre liste d'anime synchronisée avec Crunchyroll. {watchlist?.length || 0} anime{(watchlist?.length || 0) > 1 ? 's' : ''} dans votre liste.
                        </p>
                    </div>
                </div>
            </section>

            {/* Filters */}
            <section className="px-4 md:px-8 lg:px-12 py-8 border-b border-border">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    {/* Filter Tabs */}
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={() => setFilterType("all")}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                                filterType === "all"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-secondary text-muted-foreground hover:text-foreground",
                            )}
                        >
                            Tous
                            <span
                                className={cn(
                                    "px-1.5 py-0.5 text-xs rounded-full",
                                    filterType === "all" ? "bg-primary-foreground/20" : "bg-background",
                                )}
                            >
                                {watchlist?.length || 0}
                            </span>
                        </button>
                        <button
                            onClick={() => setFilterType("favorites")}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                                filterType === "favorites"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-secondary text-muted-foreground hover:text-foreground",
                            )}
                        >
                            <Heart className="w-4 h-4" />
                            Favoris
                            <span
                                className={cn(
                                    "px-1.5 py-0.5 text-xs rounded-full",
                                    filterType === "favorites" ? "bg-primary-foreground/20" : "bg-background",
                                )}
                            >
                                {favoritesCount}
                            </span>
                        </button>

                        {/* Sort Dropdown */}
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as SortBy)}
                            className="px-4 py-2 rounded-lg bg-secondary text-sm font-medium text-foreground border-none focus:ring-2 focus:ring-primary cursor-pointer"
                        >
                            {Object.entries(SORT_LABELS).map(([value, label]) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </select>

                        {/* Refresh Button */}
                        <button
                            onClick={() => refreshWatchlist()}
                            disabled={isLoading}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                                "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80",
                                isLoading && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                            Actualiser
                        </button>
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
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                        <p className="text-muted-foreground">Chargement de votre watchlist...</p>
                    </div>
                ) : totalCount === 0 && !isLoading ? (
                    <div className="text-center py-20">
                        <Bookmark className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                        <h2 className="text-xl font-semibold text-foreground mb-2">
                            Votre watchlist est vide
                        </h2>
                        <p className="text-muted-foreground mb-6">
                            Commencez à ajouter des anime pour les retrouver ici.
                        </p>
                        <Link
                            href="/populaire"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                        >
                            <Plus className="w-5 h-5" />
                            Découvrir des anime
                        </Link>
                    </div>
                ) : watchlist.length === 0 ? (
                    <div className="text-center py-20">
                        <Bookmark className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                        <h2 className="text-xl font-semibold text-foreground mb-2">
                            {filterType === "favorites" ? "Aucun favori" : "Aucun résultat"}
                        </h2>
                        <p className="text-muted-foreground mb-6">
                            {filterType === "favorites"
                                ? "Ajoutez des anime à vos favoris pour les retrouver ici."
                                : "Aucun anime ne correspond à vos filtres."}
                        </p>
                    </div>
                ) : viewMode === "grid" ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-8">
                        {watchlist?.map((anime, index) => (
                            <AnimeCard
                                key={anime.id}
                                anime={anime}
                                index={index}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {watchlist?.map((anime) => (
                            <WatchlistListItem key={anime.id} anime={anime} />
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
}: {
    anime: EnrichedWatchlistItem
}) {
    const [imageError, setImageError] = useState(false)
    const animeColor = anime.color || anime.anilistColor || "hsl(var(--primary))"

    return (
        <Link
            href={`/anime/${anime.anilistId || anime.crunchyrollId}?cr=${anime.crunchyrollId}`}
            className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary/50 transition-all duration-300 group relative overflow-hidden"
        >
            {/* Color accent bar */}
            <div
                className="absolute left-0 top-0 bottom-0 w-1"
                style={{ backgroundColor: animeColor }}
            />

            {/* Image */}
            <div className="w-16 h-24 rounded-lg overflow-hidden flex-shrink-0 ml-2">
                <img
                    src={imageError ? "/placeholder.svg?height=96&width=64&query=anime" : (anime.anilistImage || anime.image)}
                    alt={anime.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={() => setImageError(true)}
                />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <h3
                    className="font-semibold line-clamp-1 transition-colors"
                    style={{ color: animeColor }}
                >
                    {anime.seriesTitle || anime.title}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                    {anime.description}
                </p>
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    {/* Score */}
                    {anime.score && (
                        <span
                            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-white"
                            style={{ backgroundColor: animeColor }}
                        >
                            <Star className="w-3 h-3" fill="currentColor" />
                            {anime.score.toFixed(1)}
                        </span>
                    )}
                    {anime.episodeCount > 0 && (
                        <span>{anime.episodeCount} épisodes</span>
                    )}
                    {anime.seasonCount > 0 && (
                        <>
                            <span>•</span>
                            <span>{anime.seasonCount} saison{anime.seasonCount > 1 ? 's' : ''}</span>
                        </>
                    )}
                </div>
            </div>

            {/* Badges */}
            <div className="flex flex-col items-end gap-2">
                {anime.isFavorite && (
                    <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/20 text-red-500 text-xs font-medium">
                        <Heart className="w-3 h-3" fill="currentColor" />
                        Favori
                    </span>
                )}
                <div className="flex items-center gap-1">
                    {anime.isDubbed && (
                        <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-500 text-xs font-medium">
                            VF
                        </span>
                    )}
                    {anime.isSubbed && (
                        <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-500 text-xs font-medium">
                            VOSTFR
                        </span>
                    )}
                </div>
            </div>
        </Link>
    )
}

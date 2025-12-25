"use client"

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react"
import { useCrunchyrollAccount, useCrunchyrollWatchlist } from "./use-crunchyroll"
import { searchAnimeBasicInfo, type AnimeBasicInfo } from "@/lib/anilist"
import type { TransformedWatchlistItem } from "@/lib/crunchyroll"

// ===============================
// Types
// ===============================

export interface EnrichedWatchlistItem extends TransformedWatchlistItem {
    anilistId?: number
    anilistColor?: string
    anilistScore?: number
    anilistGenres?: string[]
    anilistImage?: string
}

interface WatchlistContextValue {
    // Data
    watchlist: EnrichedWatchlistItem[]
    isLoading: boolean

    // Methods to check if anime is in watchlist
    isInWatchlist: (crunchyrollId: string) => boolean
    isInWatchlistBySeriesId: (seriesId: string) => boolean
    isInWatchlistByTitle: (title: string) => boolean

    // Get watchlist item
    getWatchlistItem: (crunchyrollId: string) => EnrichedWatchlistItem | undefined
    getWatchlistItemBySeriesId: (seriesId: string) => EnrichedWatchlistItem | undefined

    // Refresh
    refresh: () => void

    // Stats
    totalCount: number
    favoritesCount: number
}

// ===============================
// Context
// ===============================

const WatchlistContext = createContext<WatchlistContextValue | null>(null)

// ===============================
// Provider
// ===============================

export function WatchlistProvider({ children }: { children: React.ReactNode }) {
    const [enrichedWatchlist, setEnrichedWatchlist] = useState<EnrichedWatchlistItem[]>([])
    const [isEnriching, setIsEnriching] = useState(false)

    // Get account ID first
    const { data: account, isLoading: accountLoading } = useCrunchyrollAccount()

    // Get watchlist using account ID
    const {
        data: rawWatchlist,
        isLoading: watchlistLoading,
        mutate: refreshWatchlist
    } = useCrunchyrollWatchlist(
        account?.account_id || null,
        {
            n: 200,
            order: 'desc',
            sort_by: 'date_updated',
        }
    )

    const isLoading = accountLoading || watchlistLoading || isEnriching

    // Enrich watchlist with AniList data
    useEffect(() => {
        if (!rawWatchlist || rawWatchlist.length === 0) {
            setEnrichedWatchlist([])
            return
        }

        const enrichWatchlist = async () => {
            setIsEnriching(true)

            const enriched: EnrichedWatchlistItem[] = []

            // Process in batches to avoid rate limiting
            for (const item of rawWatchlist) {
                try {
                    // Try to find matching anime on AniList
                    const anilistData = await searchAnimeBasicInfo(item.seriesTitle || item.title)

                    if (anilistData) {
                        enriched.push({
                            ...item,
                            anilistId: anilistData.id,
                            anilistColor: anilistData.color || undefined,
                            anilistScore: anilistData.score || undefined,
                            anilistGenres: anilistData.genres,
                            anilistImage: anilistData.image,
                            // Override with AniList data if available
                            color: anilistData.color || undefined,
                            score: anilistData.score || undefined,
                        })
                    } else {
                        enriched.push(item)
                    }
                } catch (error) {
                    console.error(`[Watchlist] Failed to enrich ${item.title}:`, error)
                    enriched.push(item)
                }
            }

            setEnrichedWatchlist(enriched)
            setIsEnriching(false)
        }

        enrichWatchlist()
    }, [rawWatchlist])

    // Memoized lookup maps for O(1) lookups
    const lookupMaps = useMemo(() => {
        const byId = new Map<string, EnrichedWatchlistItem>()
        const bySeriesId = new Map<string, EnrichedWatchlistItem>()
        const byTitle = new Map<string, EnrichedWatchlistItem>()

        for (const item of enrichedWatchlist) {
            if (item.crunchyrollId) {
                byId.set(item.crunchyrollId, item)
            }
            if (item.seriesId) {
                bySeriesId.set(item.seriesId, item)
            }
            if (item.title) {
                byTitle.set(item.title.toLowerCase(), item)
            }
            if (item.seriesTitle && item.seriesTitle !== item.title) {
                byTitle.set(item.seriesTitle.toLowerCase(), item)
            }
        }

        return { byId, bySeriesId, byTitle }
    }, [enrichedWatchlist])

    // Methods
    const isInWatchlist = useCallback((crunchyrollId: string): boolean => {
        return lookupMaps.byId.has(crunchyrollId) || lookupMaps.bySeriesId.has(crunchyrollId)
    }, [lookupMaps])

    const isInWatchlistBySeriesId = useCallback((seriesId: string): boolean => {
        return lookupMaps.bySeriesId.has(seriesId)
    }, [lookupMaps])

    const isInWatchlistByTitle = useCallback((title: string): boolean => {
        const normalizedTitle = title.toLowerCase()

        // Direct match
        if (lookupMaps.byTitle.has(normalizedTitle)) {
            return true
        }

        // Fuzzy match - check if any watchlist title contains the search title or vice versa
        for (const [watchlistTitle] of lookupMaps.byTitle) {
            if (watchlistTitle.includes(normalizedTitle) || normalizedTitle.includes(watchlistTitle)) {
                return true
            }
        }

        return false
    }, [lookupMaps])

    const getWatchlistItem = useCallback((crunchyrollId: string): EnrichedWatchlistItem | undefined => {
        return lookupMaps.byId.get(crunchyrollId) || lookupMaps.bySeriesId.get(crunchyrollId)
    }, [lookupMaps])

    const getWatchlistItemBySeriesId = useCallback((seriesId: string): EnrichedWatchlistItem | undefined => {
        return lookupMaps.bySeriesId.get(seriesId)
    }, [lookupMaps])

    const refresh = useCallback(() => {
        refreshWatchlist()
    }, [refreshWatchlist])

    // Stats
    const totalCount = enrichedWatchlist.length
    const favoritesCount = enrichedWatchlist.filter(item => item.isFavorite).length

    const value: WatchlistContextValue = {
        watchlist: enrichedWatchlist,
        isLoading,
        isInWatchlist,
        isInWatchlistBySeriesId,
        isInWatchlistByTitle,
        getWatchlistItem,
        getWatchlistItemBySeriesId,
        refresh,
        totalCount,
        favoritesCount,
    }

    return (
        <WatchlistContext.Provider value={value}>
            {children}
        </WatchlistContext.Provider>
    )
}

// ===============================
// Hook
// ===============================

export function useWatchlist() {
    const context = useContext(WatchlistContext)
    if (!context) {
        throw new Error("useWatchlist must be used within a WatchlistProvider")
    }
    return context
}

// Optional hook that doesn't throw if not in provider (returns null)
export function useWatchlistOptional() {
    return useContext(WatchlistContext)
}

"use client"

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react"
import { useCrunchyrollAccount, useCrunchyrollWatchlist } from "./use-crunchyroll"
import { searchAnimeBasicInfo, type TransformedAnime } from "@/lib/anilist"
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

    // Mutations
    addToWatchlist: (contentId: string) => Promise<boolean>
    removeFromWatchlist: (contentId: string) => Promise<boolean>

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

    // Display data immediately, do not wait for enrichment
    const isLoading = accountLoading || watchlistLoading
    // Note: isEnriching is used only for background indicator if needed, but shouldn't block UI

    // Enrich watchlist with AniList data
    useEffect(() => {
        if (!rawWatchlist || rawWatchlist.length === 0) {
            setEnrichedWatchlist([])
            return
        }

        // Initialize with raw data immediately so user sees something
        setEnrichedWatchlist(prev => {
            // If we already have enriched items that match the new raw list, keep them (to prevent flashing)
            // But if rawList changed significantly, we might want to reset. 
            // For now, map raw items to EnrichedWatchlistItem structure
            if (prev.length > 0 && prev[0].crunchyrollId === rawWatchlist[0].crunchyrollId) return prev;
            return rawWatchlist.map(item => ({ ...item }))
        })

        const enrichWatchlist = async () => {
            setIsEnriching(true)
            const enrichedMap = new Map<string, EnrichedWatchlistItem>();

            // Pre-fill with raw data
            rawWatchlist.forEach(item => {
                if (item.crunchyrollId) enrichedMap.set(item.crunchyrollId, { ...item });
            });

            // Process in batches
            // optimization: Check cache first to avoid delays
            const { getCache, sanitizeKey } = await import("@/lib/anilist");

            for (let i = 0; i < rawWatchlist.length; i++) {
                const item = rawWatchlist[i]
                if (!item.crunchyrollId) continue;

                try {
                    const cacheKey = `basic_info_${sanitizeKey(item.seriesTitle || item.title)}`
                    // @ts-ignore - Dynamic import typing issue
                    const cached = await getCache(cacheKey) as TransformedAnime | null

                    if (cached) {
                        // Immediate update from cache
                        const updated: EnrichedWatchlistItem = {
                            ...item,
                            anilistId: cached.id,
                            anilistColor: cached.color || undefined,
                            anilistScore: cached.score || undefined,
                            anilistGenres: cached.genres,
                            anilistImage: cached.image,
                            color: cached.color || undefined,
                            score: cached.score || undefined,
                        }
                        enrichedMap.set(item.crunchyrollId, updated)
                        // Trigger update periodically or at end? 
                        // Updating state inside loop can cause too many rerenders.
                        // Let's batch updates or just do it at the end?
                        // For a long list, we want *some* progress.
                        // But React state updates are batched usually.
                    } else {
                        // Needs API fetch
                        // Add delay only if we are actually fetching
                        if (i > 0) await new Promise(resolve => setTimeout(resolve, 800))

                        let anilistData = await searchAnimeBasicInfo(item.seriesTitle || item.title)

                        if (!anilistData) {
                            const { searchJikanBasicInfo } = await import("@/lib/jikan")
                            anilistData = await searchJikanBasicInfo(item.seriesTitle || item.title)
                        }

                        if (anilistData) {
                            const updated = {
                                ...item,
                                anilistId: anilistData.id,
                                anilistColor: anilistData.color || undefined,
                                anilistScore: anilistData.score || undefined,
                                anilistGenres: anilistData.genres,
                                anilistImage: anilistData.image,
                                color: anilistData.color || undefined,
                                score: anilistData.score || undefined,
                            }
                            enrichedMap.set(item.crunchyrollId, updated)
                        }
                    }
                } catch {
                    // Ignore errors
                }
            }

            // Final update after all processed
            setEnrichedWatchlist(Array.from(enrichedMap.values()))
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

    // Mutation methods
    const addToWatchlist = useCallback(async (contentId: string) => {
        if (!account?.account_id) return false
        const success = await import("@/lib/crunchyroll").then(mod => mod.addToWatchlist(account.account_id, contentId))
        if (success) refresh()
        return success
    }, [account, refresh])

    const removeFromWatchlist = useCallback(async (contentId: string) => {
        if (!account?.account_id) return false
        const success = await import("@/lib/crunchyroll").then(mod => mod.removeFromWatchlist(account.account_id, contentId))
        if (success) refresh()
        return success
    }, [account, refresh])

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
        addToWatchlist,
        removeFromWatchlist,
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

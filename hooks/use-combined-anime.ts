"use client"

import useSWR from "swr"
import { useState, useCallback, useEffect, useMemo } from "react"
import {
    enrichAnimeList,
    enrichAnimeListWithFallback,
    searchAnimeBasicInfo,
    getAnimeDetails,
    searchAnime,
    getTrendingAnime,
    getPopularAnime,
    getNewAnime,
    getSimulcastAnime,
    getAiringSchedule,
    mapCrunchyrollToAnime,
    type TransformedAnime,
    type AnimeDetails,
} from "@/lib/anilist"
import {
    checkAnimeAvailability,
    getStarRating,
    getCrunchyrollCatalog,
    getAllSeriesEpisodes,
    getSeries,
    getHomeFeed,
    browseCrunchyroll,
    type TransformedCrunchyrollAnime,
    type TransformedCrunchyrollEpisode,
    type CrunchyrollSeries,
} from "@/lib/crunchyroll"

// ===============================
// Types for combined data
// ===============================

export interface CombinedAnime extends TransformedAnime {
    anilistId?: number | null
    combinedScore?: number
    popularityScore?: number
    crunchyrollId: string | null
    crunchyrollSlug: string | null
    isOnCrunchyroll: boolean
    crunchyrollInfo: TransformedCrunchyrollAnime | null
}

export interface CombinedAnimeDetails extends AnimeDetails {
    crunchyrollId: string | null
    crunchyrollSlug: string | null
    isOnCrunchyroll: boolean
    crunchyrollInfo: TransformedCrunchyrollAnime | null
    crunchyrollEpisodes: TransformedCrunchyrollEpisode[]
}

// ===============================
// Main Hook Refactored: Crunchyroll First with AniList Fallback
// ===============================

export function useCombinedAnime(category: 'trending' | 'popular' | 'new' | 'simulcast', page = 1, perPage = 20) {
    const { data: finalData, isLoading, error } = useSWR(
        `combined-${category}-${page}-${perPage}`,
        async () => {
            // 1. Fetch CR Data
            const start = (page - 1) * perPage
            let crData: CrunchyrollSeries[] = []
            let crError = null

            try {
                switch (category) {
                    case 'trending':
                        crData = await browseCrunchyroll({ n: perPage, start, sort_by: 'popularity' })
                        break
                    case 'popular':
                        crData = await browseCrunchyroll({ n: perPage, start, sort_by: 'popularity' })
                        break
                    case 'new':
                        crData = await browseCrunchyroll({ n: perPage, start, sort_by: 'newly_added' })
                        break
                    case 'simulcast':
                        // Import locally to avoid circular dependencies
                        const { getSimulcastSeries } = await import("@/lib/crunchyroll")
                        crData = await getSimulcastSeries(perPage)
                        break
                    default:
                        crData = []
                }
            } catch (e) {
                console.warn(`[CombinedAnime] CR Fetch failed for ${category}`, e)
                // Fallback: Fetch from AniList and match with CR
                // 1. Get Top Anime from AniList (this gives us the base "Popular" list from AL perspective)
                const alAnimes = await getPopularAnime(page, perPage)

                // 2. Identify which ones are on Crunchyroll
                // We need to check availability for each
                const results = await Promise.all(
                    alAnimes.map(async (anime) => {
                        // anime.title is already a string (cleaned) in TransformedAnime
                        const title = anime.title || anime.titleRomaji
                        const crInfo = await checkAnimeAvailability(title)

                        if (crInfo) {
                            let crRating = crInfo.crRating || 0
                            let crVoteCount = crInfo.crVoteCount || 0

                            // If no rating from series metadata, try explicit fetch
                            if (crRating === 0) {
                                try {
                                    const ratingData = await getStarRating(crInfo.crunchyrollId)
                                    if (ratingData) {
                                        crRating = ratingData.average
                                        crVoteCount = ratingData.count
                                    }
                                } catch (e) {
                                    // ignore
                                }
                            }

                            return {
                                ...anime,
                                isOnCrunchyroll: true,
                                crunchyrollInfo: crInfo,
                                crRating,
                                crVoteCount
                            }
                        }
                        return { ...anime, isOnCrunchyroll: false }
                    })
                )

                // Filter valid
                return results.filter(a => a.isOnCrunchyroll)
            }

            // 2. If CR succeeded, Enrich with AniList (CACHE VISIBLE HERE due to async lookups)
            if (crData && crData.length > 0) {
                // Use enrichment with fallback to cache if rate-limited
                const enriched = await enrichAnimeListWithFallback(crData)
                let results = enriched.map((item, index) => {
                    const original = crData[index]
                    return {
                        ...item,
                        crunchyrollId: original.id,
                        crunchyrollSlug: original.slug_title,
                        isOnCrunchyroll: true,
                        crunchyrollInfo: original as unknown as TransformedCrunchyrollAnime, // This cast is getting messy, but original is CrunchyrollSeries
                        // We need to map the CR rating here if we want to sort by it
                        crRating: (original as any).series_metadata?.star_rating || (original as any).star_rating || (original as any).series_metadata?.rating?.average || 0,
                        crVoteCount: (original as any).series_metadata?.vote_count || (original as any).series_metadata?.rating?.total || 0
                    }
                })

                // Filter 'new' category to only show current/recent years (2025-2026+)
                if (category === 'new') {
                    const currentYear = new Date().getFullYear()
                    results = results.filter(anime =>
                        (anime.year && (anime.year >= currentYear || anime.year >= 2025))
                    )
                }

                return results
            }

            // 3. Fallback REMOVED to ensure strict CR availability
            if (crError) {
                console.warn(`[CombinedAnime] CR failed for ${category}, returning empty list to avoid non-CR content.`)
                return []
            }

            return []
        },
        {
            revalidateOnFocus: false,
            keepPreviousData: true,
            shouldRetryOnError: true,
            errorRetryCount: 3,
            errorRetryInterval: 2000,
            dedupingInterval: 60000
        }
    )

    return {
        data: finalData,
        isLoading,
        error
    }
}

// ===============================
// Other Helper Functions
// ===============================

export async function searchWithCrunchyroll(query: string, page: number, perPage: number): Promise<CombinedAnime[]> {
    // 1. Search Crunchyroll DIRECTLY (No AniList search first)
    // We import locally to avoid circular deps if any, though imports seem fine.
    const { searchCrunchyroll } = await import("@/lib/crunchyroll")

    try {
        const crResults = await searchCrunchyroll(query, perPage)

        if (!crResults || !crResults.items || crResults.items.length === 0) {
            return []
        }

        // Filter for series
        const seriesItems = crResults.items.filter(i => i.type === 'series')

        if (seriesItems.length === 0) return []

        // Cast to CrunchyrollSeries for enrichment (structures are compatible enough for enrichment needs)
        const crSeries = seriesItems as unknown as CrunchyrollSeries[]

        // 2. Enrich with AniList
        const enriched = await enrichAnimeList(crSeries)

        // 3. Map to CombinedAnime
        return enriched.map((item, index) => {
            const original = crSeries[index]
            return {
                ...item,
                crunchyrollId: original.id,
                crunchyrollSlug: original.slug_title,
                isOnCrunchyroll: true,
                crunchyrollInfo: original as unknown as TransformedCrunchyrollAnime
            }
        })

    } catch (e) {
        console.warn("[Search] CR Search failed", e)
        return []
    }
}

export async function fetchAnimeDetailsWithCrunchyroll(
    anilistId: number | null,
    knownCrunchyrollId?: string | null
): Promise<CombinedAnimeDetails | null> {
    // **CRITICAL: Return Crunchyroll data IMMEDIATELY, don't wait for AniList**
    // We'll enrich in background via useEffect (in useAnimeDetails hook)
    
    // If we have no crunchyrollId and no anilistId, we can't get anything
    if (!knownCrunchyrollId && !anilistId) return null

    let match: TransformedCrunchyrollAnime | undefined = undefined
    let episodes: TransformedCrunchyrollEpisode[] = []

    try {
        if (knownCrunchyrollId) {
            // Fast path: we already know the CR ID — fetch Crunchyroll data immediately
            const seriesInfo = await getSeries(knownCrunchyrollId)
            if (seriesInfo) {
                match = {
                    crunchyrollId: knownCrunchyrollId,
                    title: seriesInfo.title || '',
                    slug: seriesInfo.slug_title || '',
                    episodeCount: seriesInfo.series_metadata?.episode_count || 0,
                    seasonCount: seriesInfo.series_metadata?.season_count || 0,
                    isDubbed: seriesInfo.series_metadata?.is_dubbed || false,
                    isSubbed: seriesInfo.series_metadata?.is_subbed ?? true,
                    crRating: seriesInfo.series_metadata?.star_rating
                        || seriesInfo.series_metadata?.rating?.average || 0,
                    crVoteCount: seriesInfo.series_metadata?.vote_count
                        || seriesInfo.series_metadata?.rating?.total || 0,
                }
                // Fetch episodes asynchronously (these are usually quick)
                try {
                    episodes = await getAllSeriesEpisodes(knownCrunchyrollId)
                } catch {
                    episodes = []
                }
            }
        }
    } catch (e) {
        console.warn("[Details] CR fetch failed", e)
    }

    // Build minimal base from Crunchyroll data only
    // AniList enrichment happens in background via useEffect in the hook
    const base: CombinedAnimeDetails = {
        id: 0,
        title: match?.title || '',
        titleRomaji: match?.title || '',
        titleNative: null,
        description: null,
        image: '/placeholder.svg',
        bannerImage: null,
        genres: [],
        rating: '',
        score: null,
        popularity: 0,
        duration: null,
        status: 'UNKNOWN',
        season: null,
        year: null,
        format: null,
        source: null,
        color: null,
        nextEpisode: null,
        isCrunchyroll: true,
        studio: null,
        studios: [],
        externalLinks: [],
        trailer: null,
        startDate: null,
        endDate: null,
        episodes: match?.episodeCount || null,
        staff: [],
        characters: [],
        relations: [],
        recommendations: [],
        crunchyrollId: match?.crunchyrollId || null,
        crunchyrollSlug: match?.slug || null,
        isOnCrunchyroll: !!match,
        crunchyrollInfo: match || null,
        crunchyrollEpisodes: episodes,
    }

    return base
}

// ===============================
// Category-specific hooks
// ===============================

export function useTrendingAnime(page = 1, perPage = 20) {
    return useCombinedAnime('trending', page, perPage)
}

/**
 * Hook for loading all popular anime with progressive loading (infinite scroll)
 * Supports loading more items via offset and automatically filters duplicates
 * 
 * Strategy:
 * 1. Load Crunchyroll data first (fast, no rate limit)
 * 2. Return Crunchyroll data immediately to user
 * 3. Enrich with AniList in background with throttling
 * 4. If AniList fails/rate limited, fallback to Jikan automatically
 */
export function usePopularAnimeInfinite(perPage = 20) {
    const [offset, setOffset] = useState(0)
    const [allAnimes, setAllAnimes] = useState<CombinedAnime[]>([])
    const [hasMore, setHasMore] = useState(true)
    const [isLoadingMore, setIsLoadingMore] = useState(false)
    const [enrichmentProgress, setEnrichmentProgress] = useState(0)

    const { data: batch, isLoading: isBatchLoading, error } = useSWR(
        `api-popular-batch-${offset}`,
        async () => {
            try {
                const limit = 50 // Load in batches of 50
                const response = await fetch(`/api/populaire?limit=${limit}&offset=${offset}&sortBy=combined`)
                
                if (!response.ok) {
                    throw new Error('Failed to fetch popular anime')
                }
                
                const json = await response.json()
                const items = json.data || []

                // Check if we have more items to load
                if (items.length < limit) {
                    setHasMore(false)
                }

                // ============================================================
                // CRITICAL: Return ONLY Crunchyroll data immediately
                // Enrichment happens in background (in useEffect)
                // ============================================================
                
                const crunchyrollOnlyAnimes = items.map((item: any) => {
                    const popularityScore = Math.round(((item.combined?.score || 0) * 20) * 10) / 10
                    const crAverage = parseFloat(item.crunchyroll?.rating?.average || "0")
                    
                    return {
                        id: parseInt(item.id, 36) || Math.floor(Math.random() * 1_000_000),
                        title: item.title,
                        titleRomaji: item.title,
                        titleNative: null,
                        description: item.description ?? '',
                        image: item.images?.poster_tall?.[0]?.[item.images.poster_tall[0].length - 1]?.source || '/placeholder.png',
                        bannerImage: item.images?.banner?.[0]?.[item.images.banner[0].length - 1]?.source || null,
                        genres: [],
                        rating: crAverage > 0 ? `${crAverage.toFixed(1)}/10` : '12+',
                        score: popularityScore,
                        popularity: parseInt(String(item.crunchyroll?.rating?.total || '0')),
                        duration: null,
                        status: 'RELEASING',
                        season: null,
                        year: new Date().getFullYear(),
                        format: 'TV',
                        source: null,
                        color: null,
                        nextEpisode: null,
                        isCrunchyroll: true,
                        studio: null,
                        studios: [],
                        externalLinks: [],
                        trailer: null,
                        startDate: null,
                        endDate: null,
                        episodes: null,
                        crunchyrollId: item.id,
                        crunchyrollSlug: item.id,
                        isOnCrunchyroll: true,
                        crunchyrollInfo: {
                            crunchyrollId: item.id,
                            title: item.title,
                            slug: item.id,
                            episodeCount: 0,
                            seasonCount: 1,
                            isDubbed: true,
                            isSubbed: true,
                            crRating: crAverage,
                            crVoteCount: parseInt(String(item.crunchyroll.rating?.total || '0'))
                        },
                        combinedScore: item.combined?.score || 0,
                        popularityScore: item.combined?.popularityScore || 0
                    } as CombinedAnime
                })
                
                // Return immediately - NO await on enrichment
                return crunchyrollOnlyAnimes
            } catch (err) {
                console.error('[usePopularAnimeInfinite] Error:', err)
                setHasMore(false)
                return []
            }
        },
        {
            revalidateOnFocus: false,
            dedupingInterval: 0,
        }
    )

    // Merge new batch with existing animes
    useEffect(() => {
        if (batch && batch.length > 0) {
            setAllAnimes(prev => {
                const existingIds = new Set(prev.map(a => a.id))
                const newItems = batch.filter(anime => !existingIds.has(anime.id))
                return [...prev, ...newItems]
            })
        }
    }, [batch])

    // BACKGROUND enrichment (non-blocking) - progressively updates animes as they enrich
    useEffect(() => {
        if (!batch || batch.length === 0) return

        let cancelled = false

        const enrichBatch = async () => {
            const { throttledSearchAnimeBasicInfoWithFallback } = await import("@/lib/anilist")
            let enrichedCount = 0

            for (const anime of batch as CombinedAnime[]) {
                if (cancelled) break

                try {
                    const enrichedData = await throttledSearchAnimeBasicInfoWithFallback(
                        anime.title,
                        anime // Pass Crunchyroll data as fallback if AniList fails
                    )
                    
                    if (enrichedData && !cancelled) {
                        // Merge enriched data with Crunchyroll base
                        const merged: CombinedAnime = {
                            ...anime,
                            ...enrichedData,
                            // Preserve Crunchyroll-specific fields
                            crunchyrollId: anime.crunchyrollId,
                            crunchyrollSlug: anime.crunchyrollSlug,
                            isOnCrunchyroll: true,
                            crunchyrollInfo: anime.crunchyrollInfo,
                            combinedScore: anime.combinedScore,
                            popularityScore: anime.popularityScore
                        }
                        
                        // Update individual anime when enriched (progressive update)
                        setAllAnimes(prev => prev.map(a => a.id === merged.id ? merged : a))
                        enrichedCount++
                        setEnrichmentProgress(Math.round((enrichedCount / batch.length) * 100))
                    }
                } catch (e) {
                    console.warn(`[Enrichment] Failed for "${anime.title}":`, e)
                }
            }
            
            if (!cancelled) {
                setEnrichmentProgress(0)
            }
        }

        enrichBatch()

        return () => {
            cancelled = true // Cleanup on unmount
        }
    }, [batch])

    const loadMore = useCallback(() => {
        if (!isLoadingMore && hasMore) {
            setIsLoadingMore(true)
            setOffset(prev => prev + 50)
            // Delay to ensure SWR picks up the new offset
            setTimeout(() => setIsLoadingMore(false), 100)
        }
    }, [hasMore, isLoadingMore])

    return {
        data: allAnimes,
        isLoading: isBatchLoading,
        isLoadingMore,
        hasMore,
        error,
        enrichmentProgress,
        loadMore
    }
}

/**
 * Legacy hook for pagination-based loading (kept for backward compatibility)
 * Returns Crunchyroll data immediately, enriches in background
 */
export function usePopularAnime(page = 1, perPage = 20) {
    const [enrichedMap, setEnrichedMap] = useState<Map<string, CombinedAnime>>(new Map())
    
    const { data: crunchyrollData, isLoading, error } = useSWR(
        `api-popular-all`,
        async () => {
            try {
                // Return ONLY Crunchyroll data immediately (max 500)
                const limit = 500
                const response = await fetch(`/api/populaire?limit=${limit}&offset=0&sortBy=combined`)
                
                if (!response.ok) {
                    throw new Error('Failed to fetch popular anime')
                }
                
                const json = await response.json()
                const items = json.data || []

                // Map Crunchyroll data only (no enrichment in SWR)
                return items.map((item: any) => {
                    const popularityScore = Math.round(((item.combined?.score || 0) * 20) * 10) / 10
                    const crAverage = parseFloat(item.crunchyroll?.rating?.average || "0")
                    const fallbackId = parseInt(item.id, 36) || Math.floor(Math.random() * 1_000_000)

                    return {
                        id: fallbackId,
                        title: item.title,
                        titleRomaji: item.title,
                        titleNative: null,
                        description: item.description ?? '',
                        image: item.images?.poster_tall?.[0]?.[item.images.poster_tall[0].length - 1]?.source || '/placeholder.png',
                        bannerImage: item.images?.banner?.[0]?.[item.images.banner[0].length - 1]?.source || null,
                        genres: [],
                        rating: crAverage > 0 ? `${crAverage.toFixed(1)}/10` : '12+',
                        score: popularityScore,
                        popularity: parseInt(String(item.crunchyroll?.rating?.total || '0')),
                        duration: null,
                        status: 'RELEASING',
                        season: null,
                        year: new Date().getFullYear(),
                        format: 'TV',
                        source: null,
                        color: null,
                        nextEpisode: null,
                        isCrunchyroll: true,
                        studio: null,
                        studios: [],
                        externalLinks: [],
                        trailer: null,
                        startDate: null,
                        endDate: null,
                        episodes: null,
                        crunchyrollId: item.id,
                        crunchyrollSlug: item.id,
                        isOnCrunchyroll: true,
                        crunchyrollInfo: {
                            crunchyrollId: item.id,
                            title: item.title,
                            slug: item.id,
                            episodeCount: 0,
                            seasonCount: 1,
                            isDubbed: true,
                            isSubbed: true,
                            crRating: crAverage,
                            crVoteCount: parseInt(String(item.crunchyroll.rating?.total || '0'))
                        },
                        combinedScore: item.combined?.score || 0,
                        popularityScore: item.combined?.popularityScore || 0,
                        // Mark as CR-only until enriched
                        _sourceId: item.id
                    } as CombinedAnime
                })
            } catch (err) {
                console.error('[usePopularAnime] Error:', err)
                throw err
            }
        },
        {
            revalidateOnFocus: false,
            dedupingInterval: 0,
        }
    )

    // Background enrichment for current page slice
    useEffect(() => {
        if (!crunchyrollData || crunchyrollData.length === 0) return

        let cancelled = false

        const enrichCurrentPage = async () => {
            const { throttledSearchAnimeBasicInfoWithFallback } = await import("@/lib/anilist")
            const start = (page - 1) * perPage
            const end = start + perPage
            const pageItems = crunchyrollData.slice(start, end) as CombinedAnime[]

            for (const anime of pageItems) {
                if (cancelled) break

                try {
                    const enrichedData = await throttledSearchAnimeBasicInfoWithFallback(
                        anime.title,
                        anime
                    )
                    
                    if (enrichedData && !cancelled) {
                        const merged: CombinedAnime = {
                            ...anime,
                            ...enrichedData,
                            crunchyrollId: anime.crunchyrollId,
                            crunchyrollSlug: anime.crunchyrollSlug,
                            isOnCrunchyroll: true,
                            crunchyrollInfo: anime.crunchyrollInfo,
                            combinedScore: anime.combinedScore,
                            popularityScore: anime.popularityScore
                        }
                        
                        setEnrichedMap(prev => {
                            const newMap = new Map(prev)
                            newMap.set(anime.id.toString(), merged)
                            return newMap
                        })
                    }
                } catch (e) {
                    console.warn(`[PopularAnime Enrichment] Failed for "${anime.title}":`, e)
                }
            }
        }

        enrichCurrentPage()

        return () => {
            cancelled = true
        }
    }, [crunchyrollData, page, perPage])

    // Merge Crunchyroll data with enriched data
    const allData = crunchyrollData
        ? crunchyrollData.map(anime => enrichedMap.get(anime.id.toString()) || anime)
        : []

    // Pagination côté client
    const start = (page - 1) * perPage
    const end = start + perPage
    const pageSlice = allData.slice(start, end)

    return {
        data: pageSlice,
        isLoading,
        error
    }
}

export function useNewAnime(page = 1, perPage = 20) {
    return useCombinedAnime('new', page, perPage)
}

export function useSimulcastAnime(page = 1, perPage = 20) {
    return useCombinedAnime('simulcast', page, perPage)
}

// Hook for anime details page - returns Crunchyroll immediately, enriches AniList in background
export function useAnimeDetails(anilistId: number | null, crunchyrollId?: string | null) {
    const [enrichedAnime, setEnrichedAnime] = useState<CombinedAnimeDetails | null>(null)
    
    // Build stable cache key for SWR
    const cacheKey = crunchyrollId
        ? `anime-details-cr-${crunchyrollId}`
        : anilistId
            ? `anime-details-al-${anilistId}`
            : null

    // Fetch Crunchyroll data immediately (no AniList wait)
    const { data: crunchyrollData, isLoading, error } = useSWR(
        cacheKey,
        () => fetchAnimeDetailsWithCrunchyroll(anilistId, crunchyrollId),
        {
            revalidateOnFocus: false,
            dedupingInterval: 300000,
        }
    )

    // Background enrichment with AniList if we have an anilistId
    useEffect(() => {
        if (!anilistId || !crunchyrollData) return

        let cancelled = false

        const enrichWithAniList = async () => {
            try {
                const anilistDetails = await getAnimeDetails(anilistId)
                
                if (!cancelled && anilistDetails) {
                    // Merge AniList enrichment into Crunchyroll data
                    const enriched: CombinedAnimeDetails = {
                        ...crunchyrollData,
                        ...anilistDetails,
                        // Preserve Crunchyroll-specific fields
                        crunchyrollId: crunchyrollData.crunchyrollId,
                        crunchyrollSlug: crunchyrollData.crunchyrollSlug,
                        isOnCrunchyroll: crunchyrollData.isOnCrunchyroll,
                        crunchyrollInfo: crunchyrollData.crunchyrollInfo,
                        crunchyrollEpisodes: crunchyrollData.crunchyrollEpisodes,
                    }
                    
                    setEnrichedAnime(enriched)
                }
            } catch (e) {
                console.warn("[AnimeDetails Enrichment] Failed for AniList ID", anilistId, e)
                // Keep Crunchyroll-only data if AniList fails
            }
        }

        enrichWithAniList()

        return () => {
            cancelled = true
        }
    }, [anilistId, crunchyrollData])

    // Return Crunchyroll data immediately, enriched data if available
    const anime = enrichedAnime || crunchyrollData

    return {
        anime,
        isLoading,
        error,
    }
}

// Hook for combined search
export function useCombinedSearch(query: string, page = 1, perPage = 20) {
    return useSWR(
        query.length >= 2 ? `combined-search-${query}-${page}-${perPage}` : null,
        () => searchWithCrunchyroll(query, page, perPage),
        { revalidateOnFocus: false }
    )
}

// Alias for search
export const useSearchAnime = useCombinedSearch

// Helper for schedule
export function useAiringSchedule(page = 1, perPage = 20) {
    const { data, isLoading, error } = useSWR(
        `anilist-airing-${page}-${perPage}`,
        async () => {
            const mod = await import("@/lib/anilist")
            return mod.getAiringSchedule(page, perPage)
        },
        { revalidateOnFocus: false }
    )
    return { data, isLoading, error }
}

// ===============================
// Movies (movie_listing) infinite hook
// ===============================
export function useMoviesInfinite(perPage = 50) {
    const [offset, setOffset] = useState(0)
    const [allMovies, setAllMovies] = useState<CombinedAnime[]>([])
    const [hasMore, setHasMore] = useState(true)
    const [isLoadingMore, setIsLoadingMore] = useState(false)

    const { data: batch, isLoading, error } = useSWR(
        `cr-movies-batch-${offset}`,
        async (): Promise<CombinedAnime[]> => {
            const { browseMovieListings } = await import("@/lib/crunchyroll")
            const limit = perPage
            const movies = await browseMovieListings({ n: limit, start: offset, sort_by: 'popularity' })

            if (movies.length < limit) setHasMore(false)

            return movies.map((m, _idx): CombinedAnime => {
                const bestPoster = m.images?.poster_tall?.[0]?.[
                    (m.images.poster_tall[0].length ?? 1) - 1
                ]?.source ||
                    m.images?.poster_wide?.[0]?.[(m.images.poster_wide[0].length ?? 1) - 1]?.source ||
                    '/placeholder.png'
                const bestBanner = m.images?.poster_wide?.[0]?.[
                    (m.images.poster_wide[0].length ?? 1) - 1
                ]?.source || null

                return {
                    // Use the Crunchyroll string ID directly so that AnimePreviewDialog
                    // receives a non-numeric id → animeId = null → no AniList query
                    id: m.id as unknown as number,
                    title: m.title,
                    titleRomaji: m.title,
                    titleNative: null,
                    description: m.description || null,
                    image: bestPoster,
                    bannerImage: bestBanner,
                    genres: [],
                    rating: '12+',
                    score: null,
                    popularity: 0,
                    duration: null,
                    status: 'FINISHED',
                    season: null,
                    year: null,
                    format: 'MOVIE',
                    source: null,
                    color: null,
                    nextEpisode: null,
                    isCrunchyroll: true,
                    studio: null,
                    studios: [],
                    externalLinks: [],
                    trailer: null,
                    startDate: null,
                    endDate: null,
                    episodes: 1,
                    crunchyrollId: m.id,
                    crunchyrollSlug: m.slug_title,
                    isOnCrunchyroll: true,
                    crunchyrollInfo: {
                        crunchyrollId: m.id,
                        title: m.title,
                        slug: m.slug_title,
                        episodeCount: 1,
                        seasonCount: 1,
                        isDubbed: m.series_metadata?.is_dubbed || false,
                        isSubbed: m.series_metadata?.is_subbed ?? true,
                        crRating: 0,
                        crVoteCount: 0,
                    },
                    combinedScore: 0,
                    popularityScore: 0,
                }
            })
        },
        { revalidateOnFocus: false, dedupingInterval: 0 }
    )

    useEffect(() => {
        if (batch && batch.length > 0) {
            setAllMovies(prev => {
                const existing = new Set(prev.map(m => m.id))
                return [...prev, ...batch.filter(m => !existing.has(m.id))]
            })
        }
    }, [batch])

    const loadMore = useCallback(() => {
        if (!isLoadingMore && hasMore) {
            setIsLoadingMore(true)
            setOffset(prev => prev + perPage)
            setTimeout(() => setIsLoadingMore(false), 100)
        }
    }, [hasMore, isLoadingMore, perPage])

    return {
        data: allMovies,
        isLoading,
        isLoadingMore,
        hasMore,
        error,
        loadMore,
    }
}
"use client"

import useSWR from "swr"
import {
    enrichAnimeList,
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
                const enriched = await enrichAnimeList(crData)
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

export async function fetchAnimeDetailsWithCrunchyroll(anilistId: number): Promise<CombinedAnimeDetails | null> {
    const anilistDetails = await getAnimeDetails(anilistId)
    if (!anilistDetails) return null

    let match = undefined
    let episodes: TransformedCrunchyrollEpisode[] = []

    try {
        // Check coverage
        match = await checkAnimeAvailability(anilistDetails.title)
        if (match) {
            episodes = await getAllSeriesEpisodes(match.crunchyrollId)
        }
    } catch (e) {
        console.warn("[Details] CR availability check failed", e)
    }

    return {
        ...anilistDetails,
        crunchyrollId: match?.crunchyrollId || null,
        crunchyrollSlug: match?.slug || null,
        isOnCrunchyroll: !!match,
        crunchyrollInfo: match || null,
        crunchyrollEpisodes: episodes
    }
}

// ===============================
// Category-specific hooks
// ===============================

export function useTrendingAnime(page = 1, perPage = 20) {
    return useCombinedAnime('trending', page, perPage)
}

export function usePopularAnime(page = 1, perPage = 500) {
    const { data: apiData, isLoading, error } = useSWR(
        `api-popular-${page}-${perPage}`,
        async () => {
            try {
                const response = await fetch(`/api/populaire?limit=${Math.min(perPage, 500)}&offset=${(page - 1) * perPage}&sortBy=combined`)
                if (!response.ok) {
                    throw new Error('Failed to fetch popular anime')
                }
                const json = await response.json()
                
                // Transform API response to CombinedAnime format
                return (json.data || []).map((item: any) => ({
                    id: item.id,
                    anilistId: item.anilist?.id || null,
                    title: item.title,
                    titleRomaji: item.title,
                    titleEnglish: item.title,
                    description: item.description || '',
                    image: item.images?.poster_tall?.[0]?.[item.images.poster_tall[0].length - 1]?.source || '/placeholder.png',
                    genres: [],
                    rating: item.crunchyroll.rating?.average ? `${item.crunchyroll.rating.average}/10` : null,
                    score: item.anilist?.meanScore || null,
                    type: 'TV',
                    episodes: item.anilist?.episodes || null,
                    popularity: item.anilist?.popularity || parseInt(item.crunchyroll.rating?.total || '0'),
                    year: new Date().getFullYear(),
                    crunchyrollId: item.id,
                    crunchyrollSlug: item.id,
                    isOnCrunchyroll: true,
                    crunchyrollInfo: {
                        id: item.id,
                        title: item.title,
                        slug_title: item.id,
                        description: item.description || '',
                        images: item.images,
                        rating: item.crunchyroll.rating?.average ? parseFloat(item.crunchyroll.rating.average) / 2 : 0,  // normalized to 0-5
                        crRating: parseFloat(item.crunchyroll.rating?.average || '0'),
                        crVoteCount: parseInt(String(item.crunchyroll.rating?.total || '0'))
                    },
                    // Add metadata for combined scoring
                    combinedScore: item.combined?.score || 0,
                    popularityScore: item.combined?.popularityScore || 0
                })) as CombinedAnime[]
            } catch (err) {
                console.error('[usePopularAnime] Error:', err)
                throw err
            }
        }
    )

    return {
        data: apiData || [],
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

// Hook for anime details page
export function useAnimeDetails(anilistId: number | null) {
    const { data, isLoading, error } = useSWR(
        anilistId ? `anime-details-${anilistId}` : null,
        () => anilistId ? fetchAnimeDetailsWithCrunchyroll(anilistId) : null,
        {
            revalidateOnFocus: false,
            dedupingInterval: 300000
        }
    )

    return {
        anime: data,
        isLoading,
        error
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
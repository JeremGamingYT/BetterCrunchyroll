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
                        crData = await browseCrunchyroll({ n: perPage, start, sort_by: 'newly_added' })
                        break
                    default:
                        crData = []
                }
            } catch (e) {
                console.warn(`[CombinedAnime] CR Fetch failed for ${category}`, e)
                crError = e
            }

            // 2. If CR succeeded, Enrich with AniList (CACHE VISIBLE HERE due to async lookups)
            if (crData && crData.length > 0) {
                const enriched = await enrichAnimeList(crData)
                // Map to CombinedAnime format
                return enriched.map((item, index) => {
                    const original = crData[index]
                    return {
                        ...item,
                        crunchyrollId: original.id,
                        crunchyrollSlug: original.slug_title,
                        isOnCrunchyroll: true,
                        crunchyrollInfo: original as unknown as TransformedCrunchyrollAnime
                    }
                })
            }

            // 3. If CR Failed, Fallback to AniList
            if (crError) {
                console.warn(`[CombinedAnime] Falling back to AniList for ${category}`)
                let fallbackData: TransformedAnime[] = []
                switch (category) {
                    case 'trending': fallbackData = await getTrendingAnime(page, perPage); break;
                    case 'popular': fallbackData = await getPopularAnime(page, perPage); break;
                    case 'new': fallbackData = await getNewAnime(page, perPage); break;
                    case 'simulcast': fallbackData = await getSimulcastAnime(page, perPage); break;
                    default: fallbackData = []
                }
                return fallbackData.map(anime => ({
                    ...anime,
                    crunchyrollId: null,
                    crunchyrollSlug: null,
                    isOnCrunchyroll: false,
                    crunchyrollInfo: null
                }))
            }

            return []
        },
        {
            revalidateOnFocus: false,
            keepPreviousData: true,
            shouldRetryOnError: false
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
    // 1. Search AniList (reliable search)
    const anilistData = await searchAnime(query, page, perPage * 2)

    // 2. Try to fetch CR catalog for matching (best effort)
    try {
        const catalog = await getCrunchyrollCatalog(1000)

        const results: CombinedAnime[] = []
        const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

        for (const anime of anilistData) {
            let match: TransformedCrunchyrollAnime | undefined
            for (const [id, cr] of catalog) {
                if (norm(cr.title) === norm(anime.title) || norm(cr.title) === norm(anime.titleRomaji)) {
                    match = cr; break;
                }
            }
            results.push({
                ...anime,
                crunchyrollId: match?.crunchyrollId || null,
                crunchyrollSlug: match?.slug || null,
                isOnCrunchyroll: !!match,
                crunchyrollInfo: match || null
            })
        }
        return results
    } catch (e) {
        console.warn("[Search] CR Catalog fetch failed, returning AniList only", e)
        return anilistData.map(anime => ({
            ...anime,
            crunchyrollId: null,
            crunchyrollSlug: null,
            isOnCrunchyroll: false,
            crunchyrollInfo: null
        }))
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

export function usePopularAnime(page = 1, perPage = 20) {
    return useCombinedAnime('popular', page, perPage)
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

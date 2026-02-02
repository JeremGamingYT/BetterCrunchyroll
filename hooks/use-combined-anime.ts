"use client"

import useSWR from "swr"
import {
    getTrendingAnime,
    getPopularAnime,
    getNewAnime,
    getSimulcastAnime,
    getAiringSchedule,
    searchAnime,
    getAnimeDetails,
    type TransformedAnime,
    type AnimeDetails,
} from "@/lib/anilist"
import {
    checkAnimeAvailability,
    getCrunchyrollCatalog,
    getAllSeriesEpisodes,
    getSeries,
    type TransformedCrunchyrollAnime,
    type TransformedCrunchyrollEpisode,
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
// Helper function to normalize titles for matching
// ===============================

function normalizeTitle(title: string): string {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
}

function titlesMatch(title1: string, title2: string): boolean {
    const norm1 = normalizeTitle(title1)
    const norm2 = normalizeTitle(title2)

    // Exact match
    if (norm1 === norm2) return true

    // One contains the other
    if (norm1.includes(norm2) || norm2.includes(norm1)) return true

    // Remove common suffixes/prefixes and compare
    const cleanTitle = (t: string) => t
        .replace(/\s*(season|saison|part|partie|cour)\s*\d+/gi, '')
        .replace(/\s*(the animation|tv|ova|movie|film)/gi, '')
        .trim()

    const clean1 = cleanTitle(norm1)
    const clean2 = cleanTitle(norm2)

    return clean1 === clean2 || clean1.includes(clean2) || clean2.includes(clean1)
}

// ===============================
// Filter AniList results with Crunchyroll catalog
// ===============================

async function filterWithCrunchyroll(
    animes: TransformedAnime[],
    catalog: Map<string, TransformedCrunchyrollAnime>,
    options: { filterUnavailable?: boolean } = {}
): Promise<CombinedAnime[]> {
    const results: CombinedAnime[] = []
    const seenCrunchyrollIds = new Set<string>()

    for (const anime of animes) {
        // Try to find a match in the Crunchyroll catalog
        const normalizedTitle = normalizeTitle(anime.title)
        const normalizedRomaji = normalizeTitle(anime.titleRomaji)

        let crunchyrollMatch: TransformedCrunchyrollAnime | null = null

        // Check by normalized title
        for (const [catalogTitle, crInfo] of catalog.entries()) {
            if (titlesMatch(normalizedTitle, catalogTitle) || titlesMatch(normalizedRomaji, catalogTitle)) {
                crunchyrollMatch = crInfo
                break
            }
        }

        // Strict Filtering: If requested, skip if no match
        if (options.filterUnavailable && !crunchyrollMatch) {
            continue
        }

        // Deduplication: If we already have this valid Crunchyroll ID, skip it
        // This merges "Season 2", "Season 3" etc. into the first occurrence (usually the most popular/trending one)
        if (crunchyrollMatch && seenCrunchyrollIds.has(crunchyrollMatch.crunchyrollId)) {
            continue
        }

        if (crunchyrollMatch) {
            seenCrunchyrollIds.add(crunchyrollMatch.crunchyrollId)
        }

        results.push({
            ...anime,
            crunchyrollId: crunchyrollMatch?.crunchyrollId || null,
            crunchyrollSlug: crunchyrollMatch?.slug || null,
            isOnCrunchyroll: !!crunchyrollMatch,
            crunchyrollInfo: crunchyrollMatch,
        })
    }

    return results
}

// ===============================
// Main Hook
// ===============================

export function useCombinedAnime(category: 'trending' | 'popular' | 'new' | 'simulcast', page = 1, perPage = 20) {
    // 1. Fetch from AniList
    const { data: anilistData, isLoading: isAnilistLoading, error: anilistError } = useSWR(
        `anilist-${category}-${page}-${perPage}`,
        async () => {
            switch (category) {
                case 'trending': return getTrendingAnime(page, perPage)
                case 'popular': return getPopularAnime(page, perPage)
                case 'new': return getNewAnime(page, perPage)
                case 'simulcast': return getSimulcastAnime(page, perPage)
                default: return []
            }
        }
    )

    // 2. Fetch Crunchyroll Catalog (cached)
    const { data: catalog, isLoading: isCatalogLoading } = useCrunchyrollCatalog(1000)

    // 3. Combine
    const { data: combinedData, isLoading: isCombining, error: combineError } = useSWR(
        anilistData && catalog ? `combined-${category}-${page}-${perPage}` : null,
        () => {
            if (!anilistData || !catalog) return []
            // Safety: Only enable strict filtering if we actually have a catalog to filter against
            // This prevents showing "nothing" if the CR catalog API fails or is empty
            const shouldFilter = catalog.size > 0
            return filterWithCrunchyroll(anilistData, catalog, { filterUnavailable: shouldFilter })
        },
        {
            keepPreviousData: true,
            fallbackData: []
        }
    )

    return {
        data: combinedData,
        isLoading: isAnilistLoading || isCatalogLoading || isCombining,
        error: anilistError || combineError
    }
}

// ===============================
// New hooks for availability filtering
// ===============================

export function useAvailableAnime(category: 'trending' | 'popular' | 'new' | 'simulcast', page = 1, perPage = 20) {
    // Reuse filter logic but with filterUnavailable: true
    const { data: anilistData, isLoading: isAnilistLoading } = useSWR(
        `anilist-${category}-${page}-${perPage}`,
        async () => {
            switch (category) {
                case 'trending': return getTrendingAnime(page, perPage)
                case 'popular': return getPopularAnime(page, perPage)
                case 'new': return getNewAnime(page, perPage)
                case 'simulcast': return getSimulcastAnime(page, perPage)
                default: return []
            }
        }
    )

    const { data: catalog, isLoading: isCatalogLoading } = useCrunchyrollCatalog(1000)

    const { data: combinedData, isLoading: isCombining } = useSWR(
        anilistData && catalog ? `combined-available-${category}-${page}-${perPage}` : null,
        () => anilistData && catalog ? filterWithCrunchyroll(anilistData, catalog, { filterUnavailable: true }) : [],
        {
            keepPreviousData: true,
            fallbackData: []
        }
    )

    return {
        data: combinedData,
        isLoading: isAnilistLoading || isCatalogLoading || isCombining
    }
}

// ===============================
// Other Helper Functions
// ===============================

export async function searchWithCrunchyroll(query: string, page: number, perPage: number): Promise<CombinedAnime[]> {
    const anilistData = await searchAnime(query, page, perPage * 2)
    const catalog = await getCrunchyrollCatalog(200)
    const filtered = await filterWithCrunchyroll(anilistData, catalog)
    return filtered.slice(0, perPage)
}

export async function fetchAnimeDetailsWithCrunchyroll(anilistId: number): Promise<CombinedAnimeDetails | null> {
    const anilistDetails = await getAnimeDetails(anilistId)
    if (!anilistDetails) return null

    let crunchyrollMatch = await checkAnimeAvailability(anilistDetails.title)
    if (!crunchyrollMatch && anilistDetails.titleRomaji !== anilistDetails.title) {
        crunchyrollMatch = await checkAnimeAvailability(anilistDetails.titleRomaji)
    }

    let crunchyrollEpisodes: TransformedCrunchyrollEpisode[] = []
    if (crunchyrollMatch) {
        crunchyrollEpisodes = await getAllSeriesEpisodes(crunchyrollMatch.crunchyrollId)

        // Detect if AniList title specifies a season
        const seasonMatch = anilistDetails.title.match(/(?:Season|Saison|Part|Partie)\s*(\d+)/i)
        if (seasonMatch && seasonMatch[1]) {
            const seasonNum = parseInt(seasonMatch[1])
            // Try to filter by season number if we have multiple seasons
            const filteredEpisodes = crunchyrollEpisodes.filter(ep => ep.seasonNumber === seasonNum)
            // Only use filtered if we actually found something for that season
            if (filteredEpisodes.length > 0) {
                crunchyrollEpisodes = filteredEpisodes
            }
        }
    }

    return {
        ...anilistDetails,
        crunchyrollId: crunchyrollMatch?.crunchyrollId || null,
        crunchyrollSlug: crunchyrollMatch?.slug || null,
        isOnCrunchyroll: !!crunchyrollMatch,
        crunchyrollInfo: crunchyrollMatch,
        crunchyrollEpisodes,
    }
}

// ===============================
// Category-specific hooks (used by pages)
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

// Hook to use Crunchyroll catalog
function useCrunchyrollCatalog(limit: number) {
    return useSWR(
        `crunchyroll-catalog-${limit}`,
        () => getCrunchyrollCatalog(limit),
        { revalidateOnFocus: false }
    )
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

// Hook for airing schedule (combined with Crunchyroll data)
export function useAiringSchedule(page = 1, perPage = 20) {
    // 1. Fetch from AniList
    const { data: anilistData, isLoading: isAnilistLoading, error: anilistError } = useSWR(
        `anilist-airing-${page}-${perPage}`,
        () => getAiringSchedule(page, perPage),
        { revalidateOnFocus: false }
    )

    // 2. Fetch Crunchyroll Catalog
    const { data: catalog, isLoading: isCatalogLoading } = useCrunchyrollCatalog(1000)

    // 3. Combine
    const { data: combinedData, isLoading: isCombining, error: combineError } = useSWR(
        anilistData && catalog ? `combined-airing-${page}-${perPage}` : null,
        () => anilistData && catalog ? filterWithCrunchyroll(anilistData, catalog, { filterUnavailable: false }) : [],
        {
            keepPreviousData: true,
            fallbackData: []
        }
    )

    return {
        data: combinedData,
        isLoading: isAnilistLoading || isCatalogLoading || isCombining,
        error: anilistError || combineError
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

// Alias for search (used by search page)
export const useSearchAnime = useCombinedSearch




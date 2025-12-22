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
    catalog: Map<string, TransformedCrunchyrollAnime>
): Promise<CombinedAnime[]> {
    const results: CombinedAnime[] = []

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

        // If no match found in catalog, do a live search
        if (!crunchyrollMatch) {
            crunchyrollMatch = await checkAnimeAvailability(anime.title)

            // Try with romaji title if English title didn't work
            if (!crunchyrollMatch && anime.titleRomaji !== anime.title) {
                crunchyrollMatch = await checkAnimeAvailability(anime.titleRomaji)
            }
        }

        if (crunchyrollMatch) {
            results.push({
                ...anime,
                crunchyrollId: crunchyrollMatch.crunchyrollId,
                crunchyrollSlug: crunchyrollMatch.slug,
                isOnCrunchyroll: true,
                crunchyrollInfo: crunchyrollMatch,
            })
        }
    }

    return results
}

// ===============================
// Combined fetcher functions
// ===============================

async function fetchTrendingWithCrunchyroll(page: number, perPage: number): Promise<CombinedAnime[]> {
    // Get AniList data
    const anilistData = await getTrendingAnime(page, perPage * 2) // Get more to account for filtering

    // Get Crunchyroll catalog
    const catalog = await getCrunchyrollCatalog(200)

    // Filter by Crunchyroll availability
    const filtered = await filterWithCrunchyroll(anilistData, catalog)

    // Return only requested amount
    return filtered.slice(0, perPage)
}

async function fetchPopularWithCrunchyroll(page: number, perPage: number): Promise<CombinedAnime[]> {
    const anilistData = await getPopularAnime(page, perPage * 2)
    const catalog = await getCrunchyrollCatalog(200)
    const filtered = await filterWithCrunchyroll(anilistData, catalog)
    return filtered.slice(0, perPage)
}

async function fetchNewWithCrunchyroll(page: number, perPage: number): Promise<CombinedAnime[]> {
    const anilistData = await getNewAnime(page, perPage * 2)
    const catalog = await getCrunchyrollCatalog(200)
    const filtered = await filterWithCrunchyroll(anilistData, catalog)
    return filtered.slice(0, perPage)
}

async function fetchSimulcastWithCrunchyroll(page: number, perPage: number): Promise<CombinedAnime[]> {
    const anilistData = await getSimulcastAnime(page, perPage * 2)
    const catalog = await getCrunchyrollCatalog(200)
    const filtered = await filterWithCrunchyroll(anilistData, catalog)
    return filtered.slice(0, perPage)
}

async function fetchAiringWithCrunchyroll(page: number, perPage: number): Promise<CombinedAnime[]> {
    const anilistData = await getAiringSchedule(page, perPage * 2)
    const catalog = await getCrunchyrollCatalog(200)
    const filtered = await filterWithCrunchyroll(anilistData, catalog)
    return filtered.slice(0, perPage)
}

async function searchWithCrunchyroll(query: string, page: number, perPage: number): Promise<CombinedAnime[]> {
    const anilistData = await searchAnime(query, page, perPage * 2)
    const catalog = await getCrunchyrollCatalog(200)
    const filtered = await filterWithCrunchyroll(anilistData, catalog)
    return filtered.slice(0, perPage)
}

async function fetchAnimeDetailsWithCrunchyroll(anilistId: number): Promise<CombinedAnimeDetails | null> {
    // Get AniList details
    const anilistDetails = await getAnimeDetails(anilistId)

    if (!anilistDetails) return null

    // Check Crunchyroll availability
    let crunchyrollMatch = await checkAnimeAvailability(anilistDetails.title)

    if (!crunchyrollMatch && anilistDetails.titleRomaji !== anilistDetails.title) {
        crunchyrollMatch = await checkAnimeAvailability(anilistDetails.titleRomaji)
    }

    // Get Crunchyroll episodes if available
    let crunchyrollEpisodes: TransformedCrunchyrollEpisode[] = []
    if (crunchyrollMatch) {
        crunchyrollEpisodes = await getAllSeriesEpisodes(crunchyrollMatch.crunchyrollId)
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
// Hooks
// ===============================

export function useTrendingAnime(page = 1, perPage = 12) {
    return useSWR<CombinedAnime[]>(
        `combined-trending-${page}-${perPage}`,
        () => fetchTrendingWithCrunchyroll(page, perPage),
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            dedupingInterval: 60000,
        }
    )
}

export function usePopularAnime(page = 1, perPage = 12) {
    return useSWR<CombinedAnime[]>(
        `combined-popular-${page}-${perPage}`,
        () => fetchPopularWithCrunchyroll(page, perPage),
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            dedupingInterval: 60000,
        }
    )
}

export function useNewAnime(page = 1, perPage = 12) {
    return useSWR<CombinedAnime[]>(
        `combined-new-${page}-${perPage}`,
        () => fetchNewWithCrunchyroll(page, perPage),
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            dedupingInterval: 60000,
        }
    )
}

export function useSimulcastAnime(page = 1, perPage = 50) {
    return useSWR<CombinedAnime[]>(
        `combined-simulcast-${page}-${perPage}`,
        () => fetchSimulcastWithCrunchyroll(page, perPage),
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            dedupingInterval: 60000,
        }
    )
}

export function useAiringSchedule(page = 1, perPage = 50) {
    return useSWR<CombinedAnime[]>(
        `combined-airing-${page}-${perPage}`,
        () => fetchAiringWithCrunchyroll(page, perPage),
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            dedupingInterval: 60000,
        }
    )
}

export function useAnimeDetails(id: number | null) {
    const { data, error, isLoading } = useSWR<CombinedAnimeDetails | null>(
        id ? `combined-anime-details-${id}` : null,
        () => (id ? fetchAnimeDetailsWithCrunchyroll(id) : null),
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            dedupingInterval: 300000,
        }
    )

    return {
        anime: data,
        isLoading,
        error,
    }
}

export function useSearchAnime(query: string, page = 1, perPage = 20) {
    return useSWR<CombinedAnime[]>(
        query.length >= 2 ? `combined-search-${query}-${page}-${perPage}` : null,
        () => searchWithCrunchyroll(query, page, perPage),
        {
            revalidateOnFocus: false,
            dedupingInterval: 30000,
        }
    )
}

// Re-export types for convenience
export type { TransformedAnime, AnimeDetails } from "@/lib/anilist"
export type { TransformedCrunchyrollAnime, TransformedCrunchyrollEpisode } from "@/lib/crunchyroll"

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

export function usePopularAnime(page = 1, perPage = 20) {
    // On récupère toujours la liste complète des populaires côté API,
    // puis on fait la pagination côté client (20 par 20, etc.)
    const { data: allData, isLoading, error } = useSWR(
        `api-popular-all`,
        async () => {
            try {
                // On demande un gros lot à l'API (max 500 défini côté route)
                const limit = 500
                const response = await fetch(`/api/populaire?limit=${limit}&offset=0&sortBy=combined`)
                
                if (!response.ok) {
                    throw new Error('Failed to fetch popular anime')
                }
                
                const json = await response.json()

                // Transform & enrich avec AniList (couleurs, genres, etc. en cache IDB)
                const transformed = await Promise.all(
                    (json.data || []).map(async (item: any) => {
                        // Score de popularité 0-100 (basé sur combined.score 0-5)
                        const popularityScore = Math.round(((item.combined?.score || 0) * 20) * 10) / 10
                        // Note Crunchyroll brute (0-10) pour le badge sous "TV"
                        const crAverage = parseFloat(item.crunchyroll?.rating?.average || "0")

                        // Métadonnées AniList (couleur, genres, etc.) – stockées en IndexedDB
                        let anilistInfo: TransformedAnime | null = null
                        try {
                            anilistInfo = await searchAnimeBasicInfo(item.title)
                        } catch {
                            anilistInfo = null
                        }

                        // Fallback ID numérique si AniList n'a rien renvoyé
                        const fallbackId = parseInt(item.id, 36) || Math.floor(Math.random() * 1_000_000)

                        return {
                            // Base AniList si dispo, sinon fallback basique
                            id: anilistInfo?.id ?? fallbackId,
                            anilistId: anilistInfo?.id ?? item.anilist?.id ?? null,
                            title: anilistInfo?.title ?? item.title,
                            titleRomaji: anilistInfo?.titleRomaji ?? item.title,
                            titleEnglish: anilistInfo?.titleEnglish ?? item.title,
                            titleNative: anilistInfo?.titleNative ?? null,
                            description: anilistInfo?.description ?? item.description ?? '',
                            image: anilistInfo?.image
                                || item.images?.poster_tall?.[0]?.[item.images.poster_tall[0].length - 1]?.source
                                || '/placeholder.png',
                            bannerImage: anilistInfo?.bannerImage
                                || item.images?.banner?.[0]?.[item.images.banner[0].length - 1]?.source
                                || null,
                            genres: anilistInfo?.genres ?? [],
                            // Badge étoile = vraie note Crunchyroll /10
                            rating: crAverage > 0 ? `${crAverage.toFixed(1)}/10` : (anilistInfo?.rating ?? '12+'),
                            // Ligne "Popularité" = 0-100
                            score: popularityScore,
                            popularity: anilistInfo?.popularity
                                ?? parseInt(String(item.crunchyroll?.rating?.total || '0')),
                            duration: anilistInfo?.duration ?? null,
                            status: anilistInfo?.status ?? 'RELEASING',
                            season: anilistInfo?.season ?? null,
                            year: anilistInfo?.year ?? new Date().getFullYear(),
                            format: anilistInfo?.format ?? 'TV',
                            source: anilistInfo?.source ?? null,
                            color: anilistInfo?.color ?? null,
                            nextEpisode: anilistInfo?.nextEpisode ?? null,
                            isCrunchyroll: anilistInfo?.isCrunchyroll ?? true,
                            studio: anilistInfo?.studio ?? item.studio ?? null,
                            studios: anilistInfo?.studios ?? [],
                            externalLinks: anilistInfo?.externalLinks ?? [],
                            trailer: anilistInfo?.trailer ?? null,
                            startDate: anilistInfo?.startDate ?? null,
                            endDate: anilistInfo?.endDate ?? null,

                            // Champs Crunchyroll spécifiques
                            crunchyrollId: item.id,
                            crunchyrollSlug: item.id,
                            isOnCrunchyroll: true,
                            crunchyrollInfo: {
                                id: item.id,
                                title: item.title,
                                slug_title: item.id,
                                description: item.description || '',
                                images: item.images,
                                rating: item.crunchyroll.rating?.average
                                    ? parseFloat(item.crunchyroll.rating.average) / 2
                                    : 0, // normalisé 0-5
                                crRating: crAverage,
                                crVoteCount: parseInt(String(item.crunchyroll.rating?.total || '0'))
                            },

                            // Métadonnées pour le scoring combiné
                            combinedScore: item.combined?.score || 0,
                            popularityScore: item.combined?.popularityScore || 0
                        } as CombinedAnime
                    })
                )
                
                return transformed
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

    // Pagination côté client : on renvoie seulement le "page" demandé
    const start = (page - 1) * perPage
    const end = start + perPage
    const pageSlice = allData ? allData.slice(start, end) : []

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
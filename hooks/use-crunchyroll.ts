"use client"

import useSWR from "swr"
import {
    searchCrunchyroll,
    checkAnimeAvailability,
    getSeries,
    getSeasons,
    getSeasonEpisodes,
    getAllSeriesEpisodes,
    getCrunchyrollCatalog,
    getAccount,
    getProfile,
    getProfiles,
    getWatchlist,
    getSubscription,
    getWatchHistory,
    type TransformedCrunchyrollAnime,
    type TransformedCrunchyrollEpisode,
    type CrunchyrollSeason,
    type CrunchyrollAccount,
    type CrunchyrollProfile,
    type TransformedWatchlistItem,
} from "@/lib/crunchyroll"

// Hook for checking if an anime is available on Crunchyroll
export function useAnimeAvailability(title: string | null) {
    return useSWR<TransformedCrunchyrollAnime | null>(
        title ? `cr-availability-${title}` : null,
        () => (title ? checkAnimeAvailability(title) : null),
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            dedupingInterval: 300000, // 5 minutes
        }
    )
}

// Hook for getting Crunchyroll series info
export function useCrunchyrollSeries(seriesId: string | null) {
    return useSWR(
        seriesId ? `cr-series-${seriesId}` : null,
        () => (seriesId ? getSeries(seriesId) : null),
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            dedupingInterval: 300000,
        }
    )
}

// Hook for getting seasons
export function useCrunchyrollSeasons(seriesId: string | null) {
    return useSWR<CrunchyrollSeason[]>(
        seriesId ? `cr-seasons-${seriesId}` : null,
        () => (seriesId ? getSeasons(seriesId) : []),
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            dedupingInterval: 300000,
        }
    )
}

// Hook for getting episodes of a specific season
export function useCrunchyrollEpisodes(seasonId: string | null) {
    return useSWR<TransformedCrunchyrollEpisode[]>(
        seasonId ? `cr-episodes-${seasonId}` : null,
        () => (seasonId ? getSeasonEpisodes(seasonId) : []),
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            dedupingInterval: 300000,
        }
    )
}

// Hook for getting all episodes of a series
export function useCrunchyrollAllEpisodes(seriesId: string | null) {
    return useSWR<TransformedCrunchyrollEpisode[]>(
        seriesId ? `cr-all-episodes-${seriesId}` : null,
        () => (seriesId ? getAllSeriesEpisodes(seriesId) : []),
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            dedupingInterval: 300000,
        }
    )
}

// Hook for getting the Crunchyroll catalog (for filtering AniList results)
export function useCrunchyrollCatalog(limit = 200) {
    return useSWR<Map<string, TransformedCrunchyrollAnime>>(
        `cr-catalog-${limit}`,
        () => getCrunchyrollCatalog(limit),
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            dedupingInterval: 600000, // 10 minutes
        }
    )
}

// Hook for searching on Crunchyroll
export function useCrunchyrollSearch(query: string, limit = 10) {
    return useSWR(
        query.length >= 2 ? `cr-search-${query}-${limit}` : null,
        () => searchCrunchyroll(query, limit),
        {
            revalidateOnFocus: false,
            dedupingInterval: 30000,
        }
    )
}

// Hook for getting account info
export function useCrunchyrollAccount() {
    return useSWR<CrunchyrollAccount | null>(
        'cr-account-me',
        () => getAccount(),
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            dedupingInterval: 300000, // 5 minutes
        }
    )
}

// Hook for getting current profile info
export function useCrunchyrollProfile() {
    return useSWR<CrunchyrollProfile | null>(
        'cr-profile-me',
        () => getProfile(),
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            dedupingInterval: 300000, // 5 minutes
        }
    )
}

// Hook for getting all profiles
export function useCrunchyrollProfiles() {
    return useSWR<CrunchyrollProfile[]>(
        'cr-profiles-me',
        () => getProfiles(),
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            dedupingInterval: 300000, // 5 minutes
        }
    )
}

// Hook for getting user subscription
export function useCrunchyrollSubscription(accountId: string | null) {
    return useSWR(
        accountId ? `cr-subscription-${accountId}` : null,
        () => accountId ? getSubscription(accountId) : null,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            dedupingInterval: 300000, // 5 minutes
        }
    )
}


// Hook for getting user's Crunchyroll watchlist
export function useCrunchyrollWatchlist(accountId: string | null, options?: {
    n?: number
    order?: 'desc' | 'asc'
    sort_by?: 'date_updated' | 'date_watched' | 'date_added' | 'alphabetical'
    is_favorite?: boolean
}) {
    return useSWR<TransformedWatchlistItem[]>(
        accountId ? `cr-watchlist-${accountId}-${JSON.stringify(options || {})}` : null,
        () => accountId ? getWatchlist({ accountId, ...options }) : [],
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            dedupingInterval: 60000, // 1 minute
        }
    )
}

// Hook for getting user's watch history (Continue Watching)
export function useWatchHistory(accountId: string | null, options?: {
    page?: number
    page_size?: number
}) {
    return useSWR<TransformedWatchlistItem[]>(
        accountId ? `cr-history-${accountId}-${JSON.stringify(options || {})}` : null,
        () => accountId ? getWatchHistory(accountId, options) : [],
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            dedupingInterval: 60000, // 1 minute
        }
    )
}

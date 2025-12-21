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

// SWR fetcher wrappers
export function useTrendingAnime(page = 1, perPage = 12) {
  return useSWR<TransformedAnime[]>(`trending-${page}-${perPage}`, () => getTrendingAnime(page, perPage), {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 60000,
  })
}

export function usePopularAnime(page = 1, perPage = 12) {
  return useSWR<TransformedAnime[]>(`popular-${page}-${perPage}`, () => getPopularAnime(page, perPage), {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 60000,
  })
}

export function useNewAnime(page = 1, perPage = 12) {
  return useSWR<TransformedAnime[]>(`new-${page}-${perPage}`, () => getNewAnime(page, perPage), {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 60000,
  })
}

export function useSimulcastAnime(page = 1, perPage = 50) {
  return useSWR<TransformedAnime[]>(`simulcast-${page}-${perPage}`, () => getSimulcastAnime(page, perPage), {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 60000,
  })
}

export function useAiringSchedule(page = 1, perPage = 50) {
  return useSWR<TransformedAnime[]>(`airing-${page}-${perPage}`, () => getAiringSchedule(page, perPage), {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 60000,
  })
}

export function useAnimeDetails(id: number | null) {
  const { data, error, isLoading } = useSWR<AnimeDetails | null>(
    id ? `anime-details-${id}` : null,
    () => (id ? getAnimeDetails(id) : null),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 300000, // 5 minutes for details
    },
  )

  return {
    anime: data,
    isLoading,
    error,
  }
}

export function useSearchAnime(query: string, page = 1, perPage = 20) {
  return useSWR<TransformedAnime[]>(
    query.length >= 2 ? `search-${query}-${page}-${perPage}` : null,
    () => searchAnime(query, page, perPage),
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
    },
  )
}

/**
 * Hook: useNewAnimeCrunchyroll
 * 
 * Fetches new anime directly from Crunchyroll API
 * Filters for "newly_added" content from current year (2025+)
 * Enriches with AniList data in background with graceful fallback
 * Supports infinite scroll with pagination
 */

"use client"

import useSWR from "swr"
import { useState, useCallback, useEffect } from "react"
import { browseCrunchyroll, type CrunchyrollSeries } from "@/lib/crunchyroll"
import { enrichAnimeListWithFallback, type TransformedAnime } from "@/lib/anilist"
import { cacheStore } from "@/lib/cache-store"

export interface NewAnimeItem extends TransformedAnime {
  crunchyrollId: string | null
  crunchyrollSlug: string | null
}

export function useNewAnimeCrunchyroll() {
  const [offset, setOffset] = useState(0)
  const [allAnimes, setAllAnimes] = useState<NewAnimeItem[]>([])
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [enrichmentProgress, setEnrichmentProgress] = useState(0)
  const currentYear = new Date().getFullYear()

  // Helper to extract year from Crunchyroll metadata
  const extractYear = useCallback((series: CrunchyrollSeries): number => {
    const metadata = series.series_metadata
    if (metadata && "start_date" in metadata) {
      const startDate = metadata.start_date
      if (typeof startDate === "string") {
        const yearStr = startDate.split("-")[0]
        const year = parseInt(yearStr, 10)
        if (!isNaN(year)) return year
      }
    }
    return currentYear
  }, [currentYear])

  // Helper to extract main image from series
  const extractImage = useCallback((series: CrunchyrollSeries): string => {
    const images = series.images
    const posterTallArray = images?.poster_tall

    if (posterTallArray && posterTallArray.length > 0 && posterTallArray[0].length > 0) {
      const sorted = [...posterTallArray[0]].sort((a, b) => b.width - a.width)
      return sorted[0]?.source || "/placeholder.svg"
    }

    return "/placeholder.svg"
  }, [])

  // Helper to extract banner image from series
  const extractBannerImage = useCallback((series: CrunchyrollSeries): string | null => {
    const images = series.images
    const posterWideArray = images?.poster_wide

    if (posterWideArray && posterWideArray.length > 0 && posterWideArray[0].length > 0) {
      const sorted = [...posterWideArray[0]].sort((a, b) => b.width - a.width)
      return sorted[0]?.source || null
    }

    return null
  }, [])

  // Map Crunchyroll series to NewAnimeItem
  const mapCrunchyrollToNewAnimeItem = useCallback(
    (series: CrunchyrollSeries): NewAnimeItem => {
      const year = extractYear(series)
      const idStr = series.id || series.slug_title || "unknown"
      const numericId = parseInt(
        idStr
          .split("")
          .map((char) => char.charCodeAt(0))
          .join("")
          .substring(0, 10),
        10,
      )

      return {
        id: numericId || Math.random() * 10000,
        title: series.title || "",
        crunchyrollId: series.id || null,
        crunchyrollSlug: series.slug_title || null,
        image: extractImage(series),
        bannerImage: extractBannerImage(series),
        description: series.description || null,
        genres: [],
        score: series.series_metadata?.rating?.average || null,
        rating: series.series_metadata?.maturity_ratings?.[0] || "12+",
        episodes: series.series_metadata?.episode_count || null,
        status: "RELEASING",
        popularity: series.series_metadata?.vote_count || 0,
        titleRomaji: series.title || "",
        titleNative: null,
        color: null,
        nextEpisode: null,
        duration: null,
        season: null,
        format: "TV",
        source: null,
        studio: null,
        studios: [],
        externalLinks: [],
        trailer: null,
        startDate: null,
        endDate: null,
        year,
        isCrunchyroll: true,
      }
    },
    [extractYear, extractImage, extractBannerImage],
  )

  // Process enrichment in background with fallback
  const enrichmentProcess = useCallback(
    async (crData: CrunchyrollSeries[]) => {
      try {
        setEnrichmentProgress(0)

        // Use enrichment with fallback - handles rate limits gracefully
        const enriched = await enrichAnimeListWithFallback(crData)

        setAllAnimes((prev) => {
          // Map enriched data and combine with existing, removing duplicates
          const enrichedAsList = enriched.map((item): NewAnimeItem => ({
            ...item,
            crunchyrollId: null,
            crunchyrollSlug: null,
          }))

          const combined = [...prev, ...enrichedAsList]
          const seen = new Set<string>()
          return combined.filter((anime) => {
            const key = `${anime.crunchyrollId || anime.id}`
            if (seen.has(key)) return false
            seen.add(key)
            return true
          })
        })

        setEnrichmentProgress(100)

        // Cache the enriched data
        await cacheStore.set(`new_anime_batch_${offset}`, enriched, 60)
      } catch (err) {
        console.error("[useNewAnimeCrunchyroll] Enrichment failed, using raw data:", err)
        // Still show the raw data even if enrichment fails
        setEnrichmentProgress(100)
      }
    },
    [offset],
  )

  // Fetch new anime in batches
  const { data: batch, isLoading: isBatchLoading, error } = useSWR(
    `api-new-crunchyroll-${offset}`,
    async () => {
      try {
        const limit = 50

        // Fetch from Crunchyroll with newly_added filter
        const crData = await browseCrunchyroll({
          n: limit,
          start: offset,
          sort_by: "newly_added",
        })

        if (!crData || crData.length === 0) {
          setHasMore(false)
          return []
        }

        // Filter for current year (2025+)
        const filteredData = crData.filter((anime) => {
          const year = extractYear(anime)
          return year >= currentYear
        })

        if (filteredData.length === 0) {
          setHasMore(false)
          return []
        }

        // Map to NewAnimeItems
        const mapped = filteredData.map((series) => mapCrunchyrollToNewAnimeItem(series))

        // Start enrichment process in background
        enrichmentProcess(filteredData)

        return mapped
      } catch (err) {
        console.error("[useNewAnimeCrunchyroll] Error fetching:", err)
        setHasMore(false)
        return []
      }
    },
    {
      revalidateOnFocus: false,
      keepPreviousData: true,
      dedupingInterval: 60000,
    },
  )

  // Add batch data to all animes when new batch arrives
  useEffect(() => {
    if (batch && batch.length > 0) {
      setAllAnimes((prev) => {
        const combined = [...prev, ...batch]
        const seen = new Set<string>()
        return combined.filter((anime) => {
          const key = `${anime.crunchyrollId || anime.id}`
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })
      })

      // Check if we should load more
      if (batch.length < 50) {
        setHasMore(false)
      }
    }
  }, [batch])

  // Load more animes
  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      setIsLoadingMore(true)
      setOffset((prev) => prev + 50)
      setTimeout(() => setIsLoadingMore(false), 100)
    }
  }, [isLoadingMore, hasMore])

  // Load from cache on mount
  useEffect(() => {
    const loadFromCache = async () => {
      try {
        const cached = await cacheStore.get<TransformedAnime[]>(`new_anime_batch_0`)
        if (cached && cached.length > 0) {
          const mapped = cached.map((item) => ({
            ...item,
            crunchyrollId: null,
            crunchyrollSlug: null,
          }))
          setAllAnimes(mapped)
          setEnrichmentProgress(100)
        }
      } catch (err) {
        console.warn("[useNewAnimeCrunchyroll] Cache load failed:", err)
      }
    }

    if (allAnimes.length === 0 && !isBatchLoading && batch === undefined) {
      loadFromCache()
    }
  }, [allAnimes.length, isBatchLoading, batch])

  return {
    data: allAnimes,
    isLoading: isBatchLoading && allAnimes.length === 0,
    isLoadingMore,
    hasMore,
    error,
    enrichmentProgress,
    loadMore,
  }
}

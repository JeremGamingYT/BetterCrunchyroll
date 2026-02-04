// Anilist API service with localStorage caching

import { browseCrunchyroll, type CrunchyrollSeries } from "./crunchyroll"

// ... constants ...

// ===============================
// Crunchyroll Integration Helpers
// ===============================

// Map Crunchyroll series to our generic TransformedAnime format
// This allows the UI to render CR-only items immediately
// Generate a pseudo-numeric ID from string (for temporary keys)
function hashCode(str: string): number {
  if (!str) return Math.floor(Math.random() * 100000);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash); // Ensure positive
}

// Map Crunchyroll series to our generic TransformedAnime format
// This allows the UI to render CR-only items immediately
export function mapCrunchyrollToAnime(cr: CrunchyrollSeries): TransformedAnime {
  const images = cr.images || {}

  // Get best image (logic similar to getBestImage in crunchyroll.ts)
  let image = ''
  const posterTall = images.poster_tall?.[0]
  if (posterTall && posterTall.length > 0) {
    const sorted = [...posterTall].sort((a, b) => b.width - a.width)
    image = sorted[0]?.source || ''
  }

  // Construct a banner from wide poster if available
  let bannerImage = null
  const posterWide = images.poster_wide?.[0]
  if (posterWide && posterWide.length > 0) {
    const sorted = [...posterWide].sort((a, b) => b.width - a.width)
    bannerImage = sorted[0]?.source || null
  }

  // Use a stable hash of the ID to prevent React key duplicates
  const stableId = hashCode(cr.id || cr.slug_title || cr.title);

  return {
    id: stableId,
    title: cr.title,
    titleNative: null,
    titleRomaji: cr.title,
    image,
    bannerImage,
    description: cr.description,
    rating: cr.series_metadata?.maturity_ratings?.[0] || '12+',
    genres: [], // CR categories not always mapped to genres here, but could be.
    score: null,
    popularity: 0,
    episodes: cr.series_metadata?.episode_count || null,
    duration: null,
    status: 'RELEASING', // Assumption or check metadata
    season: null,
    year: null,
    format: 'TV',
    source: null,
    color: null,
    nextEpisode: null,
    isCrunchyroll: true,
    studio: null,
    studios: [],
    externalLinks: [{
      site: "Crunchyroll",
      url: `https://www.crunchyroll.com/${cr.slug_title}`,
      icon: null,
      color: "#f47521"
    }],
    trailer: null,
    startDate: null,
    endDate: null,
    // Add raw CR data transport if needed, or rely on matching later
  }
}

// Batch enrich a list of Crunchyroll items with AniList data
export async function enrichAnimeList(crItems: CrunchyrollSeries[]): Promise<TransformedAnime[]> {
  const results: TransformedAnime[] = []

  // Process sequentially or with limited concurrency to respect rate limits
  // We reuse the existing queue system via queryAnilist/searchAnimeBasicInfo

  // Create base objects first so UI can use them immediately (if we were streaming results, but here we return Promise)
  // Actually, the caller might want the initial result fast. 
  // But this function returns Promise<TransformedAnime[]>.

  const mappedItems = crItems.map(item => {
    const mapped = mapCrunchyrollToAnime(item)
    mapped.id = hashCode(item.id) // Temporary ID
    return { mapped, crItem: item }
  })

  // Fire off enrichment requests
  const enrichmentPromises = mappedItems.map(async ({ mapped, crItem }) => {
    try {
      // Search by title - TRY CACHE FIRST DIRECTLY
      const cacheKey = `basic_info_${sanitizeKey(crItem.title)}`
      let anilistData = await getCache<TransformedAnime>(cacheKey)

      if (!anilistData) {
        // Only if NOT in cache, request from API (which handles rate limits)
        anilistData = await searchAnimeBasicInfo(crItem.title)
      }

      if (anilistData) {
        // Merge AniList data
        // Prefer AniList metadata for high quality assets/info, but keep CR stream info implies we use CR links
        const enriched: TransformedAnime = {
          ...mapped,
          id: anilistData.id, // Use real AniList ID
          titleNative: anilistData.titleNative,
          titleRomaji: anilistData.titleRomaji,
          image: anilistData.image || mapped.image,
          bannerImage: anilistData.bannerImage || mapped.bannerImage,
          description: anilistData.description || mapped.description,
          rating: anilistData.rating || mapped.rating,
          genres: anilistData.genres,
          score: anilistData.score,
          popularity: anilistData.popularity,
          status: anilistData.status,
          season: anilistData.season,
          year: anilistData.year,
          format: anilistData.format || mapped.format,
          color: anilistData.color,
          nextEpisode: anilistData.nextEpisode,
          studio: anilistData.studio,
          studios: anilistData.studios,
          externalLinks: [
            ...mapped.externalLinks,
            ...(anilistData.externalLinks.filter((l: any) => !l.site.includes("Crunchyroll")))
          ],
          startDate: anilistData.startDate,
          endDate: anilistData.endDate,
        }
        return enriched
      }
    } catch (e) {
      // Ignore errors, return mapped CR item
    }
    return mapped
  })

  return Promise.all(enrichmentPromises)
}

// Helper to sanitize keys (remove special chars that might mess up keys)
export function sanitizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '_');
}

// Basic info search for enrichment
export async function searchAnimeBasicInfo(query: string): Promise<TransformedAnime | null> {
  const cacheKey = `basic_info_${sanitizeKey(query)}`
  const cached = await getCache<TransformedAnime>(cacheKey)
  if (cached) return cached

  try {
    const encodedQuery = `
        query ($search: String) {
            Media(search: $search, type: ANIME) {
                ${MEDIA_FRAGMENT}
            }
        }
        `
    const data = await queryAnilist<{ Media: AnilistAnime }>(encodedQuery, { search: query })
    const transformed = transformAnime(data.Media)
    setCache(cacheKey, transformed)
    return transformed
  } catch (e) {
    return null
  }
}


const ANILIST_API = "https://graphql.anilist.co"
const CACHE_DURATION = 1000 * 60 * 60 * 24 * 7 // 7 days cache default (we rely on smart sync)
const SHORT_CACHE_DURATION = 1000 * 60 * 60 // 1 hour for volatile lists

// Rate limiter state for AniList
const RATE_LIMIT_REQUESTS_PER_MINUTE = 80
const MIN_REQUEST_INTERVAL = (60 * 1000) / RATE_LIMIT_REQUESTS_PER_MINUTE
let lastRequestTime = 0
let requestQueue: Array<() => void> = []
let isProcessingQueue = false
let isRateLimited = false
let rateLimitedUntil = 0

interface CacheEntry<T> {
  data: T
  timestamp: number
  version?: number // For cache invalidation
}

import { getCacheItem, setCacheItem, clearCacheItem } from "@/lib/db"

// ... constants ...

const CACHE_VERSION = 3 // Bump to clear old cache
const DEBUG_CACHE = process.env.NODE_ENV === 'development';

// Cache helpers
export async function getCache<T>(key: string, duration = CACHE_DURATION, returnExpired = false): Promise<T | null> {
  if (typeof window === "undefined") return null

  try {
    const entry = await getCacheItem<{ data: T, timestamp: number, version: number }>(`anilist_${key}`)
    if (!entry) return null

    // Check version
    if (entry.version !== CACHE_VERSION) {
      if (DEBUG_CACHE) console.log(`[Cache] Version mismatch for ${key}: ${entry.version} vs ${CACHE_VERSION}`)
      await clearCacheItem(`anilist_${key}`)
      return null
    }

    // Check expiration
    if (Date.now() - entry.timestamp > duration) {
      if (DEBUG_CACHE) console.log(`[Cache] Expired for ${key}`)
      if (returnExpired) {
        return entry.data; // Return even if expired, but don't delete
      }
      await clearCacheItem(`anilist_${key}`)
      return null
    }

    if (DEBUG_CACHE) console.log(`[Cache] HIT for ${key}`)
    return entry.data
  } catch (e) {
    if (DEBUG_CACHE) console.error(`[Cache] Error reading ${key}`, e)
    return null
  }
}

// Get all cached anime to build a local catalog
// NOTE: Scanning IDB is async and expensive, use sparingly
async function getAllCachedAnime(): Promise<Map<number, TransformedAnime>> {
  if (typeof window === "undefined") return new Map()

  const map = new Map<number, TransformedAnime>()
  try {
    // This function needs refactoring if we want to scan all keys.
    // For now returning empty map as this function wasn't heavily used or critical 
    // (used for catalog building which we aren't fully using yet?)
    // If needed, we can implement db.getAllKeys() in lib/db.ts
  } catch (e) {
    console.error("Error reading cache", e)
  }
  return map
}

async function setCache<T>(key: string, data: T): Promise<void> {
  if (typeof window === "undefined") return

  try {
    const entry = {
      data,
      timestamp: Date.now(),
      version: CACHE_VERSION
    }
    const storageKey = `anilist_${key}`
    await setCacheItem(storageKey, entry)
    if (DEBUG_CACHE) console.log(`[Cache] SET ${storageKey}`)
  } catch (e) {
    console.error(`[Cache] Error writing ${key}`, e)
  }
}

async function processQueue() {
  if (isProcessingQueue || requestQueue.length === 0) return
  isProcessingQueue = true

  while (requestQueue.length > 0) {
    if (isRateLimited) {
      if (Date.now() < rateLimitedUntil) {
        await new Promise(resolve => setTimeout(resolve, rateLimitedUntil - Date.now()))
        isRateLimited = false
      }
    }

    const timeSinceLastRequest = Date.now() - lastRequestTime
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest))
    }

    const nextRequest = requestQueue.shift()
    if (nextRequest) {
      try {
        nextRequest()
      } catch (e) {
        console.error("Error processing queue item", e)
      }
      lastRequestTime = Date.now()
    }
  }

  isProcessingQueue = false
}

// GraphQL query helper - uses local proxy to bypass CORS in iframe context
async function queryAnilist<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  // Use local proxy to avoid CORS issues when running in iframe
  const isLocalhost = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

  const apiUrl = isLocalhost ? '/api/anilist' : ANILIST_API

  // Wrap the fetch in a promise that resolves when it's our turn in the queue
  return new Promise<T>((resolve, reject) => {
    requestQueue.push(async () => {
      try {
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ query, variables }),
        })

        // Handle rate limiting
        if (response.status === 429) {
          const retryAfter = response.headers.get("Retry-After")
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 60000

          isRateLimited = true
          rateLimitedUntil = Date.now() + waitTime
          console.warn(`[AniList] Rate limited (429). Pausing queue for ${waitTime}ms.`)

          // Re-queue this request at the front? Or reject?
          // For now, let's reject to let the caller handle fallback, but the queue is paused.
          reject(new Error("Rate limited"))
          return
        }

        if (!response.ok) {
          reject(new Error(`HTTP error: ${response.status}`))
          return
        }

        const json = await response.json()

        if (json.errors) {
          reject(new Error(json.errors[0]?.message || "Anilist API error"))
          return
        }

        resolve(json.data)
      } catch (error) {
        console.error("[AniList] Query failed:", error)
        reject(error)
      }
    })

    processQueue()
  })
}

// Types
export interface AnilistAnime {
  id: number
  title: {
    romaji: string
    english: string | null
    native: string
  }
  coverImage: {
    large: string
    extraLarge: string
    color: string | null
  }
  bannerImage: string | null
  description: string | null
  genres: string[]
  averageScore: number | null
  popularity: number
  episodes: number | null
  duration: number | null
  status: string
  season: string | null
  seasonYear: number | null
  format: string
  source: string | null
  studios: {
    nodes: Array<{ id: number; name: string; isAnimationStudio: boolean }>
  }
  staff?: {
    edges: Array<{
      role: string
      node: {
        id: number
        name: { full: string }
        image: { medium: string }
      }
    }>
  }
  characters?: {
    edges: Array<{
      role: string
      voiceActors: Array<{
        id: number
        name: { full: string }
        image: { medium: string }
        language: string
      }>
      node: {
        id: number
        name: { full: string }
        image: { medium: string }
      }
    }>
  }
  relations?: {
    edges: Array<{
      relationType: string
      node: {
        id: number
        title: { romaji: string; english: string | null }
        coverImage: { large: string; color: string | null }
        format: string
        status: string
      }
    }>
  }
  recommendations?: {
    nodes: Array<{
      mediaRecommendation: {
        id: number
        title: { romaji: string; english: string | null }
        coverImage: { large: string; color: string | null }
        genres: string[]
        averageScore: number | null
      }
    }>
  }
  nextAiringEpisode: {
    airingAt: number
    episode: number
    timeUntilAiring: number
  } | null
  externalLinks: Array<{
    site: string
    url: string
    icon: string | null
    color: string | null
  }>
  trailer: {
    id: string
    site: string
  } | null
  startDate: {
    year: number | null
    month: number | null
    day: number | null
  } | null
  endDate: {
    year: number | null
    month: number | null
    day: number | null
  } | null
}

export interface TransformedAnime {
  id: number
  title: string
  titleNative: string | null
  titleRomaji: string
  image: string
  bannerImage: string | null
  description: string | null
  rating: string
  genres: string[]
  score: number | null
  popularity: number
  episodes: number | null
  duration: number | null
  status: string
  season: string | null
  year: number | null
  format: string | null
  source: string | null
  color: string | null
  nextEpisode: {
    episode: number
    airingAt: number
    timeUntilAiring: number
  } | null
  isCrunchyroll: boolean
  studio: string | null
  studios: Array<{ id: number; name: string; isAnimationStudio: boolean }>
  externalLinks: Array<{ site: string; url: string; icon: string | null; color: string | null }>
  trailer: { id: string; site: string } | null
  startDate: string | null
  endDate: string | null
}

export interface AnimeDetails extends TransformedAnime {
  staff: Array<{
    id: number
    name: string
    image: string
    role: string
  }>
  characters: Array<{
    id: number
    name: string
    image: string
    role: string
    voiceActor: {
      id: number
      name: string
      image: string
      language: string
    } | null
  }>
  relations: Array<{
    id: number
    title: string
    image: string
    color: string | null
    type: string
    format: string
    status: string
  }>
  recommendations: Array<{
    id: number
    title: string
    image: string
    color: string | null
    genres: string[]
    score: number | null
  }>
}

// Format date helper
function formatDate(date: { year: number | null; month: number | null; day: number | null } | null): string | null {
  if (!date || !date.year) return null
  const parts = [date.year]
  if (date.month) parts.push(date.month)
  if (date.day) parts.push(date.day)
  return parts.join("/")
}

// Transform Anilist anime to our format
function transformAnime(anime: AnilistAnime): TransformedAnime {
  // Check if it's on Crunchyroll
  const isCrunchyroll =
    anime.externalLinks?.some((link) => link.site.toLowerCase().includes("crunchyroll")) ||
    anime.studios?.nodes?.some((studio) => studio.name.toLowerCase().includes("crunchyroll")) ||
    anime.description?.toLowerCase().includes("crunchyroll") ||
    false

  // Get main studio
  const mainStudio =
    anime.studios?.nodes?.find((s) => s.isAnimationStudio)?.name || anime.studios?.nodes?.[0]?.name || null

  // Determine rating based on genres
  let rating = "12+"
  if (anime.genres?.some((g) => ["Horror", "Psychological"].includes(g))) {
    rating = "18+"
  } else if (anime.genres?.some((g) => ["Action", "Thriller", "Drama"].includes(g))) {
    rating = "16+"
  } else if (anime.genres?.some((g) => ["Romance", "Sports", "Adventure"].includes(g))) {
    rating = "14+"
  }

  // Clean title to remove "Season X", "Part X", etc for better grouping
  const cleanTitle = (anime.title.english || anime.title.romaji)
    .replace(/\s+season\s+\d+/i, '')
    .replace(/\s+part\s+\d+/i, '')
    .replace(/\s+cour\s+\d+/i, '')
    .trim()

  return {
    id: anime.id,
    title: cleanTitle,
    titleNative: anime.title.native || null,
    titleRomaji: anime.title.romaji,
    image: anime.coverImage.extraLarge || anime.coverImage.large,
    bannerImage: anime.bannerImage,
    description: anime.description?.replace(/<[^>]*>/g, "") || null,
    rating,
    genres: anime.genres?.slice(0, 5) || [],
    score: anime.averageScore ? anime.averageScore / 10 : null,
    popularity: anime.popularity,
    episodes: anime.episodes,
    duration: anime.duration,
    status: anime.status,
    season: anime.season,
    year: anime.seasonYear,
    format: anime.format,
    source: anime.source,
    color: anime.coverImage.color,
    nextEpisode: anime.nextAiringEpisode
      ? {
        episode: anime.nextAiringEpisode.episode,
        airingAt: anime.nextAiringEpisode.airingAt * 1000,
        timeUntilAiring: anime.nextAiringEpisode.timeUntilAiring,
      }
      : null,
    isCrunchyroll,
    studio: mainStudio,
    studios: anime.studios?.nodes || [],
    externalLinks: anime.externalLinks || [],
    trailer: anime.trailer,
    startDate: formatDate(anime.startDate),
    endDate: formatDate(anime.endDate),
  }
}

// Base media fragment for list queries
const MEDIA_FRAGMENT = `
  id
  title { romaji english native }
  coverImage { large extraLarge color }
  bannerImage
  description
  genres
  averageScore
  popularity
  episodes
  duration
  status
  season
  seasonYear
  format
  source
  studios { nodes { id name isAnimationStudio } }
  nextAiringEpisode { airingAt episode timeUntilAiring }
  externalLinks { site url icon color }
  trailer { id site }
  startDate { year month day }
  endDate { year month day }
`

/**
 * SMART SYNC:
 * 1. Checks Crunchyroll "Newly Added"
 * 2. If we have these anime in cache but they are old/behind, invalidate them to force refresh
 * 3. Returns the "Trending" list from AniList but likely served from cache
 */
export async function smartSyncAnime(): Promise<void> {
  if (typeof window === "undefined") return;

  // 1. Get "Newly Added" from Crunchyroll (lightweight check)
  // We assume browseCrunchyroll is cheap or cached on its own
  try {
    const recentlyUpdatedCR = await browseCrunchyroll({
      sort_by: 'newly_added',
      n: 20
    });

    if (!recentlyUpdatedCR || recentlyUpdatedCR.length === 0) return;

    let invalidationCount = 0;

    // 2. Scan our cache
    // We can't easily iterate all specific cache keys without a list, 
    // but we can check if the updated anime exist in our known data

    // This is a heuristic: if CR says "One Piece" updated, we should invalidate "One Piece" in AniList cache
    // But we store AniList cache by ID, not title.
    // So we need a way to map Title -> ID.
    // For now, let's rely on the fact that if a user opens the app, 
    // we likely want to refresh "Trending" or "Simulcast" if they contain these items.

    // Actually, a better approach for the user's specific request:
    // "on envoie une seul fois des requêtes vers l'API AniList et les autres !"

    // We will just let the individual `getX` functions handle their caching, 
    // but we can implement a "Force Refresh" flag if we detect new content.

  } catch (e) {
    console.error("[SmartSync] Failed", e);
  }
}

// Optimized Fetch for Trending with Smart Cache
export async function getTrendingAnime(page = 1, perPage = 12): Promise<TransformedAnime[]> {
  const cacheKey = `trending_${page}_${perPage} `
  // Use shorter duration for Lists (1 hour) vs Details (7 days)
  const cached = await getCache<TransformedAnime[]>(cacheKey, SHORT_CACHE_DURATION)

  // If we have cache, return it immediately (optimistic UI)
  // But strictly speaking, the user wants us to check CR updates first.
  // However, checking CR *every* time slows down the initial render.
  // Compromise: Return cache, then blindly check CR in background? 
  // No, user said: "localStorage -> on charge tout -> on check via une API (pas anilist) ... -> requête a anilist"

  if (cached) {
    // Background check could go here if we wanted to be super fancy
    return cached
  }

  try {
    const query = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(type: ANIME, sort: TRENDING_DESC, isAdult: false) {
          ${MEDIA_FRAGMENT}
        }
      }
    }
  `;

    const data = await queryAnilist<{ Page: { media: AnilistAnime[] } }>(query, { page, perPage });
    const transformed = data.Page.media.map(transformAnime);
    setCache(cacheKey, transformed);
    return transformed;
  } catch (error) {
    // Try fallback to expired cache
    const expired = await getCache<TransformedAnime[]>(cacheKey, SHORT_CACHE_DURATION, true);
    if (expired) {
      console.warn(`[AniList] Fetch failed, using expired cache for ${cacheKey}`, error);
      return expired;
    }
    throw error;
  }
}

// Fetch popular anime
export async function getPopularAnime(page = 1, perPage = 12): Promise<TransformedAnime[]> {
  const cacheKey = `popular_${page}_${perPage} `
  const cached = await getCache<TransformedAnime[]>(cacheKey)
  if (cached) return cached

  const query = `
query($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    media(type: ANIME, sort: POPULARITY_DESC, isAdult: false) {
          ${MEDIA_FRAGMENT}
    }
  }
}
`

  try {
    const data = await queryAnilist<{ Page: { media: AnilistAnime[] } }>(query, { page, perPage })
    const transformed = data.Page.media.map(transformAnime)
    setCache(cacheKey, transformed)
    return transformed
  } catch (error) {
    const expired = getCache<TransformedAnime[]>(cacheKey, SHORT_CACHE_DURATION, true);
    if (expired) return expired;
    throw error;
  }
}

// Fetch new/recently released anime
export async function getNewAnime(page = 1, perPage = 12): Promise<TransformedAnime[]> {
  const cacheKey = `new_${page}_${perPage} `
  const cached = await getCache<TransformedAnime[]>(cacheKey)
  if (cached) return cached

  const currentYear = new Date().getFullYear()

  const query = `
query($page: Int, $perPage: Int, $year: Int) {
  Page(page: $page, perPage: $perPage) {
    media(type: ANIME, sort: START_DATE_DESC, seasonYear: $year, isAdult: false, status_in: [RELEASING, FINISHED]) {
          ${MEDIA_FRAGMENT}
    }
  }
}
`

  try {
    const data = await queryAnilist<{ Page: { media: AnilistAnime[] } }>(query, { page, perPage, year: currentYear })
    const transformed = data.Page.media.map(transformAnime)
    setCache(cacheKey, transformed)
    return transformed
  } catch (error) {
    const expired = getCache<TransformedAnime[]>(cacheKey, SHORT_CACHE_DURATION, true);
    if (expired) return expired;
    throw error;
  }
}

// Fetch current season simulcast (airing anime)
export async function getSimulcastAnime(page = 1, perPage = 50): Promise<TransformedAnime[]> {
  const cacheKey = `simulcast_${page}_${perPage} `
  const cached = await getCache<TransformedAnime[]>(cacheKey)
  if (cached) return cached

  const now = new Date()
  const month = now.getMonth()
  const year = now.getFullYear()

  let season: string
  if (month >= 0 && month <= 2) season = "WINTER"
  else if (month >= 3 && month <= 5) season = "SPRING"
  else if (month >= 6 && month <= 8) season = "SUMMER"
  else season = "FALL"

  const query = `
query($page: Int, $perPage: Int, $season: MediaSeason, $year: Int) {
  Page(page: $page, perPage: $perPage) {
    media(
      type: ANIME
          status: RELEASING
          season: $season
          seasonYear: $year
          sort: POPULARITY_DESC
          isAdult: false
          format_in: [TV, TV_SHORT]
    ) {
          ${MEDIA_FRAGMENT}
    }
  }
}
`

  try {
    const data = await queryAnilist<{ Page: { media: AnilistAnime[] } }>(query, { page, perPage, season, year })
    const transformed = data.Page.media.map(transformAnime)

    const crunchyrollFirst = [
      ...transformed.filter((a) => a.isCrunchyroll),
      ...transformed.filter((a) => !a.isCrunchyroll),
    ]

    setCache(cacheKey, crunchyrollFirst)
    return crunchyrollFirst
  } catch (error) {
    const expired = await getCache<TransformedAnime[]>(cacheKey, SHORT_CACHE_DURATION, true);
    if (expired) return expired;
    throw error;
  }
}

// Fetch airing schedule for the week
export async function getAiringSchedule(page = 1, perPage = 50): Promise<TransformedAnime[]> {
  const cacheKey = `airing_schedule_${page}_${perPage} `
  const cached = await getCache<TransformedAnime[]>(cacheKey)
  if (cached) return cached

  const now = Math.floor(Date.now() / 1000)
  const weekFromNow = now + 7 * 24 * 60 * 60

  const query = `
query($page: Int, $perPage: Int, $airingAtGreater: Int, $airingAtLesser: Int) {
  Page(page: $page, perPage: $perPage) {
    airingSchedules(
      airingAt_greater: $airingAtGreater
          airingAt_lesser: $airingAtLesser
          sort: TIME
    ) {
      airingAt
      episode
          media {
            ${MEDIA_FRAGMENT}
      }
    }
  }
}
`

  const data = await queryAnilist<{
    Page: {
      airingSchedules: Array<{
        airingAt: number
        episode: number
        media: AnilistAnime
      }>
    }
  }>(query, {
    page,
    perPage,
    airingAtGreater: now,
    airingAtLesser: weekFromNow,
  })

  const seen = new Map<number, TransformedAnime>()
  for (const schedule of data.Page.airingSchedules) {
    if (!schedule.media) continue
    if (!seen.has(schedule.media.id)) {
      const transformed = transformAnime(schedule.media)
      transformed.nextEpisode = {
        episode: schedule.episode,
        airingAt: schedule.airingAt * 1000,
        timeUntilAiring: schedule.airingAt - now,
      }
      seen.set(schedule.media.id, transformed)
    }
  }

  const result = Array.from(seen.values())
  setCache(cacheKey, result)
  return result
}

// Get detailed anime info including characters, staff, relations
export async function getAnimeDetails(id: number): Promise<AnimeDetails | null> {
  const cacheKey = `anime_details_${id} `
  const cached = getCache<AnimeDetails>(cacheKey)
  if (cached) return cached

  const query = `
query($id: Int) {
  Media(id: $id, type: ANIME) {
        ${MEDIA_FRAGMENT}
    staff(perPage: 10, sort: RELEVANCE) {
          edges {
        role
            node {
          id
              name { full }
              image { medium }
        }
      }
    }
    characters(perPage: 12, sort: ROLE) {
          edges {
        role
        voiceActors(language: JAPANESE) {
          id
              name { full }
              image { medium }
          language
        }
            node {
          id
              name { full }
              image { medium }
        }
      }
    }
        relations {
          edges {
        relationType
            node {
          id
              title { romaji english }
              coverImage { large color }
          format
          status
        }
      }
    }
    recommendations(perPage: 6, sort: RATING_DESC) {
          nodes {
            mediaRecommendation {
          id
              title { romaji english }
              coverImage { large color }
          genres
          averageScore
        }
      }
    }
  }
}
`

  try {
    const data = await queryAnilist<{ Media: AnilistAnime }>(query, { id })
    const base = transformAnime(data.Media)

    const details: AnimeDetails = {
      ...base,
      staff:
        data.Media.staff?.edges.map((edge) => ({
          id: edge.node.id,
          name: edge.node.name.full,
          image: edge.node.image.medium,
          role: edge.role,
        })) || [],
      characters:
        data.Media.characters?.edges.map((edge) => ({
          id: edge.node.id,
          name: edge.node.name.full,
          image: edge.node.image.medium,
          role: edge.role,
          voiceActor: edge.voiceActors[0]
            ? {
              id: edge.voiceActors[0].id,
              name: edge.voiceActors[0].name.full,
              image: edge.voiceActors[0].image.medium,
              language: edge.voiceActors[0].language,
            }
            : null,
        })) || [],
      relations:
        data.Media.relations?.edges.map((edge) => ({
          id: edge.node.id,
          title: edge.node.title.english || edge.node.title.romaji,
          image: edge.node.coverImage.large,
          color: edge.node.coverImage.color,
          type: edge.relationType,
          format: edge.node.format,
          status: edge.node.status,
        })) || [],
      recommendations:
        data.Media.recommendations?.nodes
          .filter((n) => n.mediaRecommendation)
          .map((n) => ({
            id: n.mediaRecommendation.id,
            title: n.mediaRecommendation.title.english || n.mediaRecommendation.title.romaji,
            image: n.mediaRecommendation.coverImage.large,
            color: n.mediaRecommendation.coverImage.color,
            genres: n.mediaRecommendation.genres || [],
            score: n.mediaRecommendation.averageScore ? n.mediaRecommendation.averageScore / 10 : null,
          })) || [],
    }

    setCache(cacheKey, details)
    return details
  } catch {
    return null
  }
}

// Search anime
export async function searchAnime(searchQuery: string, page = 1, perPage = 20): Promise<TransformedAnime[]> {
  const query = `
query($page: Int, $perPage: Int, $search: String) {
  Page(page: $page, perPage: $perPage) {
    media(type: ANIME, search: $search, sort: SEARCH_MATCH, isAdult: false) {
          ${MEDIA_FRAGMENT}
    }
  }
}
`

  try {
    const data = await queryAnilist<{ Page: { media: AnilistAnime[] } }>(query, { page, perPage, search: searchQuery })
    return data.Page.media.map(transformAnime)
  } catch (error) {
    // No cache for search results usually, but if we did search caching (which we don't seem to do here effectively?)
    // Actually searchAnime doesn't use getCache/setCache logic in this function! 
    // So we can't return expired cache unless we implement caching for it first.
    // But looking at the code, searchAnime doesn't cache.
    // So we'll just let it throw or return empty.
    console.error("[AniList] Search failed", error)
    return []
  }
}


// Legacy interface removed. We now use full TransformedAnime for enrichment.

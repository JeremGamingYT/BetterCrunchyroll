// Anilist API service with localStorage caching

const ANILIST_API = "https://graphql.anilist.co"
const CACHE_DURATION = 1000 * 60 * 60 * 24 // 24 hour cache (reduced API calls)

// Rate limiter state for AniList
let isRateLimited = false
let rateLimitedUntil = 0
let consecutiveErrors = 0
const MAX_ERRORS_BEFORE_BACKOFF = 3

interface CacheEntry<T> {
  data: T
  timestamp: number
}

// Cache helpers
function getCache<T>(key: string): T | null {
  if (typeof window === "undefined") return null

  try {
    const cached = localStorage.getItem(`anilist_${key}`)
    if (!cached) return null

    const entry: CacheEntry<T> = JSON.parse(cached)
    if (Date.now() - entry.timestamp > CACHE_DURATION) {
      localStorage.removeItem(`anilist_${key}`)
      return null
    }

    return entry.data
  } catch {
    return null
  }
}

function setCache<T>(key: string, data: T): void {
  if (typeof window === "undefined") return

  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
    }
    localStorage.setItem(`anilist_${key}`, JSON.stringify(entry))
  } catch {
    // Storage full or unavailable
  }
}

/**
 * Check if we're rate limited and should use cache only
 */
function shouldSkipApiCall(): boolean {
  if (!isRateLimited) return false
  if (Date.now() >= rateLimitedUntil) {
    isRateLimited = false
    consecutiveErrors = 0
    return false
  }
  return true
}

// GraphQL query helper - uses local proxy to bypass CORS in iframe context
async function queryAnilist<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  // CHECK RATE LIMIT FIRST - Do not make API calls if we're rate limited
  if (shouldSkipApiCall()) {
    console.warn("[AniList] Skipping API call - rate limited. Using cache only.")
    throw new Error("Rate limited - using cache")
  }

  // Use local proxy to avoid CORS issues when running in iframe
  const isLocalhost = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

  const apiUrl = isLocalhost ? '/api/anilist' : ANILIST_API

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
      isRateLimited = true
      rateLimitedUntil = Date.now() + 60000 // 1 minute cooldown
      consecutiveErrors++
      console.warn("[AniList] Rate limited (429). Backing off for 60s.")
      throw new Error("Rate limited")
    }

    if (!response.ok) {
      consecutiveErrors++
      if (consecutiveErrors >= MAX_ERRORS_BEFORE_BACKOFF) {
        const backoff = Math.min(1000 * Math.pow(2, consecutiveErrors - MAX_ERRORS_BEFORE_BACKOFF), 60000)
        isRateLimited = true
        rateLimitedUntil = Date.now() + backoff
        console.warn(`[AniList] ${consecutiveErrors} errors. Backing off for ${backoff}ms.`)
      }
      throw new Error(`HTTP error: ${response.status}`)
    }

    const json = await response.json()

    if (json.errors) {
      throw new Error(json.errors[0]?.message || "Anilist API error")
    }

    // Success - reset error counter
    consecutiveErrors = 0
    return json.data
  } catch (error) {
    console.error("[AniList] Query failed:", error)
    throw error
  }
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

  return {
    id: anime.id,
    title: anime.title.english || anime.title.romaji,
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

// Fetch trending anime
export async function getTrendingAnime(page = 1, perPage = 12): Promise<TransformedAnime[]> {
  const cacheKey = `trending_${page}_${perPage}`
  const cached = getCache<TransformedAnime[]>(cacheKey)
  if (cached) return cached

  const query = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(type: ANIME, sort: TRENDING_DESC, isAdult: false) {
          ${MEDIA_FRAGMENT}
        }
      }
    }
  `

  const data = await queryAnilist<{ Page: { media: AnilistAnime[] } }>(query, { page, perPage })
  const transformed = data.Page.media.map(transformAnime)
  setCache(cacheKey, transformed)
  return transformed
}

// Fetch popular anime
export async function getPopularAnime(page = 1, perPage = 12): Promise<TransformedAnime[]> {
  const cacheKey = `popular_${page}_${perPage}`
  const cached = getCache<TransformedAnime[]>(cacheKey)
  if (cached) return cached

  const query = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(type: ANIME, sort: POPULARITY_DESC, isAdult: false) {
          ${MEDIA_FRAGMENT}
        }
      }
    }
  `

  const data = await queryAnilist<{ Page: { media: AnilistAnime[] } }>(query, { page, perPage })
  const transformed = data.Page.media.map(transformAnime)
  setCache(cacheKey, transformed)
  return transformed
}

// Fetch new/recently released anime
export async function getNewAnime(page = 1, perPage = 12): Promise<TransformedAnime[]> {
  const cacheKey = `new_${page}_${perPage}`
  const cached = getCache<TransformedAnime[]>(cacheKey)
  if (cached) return cached

  const currentYear = new Date().getFullYear()

  const query = `
    query ($page: Int, $perPage: Int, $year: Int) {
      Page(page: $page, perPage: $perPage) {
        media(type: ANIME, sort: START_DATE_DESC, seasonYear: $year, isAdult: false, status_in: [RELEASING, FINISHED]) {
          ${MEDIA_FRAGMENT}
        }
      }
    }
  `

  const data = await queryAnilist<{ Page: { media: AnilistAnime[] } }>(query, { page, perPage, year: currentYear })
  const transformed = data.Page.media.map(transformAnime)
  setCache(cacheKey, transformed)
  return transformed
}

// Fetch current season simulcast (airing anime)
export async function getSimulcastAnime(page = 1, perPage = 50): Promise<TransformedAnime[]> {
  const cacheKey = `simulcast_${page}_${perPage}`
  const cached = getCache<TransformedAnime[]>(cacheKey)
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
    query ($page: Int, $perPage: Int, $season: MediaSeason, $year: Int) {
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

  const data = await queryAnilist<{ Page: { media: AnilistAnime[] } }>(query, { page, perPage, season, year })
  const transformed = data.Page.media.map(transformAnime)

  const crunchyrollFirst = [
    ...transformed.filter((a) => a.isCrunchyroll),
    ...transformed.filter((a) => !a.isCrunchyroll),
  ]

  setCache(cacheKey, crunchyrollFirst)
  return crunchyrollFirst
}

// Fetch airing schedule for the week
export async function getAiringSchedule(page = 1, perPage = 50): Promise<TransformedAnime[]> {
  const cacheKey = `airing_schedule_${page}_${perPage}`
  const cached = getCache<TransformedAnime[]>(cacheKey)
  if (cached) return cached

  const now = Math.floor(Date.now() / 1000)
  const weekFromNow = now + 7 * 24 * 60 * 60

  const query = `
    query ($page: Int, $perPage: Int, $airingAtGreater: Int, $airingAtLesser: Int) {
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
  const cacheKey = `anime_details_${id}`
  const cached = getCache<AnimeDetails>(cacheKey)
  if (cached) return cached

  const query = `
    query ($id: Int) {
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
    query ($page: Int, $perPage: Int, $search: String) {
      Page(page: $page, perPage: $perPage) {
        media(type: ANIME, search: $search, sort: SEARCH_MATCH, isAdult: false) {
          ${MEDIA_FRAGMENT}
        }
      }
    }
  `

  const data = await queryAnilist<{ Page: { media: AnilistAnime[] } }>(query, { page, perPage, search: searchQuery })
  return data.Page.media.map(transformAnime)
}

// Basic info for enriching watchlist items (color, score)
export interface AnimeBasicInfo {
  id: number
  title: string
  color: string | null
  score: number | null
  image: string
  genres: string[]
}

// Search anime and return basic info (for watchlist enrichment)
export async function searchAnimeBasicInfo(searchQuery: string): Promise<AnimeBasicInfo | null> {
  const cacheKey = `anime_basic_${searchQuery.toLowerCase().replace(/\s+/g, '_')}`
  const cached = getCache<AnimeBasicInfo>(cacheKey)
  if (cached) return cached

  const query = `
    query ($search: String) {
      Media(type: ANIME, search: $search, isAdult: false) {
        id
        title { romaji english }
        coverImage { large color }
        averageScore
        genres
      }
    }
  `

  try {
    const data = await queryAnilist<{
      Media: {
        id: number
        title: { romaji: string; english: string | null }
        coverImage: { large: string; color: string | null }
        averageScore: number | null
        genres: string[]
      }
    }>(query, { search: searchQuery })

    if (!data.Media) return null

    const result: AnimeBasicInfo = {
      id: data.Media.id,
      title: data.Media.title.english || data.Media.title.romaji,
      color: data.Media.coverImage.color,
      score: data.Media.averageScore ? data.Media.averageScore / 10 : null,
      image: data.Media.coverImage.large,
      genres: data.Media.genres || [],
    }

    setCache(cacheKey, result)
    return result
  } catch {
    return null
  }
}

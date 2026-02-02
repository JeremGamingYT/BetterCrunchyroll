// Crunchyroll API service with localStorage caching
// Uses postMessage to communicate with content script when on Crunchyroll
// Falls back to API proxy route for local development

const API_PROXY = "/api/crunchyroll"
const CACHE_DURATION = 1000 * 60 * 60 // 1 hour cache

interface CacheEntry<T> {
    data: T
    timestamp: number
}

// ===============================
// Cache Helpers
// ===============================

function getCache<T>(key: string): T | null {
    if (typeof window === "undefined") return null

    try {
        const cached = localStorage.getItem(`crunchyroll_${key}`)
        if (!cached) return null

        const entry: CacheEntry<T> = JSON.parse(cached)
        if (Date.now() - entry.timestamp > CACHE_DURATION) {
            localStorage.removeItem(`crunchyroll_${key}`)
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
        localStorage.setItem(`crunchyroll_${key}`, JSON.stringify(entry))
    } catch {
        // Storage full or unavailable
    }
}

function clearCache(key: string): void {
    if (typeof window === "undefined") return
    localStorage.removeItem(`crunchyroll_${key}`)
}

// ===============================
// Check if running in extension iframe on Crunchyroll
// ===============================

let _isInIframe: boolean | null = null
let _parentResponded = false

function isInCrunchyrollIframe(): boolean {
    if (typeof window === "undefined") return false

    // Cache the result
    if (_isInIframe !== null) return _isInIframe

    try {
        // Check if we're in an iframe
        const inIframe = window.self !== window.top

        // If we're in an iframe, assume it's the extension iframe
        // The extension is the only thing that would load our app in an iframe on Crunchyroll
        _isInIframe = inIframe

        console.log('[Crunchyroll] Iframe detection:', { inIframe, result: _isInIframe })

        return _isInIframe
    } catch (e) {
        console.log('[Crunchyroll] Iframe detection error:', e)
        // If we can't access window.top, we're definitely in a cross-origin iframe
        _isInIframe = true
        return true
    }
}

// ===============================
// Message-based API Request (via content script)
// ===============================

let requestId = 0
const pendingRequests = new Map<number, { resolve: (data: unknown) => void; reject: (error: Error) => void }>()

// Listen for responses from content script
if (typeof window !== "undefined") {
    window.addEventListener('message', (event) => {
        if (event.data?.type === 'CRUNCHYROLL_API_RESPONSE') {
            const { id, success, data, error } = event.data
            const pending = pendingRequests.get(id)

            if (pending) {
                pendingRequests.delete(id)
                if (success) {
                    pending.resolve(data)
                } else {
                    pending.reject(new Error(error || 'API request failed (No token?)'))
                }
            }
        }
    })
}

async function fetchViaContentScript<T>(endpoint: string, params: Record<string, string>): Promise<T> {
    return new Promise((resolve, reject) => {
        const id = ++requestId

        pendingRequests.set(id, {
            resolve: resolve as (data: unknown) => void,
            reject
        })

        // Send request to parent (content script)
        window.parent.postMessage({
            type: 'CRUNCHYROLL_API_REQUEST',
            id,
            endpoint,
            params,
        }, '*')

        // Timeout after 30 seconds
        setTimeout(() => {
            if (pendingRequests.has(id)) {
                pendingRequests.delete(id)
                reject(new Error('Request timeout'))
            }
        }, 30000)
    })
}

// ===============================
// API Proxy Fallback (for local dev without extension)
// ===============================

async function fetchViaProxy<T>(endpoint: string, params: Record<string, string>): Promise<T> {
    const url = new URL(API_PROXY, window.location.origin)
    url.searchParams.append('endpoint', endpoint)

    Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value)
    })

    const response = await fetch(url.toString(), {
        method: "GET",
        headers: { "Accept": "application/json" },
    })

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `API error: ${response.status}`)
    }

    return response.json()
}

// ===============================
// Main API Request Function
// ===============================

async function crunchyrollFetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    // If running in Crunchyroll iframe, use postMessage to content script
    if (isInCrunchyrollIframe()) {
        console.log('[Crunchyroll] Using content script proxy for:', endpoint)
        return fetchViaContentScript<T>(endpoint, params)
    }

    // Otherwise, use API proxy
    console.log('[Crunchyroll] Using API proxy for:', endpoint)
    return fetchViaProxy<T>(endpoint, params)
}

// ===============================
// Types
// ===============================

export interface CrunchyrollSeries {
    id: string
    title: string
    slug_title: string
    description: string
    images: {
        poster_tall?: Array<Array<{ width: number; height: number; source: string }>>
        poster_wide?: Array<Array<{ width: number; height: number; source: string }>>
    }
    series_metadata?: {
        episode_count: number
        season_count: number
        is_dubbed: boolean
        is_subbed: boolean
        audio_locales: string[]
        subtitle_locales: string[]
        maturity_ratings: string[]
    }
}

export interface CrunchyrollSeason {
    id: string
    title: string
    season_number: number
    is_dubbed: boolean
    is_subbed: boolean
    audio_locale: string
    subtitle_locales: string[]
}

export interface CrunchyrollEpisode {
    id: string
    title: string
    slug_title: string
    episode: string
    episode_number: number | null
    sequence_number: number
    description: string
    duration_ms: number
    is_premium_only: boolean
    is_clip: boolean
    is_dubbed: boolean
    is_subbed: boolean
    audio_locale: string
    subtitle_locales: string[]
    images: {
        thumbnail?: Array<Array<{ width: number; height: number; source: string }>>
    }
    season_id: string
    season_title: string
    season_number: number
    series_id: string
    series_title: string
    availability_starts?: string
    availability_ends?: string
}

export interface CrunchyrollSearchResult {
    type: string
    count: number
    items: Array<{
        id: string
        type: string
        title: string
        slug_title: string
        description: string
        images: {
            poster_tall?: Array<Array<{ width: number; height: number; source: string }>>
            poster_wide?: Array<Array<{ width: number; height: number; source: string }>>
        }
    }>
}

export interface TransformedCrunchyrollAnime {
    crunchyrollId: string
    title: string
    slug: string
    episodeCount: number
    seasonCount: number
    isDubbed: boolean
    isSubbed: boolean
}

export interface TransformedCrunchyrollEpisode {
    id: string
    title: string
    episodeNumber: number | null
    sequenceNumber: number
    description: string
    duration: number // in minutes
    thumbnail: string | null
    isPremium: boolean
    isDubbed: boolean
    isSubbed: boolean
    audioLocale: string
    seasonId: string
    seasonTitle: string
    seasonNumber: number
    seriesId: string
    seriesTitle: string
    availableFrom: string | null
}

// ===============================
// Transform Helpers
// ===============================

function getBestImage(images: any): string | null {
    if (!images) return null

    // Structure 1: Array of arrays (used in content-v2)
    if (Array.isArray(images) && images.length > 0) {
        const firstLayer = images[0]
        if (Array.isArray(firstLayer) && firstLayer.length > 0) {
            const sorted = [...firstLayer].sort((a, b) => (b.width || 0) - (a.width || 0))
            return sorted[0]?.source || null
        }
        // Structure 2: Simple array
        const sorted = [...images].sort((a: any, b: any) => (b.width || 0) - (a.width || 0))
        return sorted[0]?.source || sorted[0]?.url || null
    }

    // Structure 3: Object with named resolutions
    if (typeof images === 'object') {
        const resolutions = Object.values(images)
        if (resolutions.length > 0) {
            return (resolutions[resolutions.length - 1] as any).source || null
        }
    }

    return null
}

function transformEpisode(episode: CrunchyrollEpisode): TransformedCrunchyrollEpisode {
    return {
        id: episode.id,
        title: episode.title,
        episodeNumber: episode.episode_number,
        sequenceNumber: episode.sequence_number,
        description: episode.description,
        duration: Math.round(episode.duration_ms / 60000), // Convert ms to minutes
        thumbnail: getBestImage(episode.images?.thumbnail),
        isPremium: episode.is_premium_only,
        isDubbed: episode.is_dubbed,
        isSubbed: episode.is_subbed,
        audioLocale: episode.audio_locale,
        seasonId: episode.season_id,
        seasonTitle: episode.season_title,
        seasonNumber: episode.season_number,
        seriesId: episode.series_id,
        seriesTitle: episode.series_title,
        availableFrom: episode.availability_starts || null,
    }
}

// ===============================
// API Functions
// ===============================

/**
 * Search for anime on Crunchyroll by title
 * Returns the search results with basic info
 */
export async function searchCrunchyroll(query: string, limit = 10): Promise<CrunchyrollSearchResult | null> {
    const cacheKey = `search_${query}_${limit}`
    const cached = getCache<CrunchyrollSearchResult>(cacheKey)
    if (cached) return cached

    try {
        const data = await crunchyrollFetch<{ data: CrunchyrollSearchResult[] }>(
            "/content/v2/discover/search",
            {
                q: query,
                n: String(limit),
                type: "series",
            }
        )

        // Find the series results
        const seriesResult = data.data?.find(r => r.type === "series") || null

        if (seriesResult) {
            setCache(cacheKey, seriesResult)
        }

        return seriesResult
    } catch (error) {
        console.error("[Crunchyroll] Search failed:", error)
        return null
    }
}

/**
 * Check if an anime title exists on Crunchyroll
 * Returns the Crunchyroll series info if found, null otherwise
 */
export async function checkAnimeAvailability(title: string): Promise<TransformedCrunchyrollAnime | null> {
    const cacheKey = `availability_v2_${title.toLowerCase().replace(/\s+/g, '_')}`
    const cached = getCache<TransformedCrunchyrollAnime | null>(cacheKey)
    if (cached !== null) return cached

    try {
        const searchResult = await searchCrunchyroll(title, 5)

        if (!searchResult || searchResult.items.length === 0) {
            setCache(cacheKey, null)
            return null
        }

        // Helper to normalize titles for comparison
        // Removes subtitles (after :), seasons, special chars, etc.
        const cleanTitle = (t: string) => {
            return t.toLowerCase()
                // Remove content after a colon (often subtitles/arc names like ": The Culling Game")
                // but only if the part before colon is substantial (>3 chars) to avoid breaking short titles
                .replace(/^(.{3,}):.+$/, '$1')
                .replace(/\s*season\s*\d+/g, '') // Remove "Season X"
                .replace(/\s*s\d+/g, '') // Remove "S2"
                .replace(/[^a-z0-9]/g, '') // Allow only alphanumeric
        }

        const targetTitle = cleanTitle(title)

        // Find best match
        let match = searchResult.items.find(item => {
            if (item.type !== "series") return false
            const itemTitle = cleanTitle(item.title)

            // Check exact match after cleaning
            if (itemTitle === targetTitle) return true

            // Check if one contains the other (for cases like "Jujutsu Kaisen" matching "Jujutsu Kaisen 2nd Season")
            if (itemTitle.includes(targetTitle) || targetTitle.includes(itemTitle)) return true

            return false
        })

        if (!match) {
            // Last ditch effort: Check original titles for inclusion without aggressive cleaning
            // This handles cases where the colon logic might have been too aggressive or not applicable
            const simpleNorm = (t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, '')
            const simpleTarget = simpleNorm(title)

            match = searchResult.items.find(item => {
                if (item.type !== "series") return false
                const simpleItem = simpleNorm(item.title)
                return simpleItem.includes(simpleTarget) || simpleTarget.includes(simpleItem)
            })
        }

        if (!match) {
            setCache(cacheKey, null)
            return null
        }

        // Get full series info
        const seriesInfo = await getSeries(match.id)

        const result: TransformedCrunchyrollAnime = {
            crunchyrollId: match.id,
            title: match.title,
            slug: match.slug_title,
            episodeCount: seriesInfo?.series_metadata?.episode_count || 0,
            seasonCount: seriesInfo?.series_metadata?.season_count || 0,
            isDubbed: seriesInfo?.series_metadata?.is_dubbed || false,
            isSubbed: seriesInfo?.series_metadata?.is_subbed || true,
        }

        setCache(cacheKey, result)
        return result
    } catch (error) {
        console.error("[Crunchyroll] Availability check failed:", error)
        return null
    }
}

/**
 * Get series information by Crunchyroll ID
 */
export async function getSeries(seriesId: string): Promise<CrunchyrollSeries | null> {
    const cacheKey = `series_${seriesId}`
    const cached = getCache<CrunchyrollSeries>(cacheKey)
    if (cached) return cached

    try {
        const data = await crunchyrollFetch<{ data: CrunchyrollSeries[] }>(
            `/content/v2/cms/series/${seriesId}`
        )

        const series = data.data?.[0] || null

        if (series) {
            setCache(cacheKey, series)
        }

        return series
    } catch (error) {
        console.error("[Crunchyroll] Get series failed:", error)
        return null
    }
}

/**
 * Get all seasons for a series
 */
export async function getSeasons(seriesId: string): Promise<CrunchyrollSeason[]> {
    const cacheKey = `seasons_${seriesId}`
    const cached = getCache<CrunchyrollSeason[]>(cacheKey)
    if (cached) return cached

    try {
        const data = await crunchyrollFetch<{ data: CrunchyrollSeason[] }>(
            `/content/v2/cms/series/${seriesId}/seasons`
        )

        const seasons = data.data || []
        setCache(cacheKey, seasons)

        return seasons
    } catch (error) {
        console.error("[Crunchyroll] Get seasons failed:", error)
        return []
    }
}

/**
 * Get episodes for a specific season
 */
export async function getSeasonEpisodes(seasonId: string): Promise<TransformedCrunchyrollEpisode[]> {
    const cacheKey = `episodes_${seasonId}`
    const cached = getCache<TransformedCrunchyrollEpisode[]>(cacheKey)
    if (cached) return cached

    try {
        const data = await crunchyrollFetch<{ data: CrunchyrollEpisode[] }>(
            `/content/v2/cms/seasons/${seasonId}/episodes`
        )

        const episodes = (data.data || [])
            .filter(ep => !ep.is_clip)
            .map(transformEpisode)

        setCache(cacheKey, episodes)

        return episodes
    } catch (error) {
        console.error("[Crunchyroll] Get episodes failed:", error)
        return []
    }
}

/**
 * Get all episodes for a series (across all seasons)
 */
export async function getAllSeriesEpisodes(seriesId: string): Promise<TransformedCrunchyrollEpisode[]> {
    const cacheKey = `all_episodes_${seriesId}`
    const cached = getCache<TransformedCrunchyrollEpisode[]>(cacheKey)
    if (cached) return cached

    try {
        const seasons = await getSeasons(seriesId)

        // Get episodes for each season in parallel
        const episodePromises = seasons.map(season => getSeasonEpisodes(season.id))
        const episodesArrays = await Promise.all(episodePromises)

        // Flatten and sort by sequence number
        const allEpisodes = episodesArrays
            .flat()
            .sort((a, b) => a.sequenceNumber - b.sequenceNumber)

        setCache(cacheKey, allEpisodes)

        return allEpisodes
    } catch (error) {
        console.error("[Crunchyroll] Get all episodes failed:", error)
        return []
    }
}

/**
 * Browse Crunchyroll catalog
 */
export async function browseCrunchyroll(options: {
    n?: number
    start?: number
    sort_by?: 'popularity' | 'newly_added' | 'alphabetical'
    is_dubbed?: boolean
    is_subbed?: boolean
} = {}): Promise<CrunchyrollSeries[]> {
    const params: Record<string, string> = {
        n: String(options.n || 50),
        start: String(options.start || 0),
        type: 'series',
    }

    if (options.sort_by) params.sort_by = options.sort_by
    if (options.is_dubbed !== undefined) params.is_dubbed = String(options.is_dubbed)
    if (options.is_subbed !== undefined) params.is_subbed = String(options.is_subbed)

    const cacheKey = `browse_${JSON.stringify(params)}`
    const cached = getCache<CrunchyrollSeries[]>(cacheKey)
    if (cached) return cached

    try {
        const data = await crunchyrollFetch<{ data: CrunchyrollSeries[] }>(
            "/content/v2/discover/browse",
            params
        )

        const series = data.data || []
        setCache(cacheKey, series)

        return series
    } catch (error) {
        console.error("[Crunchyroll] Browse failed:", error)
        return []
    }
}

/**
 * Get a mapping of available anime on Crunchyroll
 * This is used to filter AniList results
 */
export async function getCrunchyrollCatalog(limit = 100): Promise<Map<string, TransformedCrunchyrollAnime>> {
    const cacheKey = `catalog_${limit}`

    // Try to get from localStorage
    const cachedArray = getCache<TransformedCrunchyrollAnime[]>(cacheKey)
    if (cachedArray) {
        const map = new Map<string, TransformedCrunchyrollAnime>()
        cachedArray.forEach(item => {
            // Index by normalized title for matching
            const normalizedTitle = item.title.toLowerCase().replace(/[^a-z0-9]/g, '')
            map.set(normalizedTitle, item)
        })
        return map
    }

    try {
        const series = await browseCrunchyroll({ n: limit, sort_by: 'popularity' })

        const catalog: TransformedCrunchyrollAnime[] = series.map(s => ({
            crunchyrollId: s.id,
            title: s.title,
            slug: s.slug_title,
            episodeCount: s.series_metadata?.episode_count || 0,
            seasonCount: s.series_metadata?.season_count || 0,
            isDubbed: s.series_metadata?.is_dubbed || false,
            isSubbed: s.series_metadata?.is_subbed || true,
        }))

        setCache(cacheKey, catalog)

        const map = new Map<string, TransformedCrunchyrollAnime>()
        catalog.forEach(item => {
            const normalizedTitle = item.title.toLowerCase().replace(/[^a-z0-9]/g, '')
            map.set(normalizedTitle, item)
        })

        return map
    } catch (error) {
        console.error("[Crunchyroll] Get catalog failed:", error)
        return new Map()
    }
}

// ===============================
// Account & Profile Types
// ===============================

export interface CrunchyrollAccount {
    account_id: string
    external_id: string
    email: string
    email_verified: boolean
    created: string
}

export interface CrunchyrollProfile {
    profile_id: string
    username: string
    avatar: string // Transformed from { assets: [...] } to string in getProfile()
    wallpaper?: string
    profile_name?: string
    is_primary?: boolean
    preferred_content_audio_language?: string
    preferred_content_subtitle_language?: string
    cr_beta_opt_in?: boolean
}

// Watchlist item as returned by Crunchyroll API
// The API returns episodes/movies with their panel data
export interface CrunchyrollWatchlistItem {
    panel: {
        id: string
        type: string // 'episode' or 'movie'
        title: string
        slug_title: string
        slug: string
        description: string
        promo_title?: string
        promo_description?: string
        channel_id: string
        external_id?: string
        linked_resource_key?: string
        streams_link?: string
        recent_audio_locale?: string
        recent_variant?: string
        images?: {
            thumbnail?: Array<Array<{ width: number; height: number; source: string; type: string }>>
            poster_tall?: Array<Array<{ width: number; height: number; source: string }>>
            poster_wide?: Array<Array<{ width: number; height: number; source: string }>>
        }
        episode_metadata?: {
            audio_locale: string
            availability_ends: string
            availability_notes: string
            availability_starts: string
            availability_status: string
            available_date: string | null
            available_offline: boolean
            closed_captions_available: boolean
            content_descriptors?: string[]
            duration_ms: number
            eligible_region: string
            episode: string
            episode_air_date: string
            episode_number: number
            extended_maturity_rating?: {
                level: string
                rating: string
                system: string
            }
            free_available_date: string
            identifier: string
            is_clip: boolean
            is_dubbed: boolean
            is_mature: boolean
            is_premium_only: boolean
            is_subbed: boolean
            mature_blocked: boolean
            maturity_ratings: string[]
            premium_available_date: string
            premium_date: string | null
            roles?: string[]
            season_display_number: string
            season_id: string
            season_number: number
            season_sequence_number: number
            season_slug_title: string
            season_title: string
            sequence_number: number
            series_id: string
            series_slug_title: string
            series_title: string
            subtitle_locales: string[]
            tenant_categories?: string[]
            upload_date: string
            versions?: Array<{
                audio_locale: string
                guid: string
                is_premium_only: boolean
                media_guid: string
                original: boolean
                roles: string[]
                season_guid: string
                variant: string
            }>
        }
        movie_metadata?: {
            audio_locale: string
            availability_ends: string
            availability_starts: string
            duration_ms: number
            is_dubbed: boolean
            is_subbed: boolean
            maturity_ratings: string[]
            movie_listing_id: string
            movie_listing_title: string
        }
        series_metadata?: {
            episode_count: number
            season_count: number
            is_dubbed: boolean
            is_subbed: boolean
            maturity_ratings: string[]
        }
    }
    new: boolean
    is_favorite: boolean
    fully_watched: boolean
    never_watched: boolean
    playhead: number
}

export interface TransformedWatchlistItem {
    id: string
    title: string
    image: string
    description?: string
    crunchyrollId: string
    crunchyrollSlug: string
    seriesId: string
    seriesTitle: string
    seriesSlug: string
    isOnCrunchyroll: boolean
    episodes: number
    episodeCount: number
    seasonCount: number
    type: string
    rating?: string
    isDubbed: boolean
    isSubbed: boolean
    isFavorite: boolean
    isNew: boolean
    fullyWatched: boolean
    neverWatched: boolean
    playhead: number
    dateAdded?: string
    nextEpisode?: {
        episode: number
        airingAt: number
        timeUntilAiring: number
    }
    score?: number
    color?: string
    categories?: string[]
    currentEpisode?: number
    currentEpisodeId?: string
    currentEpisodeTitle?: string
    durationMs?: number
}

// ===============================
// Account & Profile API Functions
// ===============================

/**
 * Get current account information
 */
export async function getAccount(): Promise<CrunchyrollAccount | null> {
    const cacheKey = 'account_me'
    const cached = getCache<CrunchyrollAccount>(cacheKey)
    if (cached) return cached

    try {
        const data = await crunchyrollFetch<CrunchyrollAccount>(
            '/accounts/v1/me'
        )

        if (data) {
            setCache(cacheKey, data)
        }

        return data
    } catch (error) {
        console.error("[Crunchyroll] Get account failed:", error)
        return null
    }
}

/**
 * Get current profile information
 */
export async function getProfile(): Promise<CrunchyrollProfile | null> {
    const cacheKey = 'profile_me'
    const cached = getCache<CrunchyrollProfile>(cacheKey)

    // Check for local avatar override
    let localAvatar: string | null = null
    if (typeof window !== "undefined") {
        localAvatar = localStorage.getItem('crunchyroll_avatar_override')
    }

    if (cached) {
        // Apply local avatar if exists
        if (localAvatar) {
            return {
                ...cached,
                avatar: localAvatar
            }
        }
        return cached
    }

    try {
        // API response type (avatar can be object or string)
        interface APIProfileResponse extends Omit<CrunchyrollProfile, 'avatar'> {
            avatar: string | { assets: Array<{ size: string; source: string }> }
        }

        const rawData = await crunchyrollFetch<APIProfileResponse>(
            '/accounts/v1/me/profile'
        )

        if (rawData) {
            // Transform avatar if it's an object
            let avatarUrl = ''
            if (typeof rawData.avatar === 'string') {
                avatarUrl = rawData.avatar
            } else if (rawData.avatar && typeof rawData.avatar === 'object' && 'assets' in rawData.avatar) {
                const assets = rawData.avatar.assets
                if (Array.isArray(assets) && assets.length > 0) {
                    // Get the largest image (last in array)
                    avatarUrl = assets[assets.length - 1].source
                }
            }

            // Fix relative URLs
            if (avatarUrl && avatarUrl.startsWith('/')) {
                avatarUrl = `https://www.crunchyroll.com${avatarUrl}`
            }

            const data: CrunchyrollProfile = {
                ...rawData,
                avatar: avatarUrl
            }

            setCache(cacheKey, data)

            // Apply local avatar override for the return value
            if (localAvatar) {
                return {
                    ...data,
                    avatar: localAvatar
                }
            }

            return data
        }

        return null
    } catch (error) {
        console.error("[Crunchyroll] Get profile failed:", error)
        return null
    }
}

/**
 * Update local avatar override
 */
export function updateLocalAvatar(avatarUrl: string): void {
    if (typeof window === "undefined") return
    localStorage.setItem('crunchyroll_avatar_override', avatarUrl)

    // Update cache if it exists
    const cacheKey = 'profile_me'
    const cached = getCache<CrunchyrollProfile>(cacheKey)
    if (cached) {
        setCache(cacheKey, {
            ...cached,
            avatar: avatarUrl
        })
    }
}

/**
 * Get all profiles for the account
 */
export async function getProfiles(): Promise<CrunchyrollProfile[]> {
    const cacheKey = 'profiles_me'
    const cached = getCache<CrunchyrollProfile[]>(cacheKey)
    if (cached) return cached

    try {
        // API response type (avatar can be object or string)
        interface APIProfileResponse extends Omit<CrunchyrollProfile, 'avatar'> {
            avatar: string | { assets: Array<{ size: string; source: string }> }
        }

        const data = await crunchyrollFetch<{ profiles: APIProfileResponse[] }>(
            '/accounts/v1/me/multiprofile'
        )

        const rawProfiles = data.profiles || []

        // Transform avatars
        const profiles: CrunchyrollProfile[] = rawProfiles.map(rawProfile => {
            let avatarUrl = ''
            if (typeof rawProfile.avatar === 'string') {
                avatarUrl = rawProfile.avatar
            } else if (rawProfile.avatar && typeof rawProfile.avatar === 'object' && 'assets' in rawProfile.avatar) {
                const assets = rawProfile.avatar.assets
                if (Array.isArray(assets) && assets.length > 0) {
                    avatarUrl = assets[assets.length - 1].source
                }
            }

            return {
                ...rawProfile,
                avatar: avatarUrl
            }
        })

        setCache(cacheKey, profiles)

        return profiles
    } catch (error) {
        console.error("[Crunchyroll] Get profiles failed:", error)
        return []
    }
}

/**
 * Get user's watchlist from Crunchyroll
 */
export async function getWatchlist(options: {
    accountId: string
    n?: number
    start?: number
    order?: 'desc' | 'asc'
    type?: 'series' | 'movie_listing'
    sort_by?: 'date_updated' | 'date_watched' | 'date_added' | 'alphabetical'
    is_favorite?: boolean
} = { accountId: '' }): Promise<TransformedWatchlistItem[]> {
    if (!options.accountId) {
        console.error("[Crunchyroll] getWatchlist: accountId is required")
        return []
    }

    const params: Record<string, string> = {
        n: String(options.n || 100),
        start: String(options.start || 0),
    }

    if (options.order) params.order = options.order
    if (options.type) params.type = options.type
    if (options.sort_by) params.sort_by = options.sort_by
    if (options.is_favorite !== undefined) params.is_favorite = String(options.is_favorite)

    const cacheKey = `watchlist_${options.accountId}_${JSON.stringify(params)}`
    const cached = getCache<TransformedWatchlistItem[]>(cacheKey)
    if (cached) return cached

    try {
        const data = await crunchyrollFetch<{ data: CrunchyrollWatchlistItem[], total: number }>(
            `/content/v2/discover/${options.accountId}/watchlist`,
            params
        )

        // The API returns episodes/movies, we need to extract series info
        // and group by series to avoid duplicates
        const seriesMap = new Map<string, TransformedWatchlistItem>()

        for (const item of data.data || []) {
            const panel = item.panel
            const episodeMeta = panel.episode_metadata
            const movieMeta = panel.movie_metadata
            const seriesMeta = panel.series_metadata

            // Determine if this is an episode or movie
            const isEpisode = panel.type === 'episode' && episodeMeta
            const isMovie = panel.type === 'movie' && movieMeta

            // Get series info
            const seriesId = isEpisode ? episodeMeta.series_id :
                isMovie && movieMeta ? movieMeta.movie_listing_id :
                    panel.id
            const seriesTitle = isEpisode ? episodeMeta.series_title :
                isMovie && movieMeta ? movieMeta.movie_listing_title :
                    panel.title
            const seriesSlug = isEpisode ? episodeMeta.series_slug_title :
                panel.slug_title

            // Skip if we already have this series (keep the first/most recent)
            if (seriesMap.has(seriesId)) {
                continue
            }

            // Get the best image - prefer thumbnail from the panel
            const thumbnail = panel.images?.thumbnail?.[0]
            const posterTall = panel.images?.poster_tall?.[0]
            const posterWide = panel.images?.poster_wide?.[0]

            let image = ''
            if (thumbnail && thumbnail.length > 0) {
                // Get highest resolution thumbnail
                const sorted = [...thumbnail].sort((a, b) => b.width - a.width)
                image = sorted[0]?.source || ''
            } else if (posterTall && posterTall.length > 0) {
                const sorted = [...posterTall].sort((a, b) => b.width - a.width)
                image = sorted[0]?.source || ''
            } else if (posterWide && posterWide.length > 0) {
                const sorted = [...posterWide].sort((a, b) => b.width - a.width)
                image = sorted[0]?.source || ''
            }

            // Get ratings
            const ratings = episodeMeta?.maturity_ratings ||
                movieMeta?.maturity_ratings ||
                seriesMeta?.maturity_ratings || []
            const rating = ratings.length > 0 ? ratings[0] : null

            // Determine dubbed/subbed status
            const isDubbed = episodeMeta?.is_dubbed ??
                movieMeta?.is_dubbed ??
                seriesMeta?.is_dubbed ?? false
            const isSubbed = episodeMeta?.is_subbed ??
                movieMeta?.is_subbed ??
                seriesMeta?.is_subbed ?? true

            // Get categories
            const categories = episodeMeta?.tenant_categories || []

            // Episode/season counts
            const episodeCount = seriesMeta?.episode_count || 0
            const seasonCount = seriesMeta?.season_count || (isEpisode ? 1 : 0)

            const transformed: TransformedWatchlistItem = {
                id: seriesId,
                title: seriesTitle,
                image,
                description: panel.description,
                crunchyrollId: panel.id,
                crunchyrollSlug: panel.slug_title,
                seriesId,
                seriesTitle,
                seriesSlug,
                isOnCrunchyroll: true,
                episodes: episodeCount,
                episodeCount,
                seasonCount,
                type: isMovie ? 'Movie' : 'TV',
                rating: rating || undefined,
                isDubbed,
                isSubbed,
                isFavorite: item.is_favorite,
                isNew: item.new,
                fullyWatched: item.fully_watched,
                neverWatched: item.never_watched,
                playhead: item.playhead,
                // These fields are not provided by this API - leave as undefined
                dateAdded: undefined,
                nextEpisode: undefined,
                score: undefined,
                color: undefined,
                categories,
                // Current episode info
                currentEpisode: isEpisode && episodeMeta ? episodeMeta.episode_number : undefined,
                currentEpisodeId: isEpisode ? panel.id : undefined,
                currentEpisodeTitle: panel.title,
            }

            seriesMap.set(seriesId, transformed)
        }

        const items = Array.from(seriesMap.values())
        setCache(cacheKey, items)
        return items
    } catch (error) {
        console.error("[Crunchyroll] Get watchlist failed:", error)
        return []
    }
}

/**
 * Add item to watchlist
 */
export async function addToWatchlist(accountId: string, contentId: string): Promise<boolean> {
    try {
        const response = await crunchyrollFetch<any>(
            `/content/v2/${accountId}/watchlist`,
            {
                method: "POST",
                body: JSON.stringify({
                    content_id: contentId,
                }),
            }
        )
        return !!response
    } catch (error) {
        console.error("[Crunchyroll] Add to watchlist failed:", error)
        return false
    }
}

/**
 * Remove item from watchlist
 */
export async function removeFromWatchlist(accountId: string, contentId: string): Promise<boolean> {
    try {
        await crunchyrollFetch<any>(
            `/content/v2/${accountId}/watchlist/${contentId}`,
            {
                method: "DELETE",
            }
        )
        return true
    } catch (error) {
        console.error("[Crunchyroll] Remove from watchlist failed:", error)
        return false
    }
}

/**
 * Get user benefits/subscription
 */
export async function getSubscription(accountId: string): Promise<any> {
    const cacheKey = `subscription_${accountId}`
    const cached = getCache<any>(cacheKey)
    if (cached) return cached

    try {
        const data = await crunchyrollFetch<any>(
            `/subs/v1/subscriptions/${accountId}/products`
        )

        if (data) {
            setCache(cacheKey, data)
        }

        return data
    } catch (error) {
        console.error("[Crunchyroll] Get subscription failed:", error)
        return null
    }
}

/**
 * Get user watch history (Continue Watching)
 */
export async function getWatchHistory(accountId: string, options: {
    page?: number
    page_size?: number
} = {}): Promise<TransformedWatchlistItem[]> {
    const params: Record<string, string> = {
        page: String(options.page || 1),
        page_size: String(options.page_size || 10),
    }

    const cacheKey = `history_${accountId}_${JSON.stringify(params)}`
    const cached = getCache<TransformedWatchlistItem[]>(cacheKey)
    if (cached) return cached

    try {
        const data = await crunchyrollFetch<{ data: CrunchyrollWatchlistItem[], total: number }>(
            `/content/v2/${accountId}/watch-history`,
            params
        )

        // Reuse the logic from getWatchlist to transform items
        // Since the structure is the same (CrunchyrollWatchlistItem)
        const items = data.data?.map(item => {
            const panel = item.panel
            const episodeMeta = panel.episode_metadata
            const movieMeta = panel.movie_metadata
            const seriesMeta = panel.series_metadata

            // Determine if this is an episode or movie
            const isEpisode = panel.type === 'episode' && !!episodeMeta
            const isMovie = panel.type === 'movie' && !!movieMeta

            // Get series info
            const seriesId = isEpisode && episodeMeta ? episodeMeta.series_id :
                isMovie && movieMeta ? movieMeta.movie_listing_id :
                    panel.id
            const seriesTitle = isEpisode && episodeMeta ? episodeMeta.series_title :
                isMovie && movieMeta ? movieMeta.movie_listing_title :
                    panel.title
            const seriesSlug = isEpisode && episodeMeta ? episodeMeta.series_slug_title :
                panel.slug_title

            // Get the best image
            const thumbnail = panel.images?.thumbnail?.[0]

            let image = ''
            if (thumbnail && thumbnail.length > 0) {
                const sorted = [...thumbnail].sort((a, b) => b.width - a.width)
                image = sorted[0]?.source || ''
            }

            // Get ratings
            const ratings = episodeMeta?.maturity_ratings ||
                movieMeta?.maturity_ratings ||
                seriesMeta?.maturity_ratings || []
            const rating = ratings.length > 0 ? ratings[0] : null

            const episodeCount = seriesMeta?.episode_count || 0
            const seasonCount = seriesMeta?.season_count || (isEpisode ? 1 : 0)

            return {
                id: seriesId, // Use series ID for grouping/linking usually, but for history we might want specific episode?
                // Actually for history, each item IS a specific watch event.
                // But TransformedWatchlistItem uses 'id' which might be expected to be series ID by some components.
                // Let's stick to seriesID for ID, but provide currentEpisodeId.

                title: seriesTitle, // Display Series Title
                image: image,
                description: panel.description,
                crunchyrollId: panel.id, // This is the Episode ID for episodes
                crunchyrollSlug: panel.slug_title,
                seriesId,
                seriesTitle,
                seriesSlug,
                isOnCrunchyroll: true,
                episodes: episodeCount,
                episodeCount,
                seasonCount,
                type: isMovie ? 'Movie' : 'TV',
                rating: rating || undefined,
                isDubbed: episodeMeta?.is_dubbed ?? false,
                isSubbed: episodeMeta?.is_subbed ?? true,
                isFavorite: item.is_favorite,
                isNew: item.new,
                fullyWatched: item.fully_watched,
                neverWatched: item.never_watched,
                playhead: item.playhead,

                // Specific for history/continue watching
                currentEpisode: isEpisode && episodeMeta ? episodeMeta.episode_number : undefined,
                currentEpisodeId: isEpisode ? panel.id : undefined, // Redirect to this episode
                currentEpisodeTitle: panel.title,

                // Remaining time calc
                durationMs: episodeMeta?.duration_ms || movieMeta?.duration_ms || 0,
            } as TransformedWatchlistItem & { durationMs: number }
        }) || []

        setCache(cacheKey, items)
        return items
    } catch (error) {
        console.error("[Crunchyroll] Get history failed:", error)
        return []
    }
}

/**
 * Clear all Crunchyroll cache
 */
export function clearAllCrunchyrollCache(): void {
    if (typeof window === "undefined") return

    const keys = Object.keys(localStorage)
    keys.forEach(key => {
        if (key.startsWith("crunchyroll_")) {
            localStorage.removeItem(key)
        }
    })

    console.log("[Crunchyroll] Cache cleared")
}

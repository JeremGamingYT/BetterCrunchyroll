// Jikan API (MyAnimeList) Service - Fallback for AniList
// Docs: https://docs.api.jikan.moe/

const JIKAN_API = "https://api.jikan.moe/v4"

interface JikanAnime {
    mal_id: number
    title: string
    title_english: string
    images: {
        webp: {
            large_image_url: string
        }
    }
    score: number
    genres: { name: string }[]
}

// Simple cache for Jikan to avoid hitting their limits (3 req/sec)
function getJikanCache<T>(key: string): T | null {
    if (typeof window === "undefined") return null
    try {
        const item = localStorage.getItem(`jikan_${key}`)
        if (!item) return null
        const { data, timestamp } = JSON.parse(item)
        if (Date.now() - timestamp > 1000 * 60 * 60 * 24 * 7) return null // 7 days
        return data
    } catch {
        return null
    }
}

function setJikanCache<T>(key: string, data: T) {
    if (typeof window === "undefined") return
    try {
        localStorage.setItem(`jikan_${key}`, JSON.stringify({
            data,
            timestamp: Date.now()
        }))
    } catch { }
}

// Rate limiter for Jikan (3 req/s = 333ms delay, but let's be safe with 1s)
let lastJikanRequest = 0
const JIKAN_DELAY = 1000

async function fetchJikan<T>(endpoint: string): Promise<T> {
    const now = Date.now()
    const timeSinceLast = now - lastJikanRequest
    if (timeSinceLast < JIKAN_DELAY) {
        await new Promise(resolve => setTimeout(resolve, JIKAN_DELAY - timeSinceLast))
    }

    try {
        const res = await fetch(`${JIKAN_API}${endpoint}`)
        lastJikanRequest = Date.now()

        if (res.status === 429) {
            console.warn("[Jikan] Rate limited")
            throw new Error("Jikan Rate Limit")
        }

        if (!res.ok) throw new Error(`Jikan error ${res.status}`)

        return res.json()
    } catch (e) {
        console.error("[Jikan] Fetch error", e)
        throw e
    }
}

import type { AnimeBasicInfo } from "./anilist"

export async function searchJikanBasicInfo(query: string): Promise<AnimeBasicInfo | null> {
    const cacheKey = `search_${query.toLowerCase().replace(/\s+/g, '_')}`
    const cached = getJikanCache<AnimeBasicInfo>(cacheKey)
    if (cached) return cached

    try {
        const data = await fetchJikan<{ data: JikanAnime[] }>(`/anime?q=${encodeURIComponent(query)}&limit=1`)
        const anime = data.data[0]

        if (!anime) return null

        const info: AnimeBasicInfo = {
            id: anime.mal_id, // Note: This is MAL ID, not AniList ID. Consumers must handle this ambiguity if mostly just displaying.
            title: anime.title_english || anime.title,
            color: null, // MAL doesn't provide dominant color
            score: anime.score,
            image: anime.images.webp.large_image_url,
            genres: anime.genres.map(g => g.name).slice(0, 3)
        }

        setJikanCache(cacheKey, info)
        return info
    } catch {
        return null
    }
}

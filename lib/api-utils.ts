/**
 * API Utilities - Rate Limiting, Backoff, and Cache Management
 * 
 * Implements:
 * - Exponential backoff for failed requests
 * - 429 (Too Many Requests) detection and handling
 * - Request queue with rate limiting
 * - Auto-fallback to cache on errors
 */

// Rate limiter state
interface RateLimiterState {
    isLimited: boolean
    retryAfter: number
    consecutiveErrors: number
    lastRequestTime: number
}

const rateLimiterState: Record<string, RateLimiterState> = {}

// Constants
const MIN_REQUEST_INTERVAL = 100 // ms between requests
const MAX_CONSECUTIVE_ERRORS = 3
const BASE_BACKOFF_MS = 1000
const MAX_BACKOFF_MS = 60000

/**
 * Get or create rate limiter state for an API
 */
function getState(apiName: string): RateLimiterState {
    if (!rateLimiterState[apiName]) {
        rateLimiterState[apiName] = {
            isLimited: false,
            retryAfter: 0,
            consecutiveErrors: 0,
            lastRequestTime: 0,
        }
    }
    return rateLimiterState[apiName]
}

/**
 * Calculate backoff delay using exponential backoff
 */
function calculateBackoff(errors: number): number {
    const delay = BASE_BACKOFF_MS * Math.pow(2, errors - 1)
    return Math.min(delay, MAX_BACKOFF_MS)
}

/**
 * Check if we should skip the API and use cache instead
 */
export function shouldUseCache(apiName: string): boolean {
    const state = getState(apiName)

    if (state.isLimited && Date.now() < state.retryAfter) {
        return true
    }

    // Reset if retry period has passed
    if (state.isLimited && Date.now() >= state.retryAfter) {
        state.isLimited = false
        state.consecutiveErrors = 0
    }

    return false
}

/**
 * Record a successful API call
 */
export function recordSuccess(apiName: string): void {
    const state = getState(apiName)
    state.consecutiveErrors = 0
    state.isLimited = false
    state.lastRequestTime = Date.now()
}

/**
 * Record an API error and apply backoff if needed
 */
export function recordError(apiName: string, status?: number): void {
    const state = getState(apiName)
    state.consecutiveErrors++
    state.lastRequestTime = Date.now()

    // Handle 429 specifically
    if (status === 429) {
        state.isLimited = true
        state.retryAfter = Date.now() + 60000 // Wait 1 minute
        console.warn(`[API] ${apiName}: Rate limited (429). Backing off for 60s.`)
        return
    }

    // Apply exponential backoff after consecutive errors
    if (state.consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        const backoff = calculateBackoff(state.consecutiveErrors)
        state.isLimited = true
        state.retryAfter = Date.now() + backoff
        console.warn(`[API] ${apiName}: ${state.consecutiveErrors} errors. Backing off for ${backoff}ms.`)
    }
}

/**
 * Wait for rate limiting if needed
 */
export async function waitForRateLimit(apiName: string): Promise<void> {
    const state = getState(apiName)
    const now = Date.now()

    // Ensure minimum interval between requests
    const timeSinceLastRequest = now - state.lastRequestTime
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
        await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest))
    }
}

/**
 * Wrapper for API calls with rate limiting and error handling
 */
export async function rateLimitedFetch<T>(
    apiName: string,
    fetchFn: () => Promise<T>,
    getCached: () => T | null
): Promise<T> {
    // Check if we should use cache
    if (shouldUseCache(apiName)) {
        const cached = getCached()
        if (cached !== null) {
            return cached
        }
    }

    // Wait for rate limit
    await waitForRateLimit(apiName)

    try {
        const result = await fetchFn()
        recordSuccess(apiName)
        return result
    } catch (error) {
        const status = error instanceof Response ? error.status : undefined
        recordError(apiName, status)

        // Try to return cached data on error
        const cached = getCached()
        if (cached !== null) {
            console.warn(`[API] ${apiName}: Using cached data after error.`)
            return cached
        }

        throw error
    }
}

/**
 * Enhanced localStorage cache with versioning
 */
const CACHE_VERSION = 1

interface CacheEntry<T> {
    version: number
    data: T
    timestamp: number
    ttl: number
}

export function getCachedData<T>(key: string): T | null {
    if (typeof window === 'undefined') return null

    try {
        const raw = localStorage.getItem(key)
        if (!raw) return null

        const entry: CacheEntry<T> = JSON.parse(raw)

        // Check version
        if (entry.version !== CACHE_VERSION) {
            localStorage.removeItem(key)
            return null
        }

        // Check expiration
        if (Date.now() - entry.timestamp > entry.ttl) {
            localStorage.removeItem(key)
            return null
        }

        return entry.data
    } catch {
        return null
    }
}

export function setCachedData<T>(key: string, data: T, ttlMs: number = 86400000): void {
    if (typeof window === 'undefined') return

    try {
        const entry: CacheEntry<T> = {
            version: CACHE_VERSION,
            data,
            timestamp: Date.now(),
            ttl: ttlMs,
        }
        localStorage.setItem(key, JSON.stringify(entry))
    } catch {
        // Storage full - try to clear old entries
        cleanupCache()
    }
}

/**
 * Clean up old cache entries when storage is full
 */
function cleanupCache(): void {
    if (typeof window === 'undefined') return

    const keysToRemove: string[] = []

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (!key) continue

        try {
            const raw = localStorage.getItem(key)
            if (!raw) continue

            const entry = JSON.parse(raw)
            if (entry.timestamp && entry.ttl) {
                if (Date.now() - entry.timestamp > entry.ttl) {
                    keysToRemove.push(key)
                }
            }
        } catch {
            // Invalid entry
        }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key))
}

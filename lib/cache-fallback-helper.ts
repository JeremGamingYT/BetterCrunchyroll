/**
 * Cache Fallback Helper
 * Handles API requests with intelligent fallback to IndexedDB/localStorage when rate limited
 * Prevents data loss and improves resilience when external APIs are unavailable
 */

import { cacheStore } from "@/lib/cache-store"

export interface CacheFallbackOptions {
  ttlMinutes?: number // Default: 1440 (24 hours)
  timeout?: number // Default: 3000ms for fetch
  forceRefresh?: boolean // Skip cache and force fetch
}

/**
 * Detects if a response indicates rate limiting
 * Checks for HTTP 429 (Too Many Requests) status
 */
export function detectRateLimit(response: Response): boolean {
  return response.status === 429
}

/**
 * Detects if a response indicates a temporary error (5xx or timeout)
 * Allows fallback to cache for temporary failures
 */
export function detectTemporaryError(response: Response): boolean {
  // 5xx server errors, 408 timeout, 503 service unavailable
  return response.status >= 500 || response.status === 408 || response.status === 503
}

/**
 * Main function: Fetch with intelligent fallback to cache
 * 
 * Strategy:
 * 1. Check if force refresh is disabled and cache exists → return cached data
 * 2. Try to fetch from URL with timeout
 * 3. Parse response as JSON
 * 4. If successful, save to cache and return
 * 5. If 429 (rate limited) or 5xx error:
 *    - Check IndexedDB cache
 *    - If found, return cached data
 *    - If not found, return null
 * 6. Other errors: throw
 */
export async function fetchWithFallback<T = unknown>(
  url: string,
  cacheKey: string,
  options: CacheFallbackOptions = {},
): Promise<T | null> {
  const { ttlMinutes = 1440, timeout = 3000, forceRefresh = false } = options

  try {
    // Step 1: Try cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = await cacheStore.get<T>(cacheKey)
      if (cached) {
        console.log(`[CacheFallback] Cache hit for key: ${cacheKey}`)
        return cached
      }
    }

    // Step 2: Fetch from URL with timeout
    console.log(`[CacheFallback] Fetching ${cacheKey} from ${url}...`)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const response = await fetch(url, {
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    // Step 3: Check if response indicates rate limiting or errors
    if (detectRateLimit(response)) {
      console.warn(`[CacheFallback] Rate limited (429) for ${cacheKey}. Falling back to cache...`)
      const cached = await cacheStore.get<T>(cacheKey)
      if (cached) {
        return cached
      }
      console.error(`[CacheFallback] No cache available for rate-limited request: ${cacheKey}`)
      return null
    }

    if (detectTemporaryError(response)) {
      console.warn(`[CacheFallback] Server error (${response.status}) for ${cacheKey}. Falling back to cache...`)
      const cached = await cacheStore.get<T>(cacheKey)
      if (cached) {
        return cached
      }
      return null
    }

    // Step 4: Handle other errors
    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status} ${response.statusText}`)
    }

    // Step 5: Parse JSON and save to cache
    const data = (await response.json()) as T
    await cacheStore.set(cacheKey, data, ttlMinutes)
    console.log(`[CacheFallback] Cache saved for key: ${cacheKey} (TTL: ${ttlMinutes}m)`)
    return data
  } catch (error) {
    // Handle AbortError (timeout)
    if (error instanceof Error && error.name === "AbortError") {
      console.warn(`[CacheFallback] Request timeout for ${cacheKey}. Falling back to cache...`)
      const cached = await cacheStore.get<T>(cacheKey)
      if (cached) {
        return cached
      }
      console.error(`[CacheFallback] No cache available for timeout: ${cacheKey}`)
      return null
    }

    // Network errors
    if (error instanceof TypeError && error.message.includes("fetch")) {
      console.warn(`[CacheFallback] Network error for ${cacheKey}. Falling back to cache...`)
      const cached = await cacheStore.get<T>(cacheKey)
      if (cached) {
        return cached
      }
      return null
    }

    // Re-throw other errors
    console.error(`[CacheFallback] Unexpected error for ${cacheKey}:`, error)
    throw error
  }
}

/**
 * Batch fetch multiple URLs with fallback
 * Useful for enrichment operations
 */
export async function batchFetchWithFallback<T = unknown>(
  requests: Array<{ url: string; cacheKey: string }>,
  options: CacheFallbackOptions = {},
): Promise<(T | null)[]> {
  return Promise.all(
    requests.map(({ url, cacheKey }) => fetchWithFallback<T>(url, cacheKey, options)),
  )
}

/**
 * Clear all cache entries matching a pattern
 */
export async function clearCachePattern(pattern: string): Promise<void> {
  // This would require iterating through IndexedDB
  // For now, provide a simple implementation
  try {
    if (typeof window !== "undefined") {
      const keys = Object.keys(localStorage)
      for (const key of keys) {
        if (key.includes(pattern)) {
          localStorage.removeItem(key)
        }
      }
    }
  } catch (error) {
    console.warn("[CacheFallback] Error clearing cache pattern:", error)
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  hasData: boolean
  expiresIn?: number
}> {
  // Implementation would check both IndexedDB and localStorage
  return {
    hasData: false,
  }
}

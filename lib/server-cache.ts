import { createHash } from "crypto"

type MemoryEntry = {
  expiresAt: number
  value: unknown
}

const memoryCache = new Map<string, MemoryEntry>()

function getRedisConfig() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
  return url && token ? { url, token } : null
}

export function serverCacheKey(namespace: string, value: unknown) {
  const hash = createHash("sha256").update(JSON.stringify(value)).digest("hex")
  return `bcr:${namespace}:${hash}`
}

export async function getServerCache<T>(key: string): Promise<T | null> {
  const redis = getRedisConfig()

  if (redis) {
    try {
      const response = await fetch(redis.url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${redis.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(["GET", key]),
        cache: "no-store",
      })

      if (!response.ok) return null
      const payload = await response.json() as { result?: string | null }
      return payload.result ? JSON.parse(payload.result) as T : null
    } catch {
      return null
    }
  }

  const entry = memoryCache.get(key)
  if (!entry || entry.expiresAt < Date.now()) {
    memoryCache.delete(key)
    return null
  }

  return entry.value as T
}

export async function setServerCache(key: string, value: unknown, ttlSeconds: number) {
  const redis = getRedisConfig()

  if (redis) {
    try {
      await fetch(redis.url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${redis.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(["SET", key, JSON.stringify(value), "EX", ttlSeconds]),
        cache: "no-store",
      })
      return
    } catch {
      // Fall through to per-instance memory cache.
    }
  }

  memoryCache.set(key, {
    expiresAt: Date.now() + ttlSeconds * 1000,
    value,
  })
}


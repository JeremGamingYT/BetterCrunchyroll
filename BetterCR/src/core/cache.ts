/**
 * Tiny TTL cache backed by localStorage, used to avoid hammering external APIs
 * (AniList, …). Crunchyroll's own API is never cached here — it is the live
 * source of truth and is fine to query directly.
 */
const PREFIX = 'bcr_cache_';

interface Entry<T> {
  readonly v: T;
  readonly e: number;
}

export const DAY_MS = 86_400_000;
export const HOUR_MS = 3_600_000;

function read<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw) {
      const entry = JSON.parse(raw) as Entry<T>;
      if (entry.e > Date.now()) {
        return entry.v;
      }
      localStorage.removeItem(PREFIX + key);
    }
  } catch {
    // Ignore — treated as a miss.
  }
  return undefined;
}

function write<T>(key: string, value: T, ttlMs: number): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ v: value, e: Date.now() + ttlMs }));
  } catch {
    // Storage full / unavailable — caching is best-effort.
  }
}

/**
 * Returns the cached value for `key` if still fresh, otherwise runs `factory`,
 * caches its result for `ttlMs` (unless `shouldCache` rejects it), and returns
 * it. Thrown failures are never cached.
 */
export async function cached<T>(
  key: string,
  ttlMs: number,
  factory: () => Promise<T>,
  shouldCache: (value: T) => boolean = () => true,
): Promise<T> {
  const hit = read<T>(key);
  if (hit !== undefined) {
    return hit;
  }
  const value = await factory();
  if (shouldCache(value)) {
    write(key, value, ttlMs);
  }
  return value;
}

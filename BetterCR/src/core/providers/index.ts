/**
 * Enrichment provider registry with automatic failover. Providers are tried in
 * priority order (AniList → MyAnimeList → Kitsu); the first match wins. A
 * provider that errors (rate-limit / outage) is benched for a short cooldown so
 * traffic flows to the next provider instead of hammering a degraded API — then
 * it's retried automatically once the cooldown lapses.
 *
 * All external (non-Crunchyroll) responses are cached in the browser; failures
 * are never cached, so a transient outage can't poison enrichment for days.
 */
import type { ExternalMeta, MetaProvider } from './external-meta';
import {
  fetchAniListMeta,
  fetchAniListTrending as rawTrending,
  fetchUpcomingAnime as rawUpcoming,
  type TrendingItem,
  type UpcomingItem,
} from './anilist';
import { fetchMalMeta, fetchMalTrending, fetchMalUpcoming } from './mal';
import { fetchKitsuMeta } from './kitsu';
import { cached, DAY_MS, HOUR_MS } from '@core/cache';

export type { ExternalMeta } from './external-meta';
export type { TrendingItem, UpcomingItem } from './anilist';

interface ProviderEntry {
  readonly name: string;
  readonly fetch: MetaProvider;
}

const PROVIDERS: readonly ProviderEntry[] = [
  { name: 'AniList', fetch: fetchAniListMeta },
  { name: 'MyAnimeList', fetch: fetchMalMeta },
  { name: 'Kitsu', fetch: fetchKitsuMeta },
];

const META_TTL = 7 * DAY_MS;
const TRENDING_TTL = 6 * HOUR_MS;
const PROVIDER_COOLDOWN_MS = 90_000;

const benchedUntil = new Map<string, number>();
const isBenched = (name: string): boolean => (benchedUntil.get(name) ?? 0) > Date.now();

export async function fetchExternalMeta(
  title: string,
  year?: number,
): Promise<ExternalMeta | null> {
  if (!title) {
    return null;
  }
  const key = `meta:${title.toLowerCase()}:${String(year ?? '')}`;
  return cached(
    key,
    META_TTL,
    async () => {
      for (const provider of PROVIDERS) {
        if (isBenched(provider.name)) {
          continue;
        }
        try {
          const meta = await provider.fetch(title, year);
          if (meta) {
            return meta;
          }
        } catch {
          benchedUntil.set(provider.name, Date.now() + PROVIDER_COOLDOWN_MS);
        }
      }
      return null;
    },
    (meta) => meta !== null, // never cache a miss/outage
  );
}

/** Run attempts in order; return the first non-empty result (skip on error). */
async function firstNonEmpty<T>(
  attempts: ReadonlyArray<() => Promise<readonly T[]>>,
): Promise<T[]> {
  for (const attempt of attempts) {
    try {
      const result = await attempt();
      if (result.length > 0) {
        return [...result];
      }
    } catch {
      /* try the next source */
    }
  }
  return [];
}

export async function fetchAniListTrending(count = 30): Promise<TrendingItem[]> {
  return cached(
    `trending:${String(count)}`,
    TRENDING_TTL,
    () => firstNonEmpty<TrendingItem>([() => rawTrending(count), () => fetchMalTrending(count)]),
    (items) => items.length > 0,
  );
}

export async function fetchUpcomingAnime(count = 50): Promise<UpcomingItem[]> {
  return cached(
    `upcoming:${String(count)}`,
    TRENDING_TTL,
    () => firstNonEmpty<UpcomingItem>([() => rawUpcoming(count), () => fetchMalUpcoming(count)]),
    (items) => items.length > 0,
  );
}

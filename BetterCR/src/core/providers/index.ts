/**
 * Enrichment provider registry. Providers are tried in priority order
 * (AniList first); the first non-null result wins. Add MAL/Kitsu/etc. here.
 *
 * All external (non-Crunchyroll) responses are cached in the browser to avoid
 * spamming third-party APIs.
 */
import type { ExternalMeta, MetaProvider } from './external-meta';
import {
  fetchAniListMeta,
  fetchAniListTrending as rawTrending,
  type TrendingItem,
} from './anilist';
import { cached, DAY_MS, HOUR_MS } from '@core/cache';

export type { ExternalMeta } from './external-meta';
export type { TrendingItem } from './anilist';

const PROVIDERS: readonly MetaProvider[] = [fetchAniListMeta];

const META_TTL = 7 * DAY_MS;
const TRENDING_TTL = 6 * HOUR_MS;

export async function fetchExternalMeta(
  title: string,
  year?: number,
): Promise<ExternalMeta | null> {
  if (!title) {
    return null;
  }
  const key = `meta:${title.toLowerCase()}:${String(year ?? '')}`;
  return cached(key, META_TTL, async () => {
    for (const provider of PROVIDERS) {
      const meta = await provider(title, year);
      if (meta) {
        return meta;
      }
    }
    return null;
  });
}

export async function fetchAniListTrending(count = 30): Promise<TrendingItem[]> {
  return cached(
    `trending:${String(count)}`,
    TRENDING_TTL,
    () => rawTrending(count),
    (items) => items.length > 0,
  );
}

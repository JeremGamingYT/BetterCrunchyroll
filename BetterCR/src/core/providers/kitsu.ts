/**
 * Kitsu enrichment provider (public JSON:API, CORS `*`, no auth). Second
 * fallback after MyAnimeList when AniList is unavailable.
 */
import type { MetaProvider } from './external-meta';

const KITSU = 'https://kitsu.io/api/edge';

interface KitsuImage {
  readonly original?: string | null;
  readonly large?: string | null;
}
interface KitsuResource {
  readonly type?: string;
  readonly id?: string;
  readonly attributes?: {
    readonly synopsis?: string | null;
    readonly averageRating?: string | null;
    readonly episodeCount?: number | null;
    readonly posterImage?: KitsuImage | null;
    readonly coverImage?: KitsuImage | null;
    readonly name?: string | null;
  } | null;
}
interface KitsuResponse {
  readonly data?: readonly KitsuResource[] | null;
  readonly included?: readonly KitsuResource[] | null;
}

export const fetchKitsuMeta: MetaProvider = async (title) => {
  const url = `${KITSU}/anime?filter[text]=${encodeURIComponent(title)}&page[limit]=1&include=genres`;
  const response = await fetch(url, { headers: { Accept: 'application/vnd.api+json' } });
  if (response.status === 429 || response.status >= 500) {
    throw new Error(`kitsu_${String(response.status)}`);
  }
  if (!response.ok) {
    throw new Error('kitsu_error');
  }
  const json = (await response.json()) as KitsuResponse;
  const anime = json.data?.[0];
  const attrs = anime?.attributes;
  if (!attrs) {
    return null;
  }
  const genres = (json.included ?? [])
    .filter((resource) => resource.type === 'genres')
    .map((resource) => resource.attributes?.name)
    .filter((name): name is string => Boolean(name));
  const rating = attrs.averageRating ? Number(attrs.averageRating) : NaN;
  return {
    source: 'Kitsu',
    coverImage: attrs.posterImage?.original ?? attrs.posterImage?.large ?? undefined,
    bannerImage: attrs.coverImage?.original ?? attrs.coverImage?.large ?? undefined,
    description: attrs.synopsis ?? undefined,
    score: Number.isFinite(rating) ? Math.round(rating) : undefined,
    genres: genres.length > 0 ? genres : undefined,
    episodes: attrs.episodeCount ?? undefined,
  };
};

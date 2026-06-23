/**
 * MyAnimeList enrichment provider via the public Jikan API (REST, CORS `*`,
 * no auth). Used as a fallback when AniList is unavailable or rate-limited.
 *
 * Jikan is itself rate-limited (≈3 req/s); it's only hit when AniList is down,
 * and every result is cached, so this stays well within limits.
 */
import type { MetaProvider } from './external-meta';
import type { TrendingItem, UpcomingItem } from './anilist';

const JIKAN = 'https://api.jikan.moe/v4';

interface JikanAnime {
  readonly mal_id?: number;
  readonly title?: string | null;
  readonly title_english?: string | null;
  readonly synopsis?: string | null;
  readonly score?: number | null;
  readonly episodes?: number | null;
  readonly type?: string | null;
  readonly url?: string | null;
  readonly images?: {
    readonly jpg?: {
      readonly image_url?: string | null;
      readonly large_image_url?: string | null;
    } | null;
    readonly webp?: { readonly large_image_url?: string | null } | null;
  } | null;
  readonly genres?: ReadonlyArray<{ readonly name?: string | null }> | null;
  readonly studios?: ReadonlyArray<{ readonly name?: string | null }> | null;
  readonly aired?: {
    readonly prop?: {
      readonly from?: {
        readonly day?: number | null;
        readonly month?: number | null;
        readonly year?: number | null;
      } | null;
    } | null;
  } | null;
}

const names = (
  list: ReadonlyArray<{ readonly name?: string | null }> | null | undefined,
): string[] =>
  (list ?? []).map((item) => item.name).filter((name): name is string => Boolean(name));

const poster = (anime: JikanAnime): string =>
  anime.images?.webp?.large_image_url ??
  anime.images?.jpg?.large_image_url ??
  anime.images?.jpg?.image_url ??
  '';

const pickTitle = (anime: JikanAnime): string => anime.title_english || anime.title || '';

/** Throws on rate-limit / server errors so the caller can fail over cleanly. */
async function jikan<T>(path: string): Promise<T> {
  const response = await fetch(`${JIKAN}${path}`, { headers: { Accept: 'application/json' } });
  if (response.status === 429 || response.status >= 500) {
    throw new Error(`jikan_${String(response.status)}`);
  }
  if (!response.ok) {
    throw new Error('jikan_error');
  }
  return (await response.json()) as T;
}

export const fetchMalMeta: MetaProvider = async (title) => {
  const json = await jikan<{ data?: readonly JikanAnime[] }>(
    `/anime?q=${encodeURIComponent(title)}&limit=1&sfw`,
  );
  const anime = json.data?.[0];
  if (!anime) {
    return null;
  }
  const studios = names(anime.studios);
  const genres = names(anime.genres);
  return {
    source: 'MyAnimeList',
    coverImage: poster(anime) || undefined,
    description: anime.synopsis ?? undefined,
    score: typeof anime.score === 'number' ? Math.round(anime.score * 10) : undefined,
    genres: genres.length > 0 ? genres : undefined,
    studios: studios.length > 0 ? studios : undefined,
    episodes: anime.episodes ?? undefined,
  };
};

export async function fetchMalTrending(count = 30): Promise<TrendingItem[]> {
  const json = await jikan<{ data?: readonly JikanAnime[] }>(
    `/top/anime?filter=airing&limit=${String(Math.min(count, 25))}`,
  );
  return (json.data ?? [])
    .map((anime) => ({ image: poster(anime), title: pickTitle(anime) }))
    .filter((item) => item.image.length > 0 && item.title.length > 0);
}

export async function fetchMalUpcoming(count = 30): Promise<UpcomingItem[]> {
  const json = await jikan<{ data?: readonly JikanAnime[] }>(
    `/seasons/upcoming?limit=${String(Math.min(count, 25))}`,
  );
  return (json.data ?? [])
    .map((anime) => {
      const from = anime.aired?.prop?.from;
      return {
        id: anime.mal_id ?? 0,
        title: pickTitle(anime),
        image: poster(anime),
        format: anime.type ?? undefined,
        episodes: anime.episodes ?? undefined,
        genres: names(anime.genres),
        description: anime.synopsis ?? undefined,
        year: from?.year ?? undefined,
        month: from?.month ?? undefined,
        day: from?.day ?? undefined,
        siteUrl: anime.url ?? undefined,
      };
    })
    .filter((item) => item.title.length > 0 && item.image.length > 0);
}

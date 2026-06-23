/**
 * AniList enrichment provider (public GraphQL API).
 *
 * AniList responds with `Access-Control-Allow-Origin: *`, so the SPA calls it
 * directly (no content-script proxy and no auth needed).
 */
import type { ExternalMeta, MetaProvider } from './external-meta';

const ANILIST_URL = 'https://graphql.anilist.co';

const QUERY = `query ($search: String, $year: Int) {
  Media(search: $search, type: ANIME, seasonYear: $year, sort: SEARCH_MATCH) {
    description(asHtml: false)
    coverImage { extraLarge large color }
    bannerImage
    averageScore
    genres
    episodes
    studios(isMain: true) { nodes { name } }
  }
}`;

const FALLBACK_QUERY = QUERY.replace(', $year: Int', '').replace(', seasonYear: $year', '');

interface AniListMedia {
  readonly description?: string | null;
  readonly coverImage?: {
    readonly extraLarge?: string | null;
    readonly large?: string | null;
    readonly color?: string | null;
  } | null;
  readonly bannerImage?: string | null;
  readonly averageScore?: number | null;
  readonly genres?: readonly string[] | null;
  readonly episodes?: number | null;
  readonly studios?: {
    readonly nodes?: ReadonlyArray<{ readonly name?: string | null }> | null;
  } | null;
}

function stripHtml(input: string): string {
  return input
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .trim();
}

async function request(
  query: string,
  variables: Record<string, unknown>,
): Promise<AniListMedia | null> {
  const response = await fetch(ANILIST_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  // Signal unavailability (rate-limit / server error) so the provider registry
  // can fail over to MAL/Kitsu instead of treating it as "no match".
  if (response.status === 429 || response.status >= 500) {
    throw new Error(`anilist_${String(response.status)}`);
  }
  if (!response.ok) {
    return null;
  }
  const json = (await response.json()) as { data?: { Media?: AniListMedia | null } | null };
  return json.data?.Media ?? null;
}

function toMeta(media: AniListMedia): ExternalMeta {
  const studios = (media.studios?.nodes ?? [])
    .map((node) => node?.name)
    .filter((name): name is string => Boolean(name));

  return {
    source: 'AniList',
    coverImage: media.coverImage?.extraLarge ?? media.coverImage?.large ?? undefined,
    bannerImage: media.bannerImage ?? undefined,
    description: media.description ? stripHtml(media.description) : undefined,
    score: media.averageScore ?? undefined,
    genres: media.genres ?? undefined,
    studios: studios.length > 0 ? studios : undefined,
    episodes: media.episodes ?? undefined,
    color: media.coverImage?.color ?? undefined,
  };
}

export const fetchAniListMeta: MetaProvider = async (title, year) => {
  // Prefer a year-scoped match for accuracy, then fall back to title-only.
  // Transport errors (rate-limit/5xx) propagate so the registry fails over.
  const media =
    (year ? await request(QUERY, { search: title, year }) : null) ??
    (await request(FALLBACK_QUERY, { search: title }));
  return media ? toMeta(media) : null;
};

const TRENDING_QUERY = `query ($n: Int) {
  Page(perPage: $n) {
    media(sort: TRENDING_DESC, type: ANIME) {
      title { english romaji }
      coverImage { extraLarge large }
    }
  }
}`;

interface TrendingResponse {
  readonly data?: {
    readonly Page?: {
      readonly media?: ReadonlyArray<{
        readonly title?: {
          readonly english?: string | null;
          readonly romaji?: string | null;
        } | null;
        readonly coverImage?: {
          readonly extraLarge?: string | null;
          readonly large?: string | null;
        } | null;
      }> | null;
    } | null;
  } | null;
}

export interface TrendingItem {
  readonly image: string;
  readonly title: string;
}

const UPCOMING_QUERY = `query ($n: Int) {
  Page(perPage: $n) {
    media(type: ANIME, status: NOT_YET_RELEASED, sort: POPULARITY_DESC) {
      id
      title { english romaji }
      coverImage { extraLarge large color }
      bannerImage
      format
      episodes
      genres
      description(asHtml: false)
      startDate { year month day }
      siteUrl
    }
  }
}`;

export interface UpcomingItem {
  readonly id: number;
  readonly title: string;
  readonly image: string;
  readonly color?: string;
  readonly format?: string;
  readonly episodes?: number;
  readonly genres: readonly string[];
  readonly description?: string;
  readonly year?: number;
  readonly month?: number;
  readonly day?: number;
  readonly siteUrl?: string;
}

interface UpcomingMedia {
  readonly id: number;
  readonly title?: { readonly english?: string | null; readonly romaji?: string | null } | null;
  readonly coverImage?: {
    readonly extraLarge?: string | null;
    readonly large?: string | null;
    readonly color?: string | null;
  } | null;
  readonly format?: string | null;
  readonly episodes?: number | null;
  readonly genres?: readonly string[] | null;
  readonly description?: string | null;
  readonly startDate?: {
    readonly year?: number | null;
    readonly month?: number | null;
    readonly day?: number | null;
  } | null;
  readonly siteUrl?: string | null;
}

/** Announced (not-yet-released) anime, most popular first, with start dates. */
export async function fetchUpcomingAnime(count = 50): Promise<UpcomingItem[]> {
  try {
    const response = await fetch(ANILIST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query: UPCOMING_QUERY, variables: { n: count } }),
    });
    if (!response.ok) {
      return [];
    }
    const json = (await response.json()) as {
      data?: { Page?: { media?: readonly UpcomingMedia[] | null } | null } | null;
    };
    return (json.data?.Page?.media ?? [])
      .map((media) => ({
        id: media.id,
        title: media.title?.english ?? media.title?.romaji ?? '',
        image: media.coverImage?.extraLarge ?? media.coverImage?.large ?? '',
        color: media.coverImage?.color ?? undefined,
        format: media.format ?? undefined,
        episodes: media.episodes ?? undefined,
        genres: media.genres ?? [],
        description: media.description ? stripHtml(media.description) : undefined,
        year: media.startDate?.year ?? undefined,
        month: media.startDate?.month ?? undefined,
        day: media.startDate?.day ?? undefined,
        siteUrl: media.siteUrl ?? undefined,
      }))
      .filter((item) => item.title.length > 0 && item.image.length > 0);
  } catch {
    return [];
  }
}

/**
 * Trending anime (no auth) — used for the login poster wall, which renders
 * before the user's Crunchyroll token is available.
 */
export async function fetchAniListTrending(count = 30): Promise<TrendingItem[]> {
  try {
    const response = await fetch(ANILIST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query: TRENDING_QUERY, variables: { n: count } }),
    });
    if (!response.ok) {
      return [];
    }
    const json = (await response.json()) as TrendingResponse;
    return (json.data?.Page?.media ?? [])
      .map((item) => ({
        image: item.coverImage?.extraLarge ?? item.coverImage?.large ?? '',
        title: item.title?.english ?? item.title?.romaji ?? '',
      }))
      .filter((item): item is TrendingItem => item.image.length > 0);
  } catch {
    return [];
  }
}

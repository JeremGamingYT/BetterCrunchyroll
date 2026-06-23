/**
 * Typed Crunchyroll API client used by the SPA. Each function proxies a request
 * through the {@link bridge}, validates the response with zod (skipping any
 * malformed items rather than throwing), and returns ready-to-render models.
 */
import type { z } from 'zod';
import {
  categorySchema,
  cmsSeriesSchema,
  episodePanelSchema,
  episodeSchema,
  panelSchema,
  playheadSchema,
  profileSchema,
  seasonSchema,
  watchHistoryItemSchema,
  type WatchHistoryItemDto,
} from '@core/schemas/crunchyroll';
import { delay, retryAsync } from '@shared/async';
import { cached, DAY_MS } from '@core/cache';
import {
  categoryToGenre,
  cmsSeriesToDetail,
  episodeToModel,
  panelToSeries,
  seasonToModel,
  watchHistoryToContinue,
  watchHistoryToSeries,
} from '@core/mappers/content';
import type {
  ContinueItem,
  Episode,
  Genre,
  HomeFeed,
  HomeRow,
  Season,
  Series,
  SeriesDetail,
} from '@core/models/content';
import type { ApiRequestPayload, QueryValue } from '@shared/messages';
import { bridge } from './transport';
import { ApiError } from './errors';

const DEFAULT_PAGE_SIZE = 24;
const HERO_COUNT = 5;

/** Current Crunchyroll locale, updated by the i18n layer on language change. */
let apiLocale = 'fr-FR';

export function setApiLocale(locale: string): void {
  apiLocale = locale;
}

async function getJson(
  path: string,
  query?: Readonly<Record<string, QueryValue>>,
): Promise<unknown> {
  const payload: ApiRequestPayload = {
    method: 'GET',
    path,
    query: { locale: apiLocale, ...(query ?? {}) },
  };
  const result = await bridge.apiRequest(payload);
  if (!result.ok) {
    throw new ApiError(result.error);
  }
  return result.value;
}

/** Extracts the list from a `{ data }` / `{ items }` envelope (or a bare array). */
function extractData(raw: unknown): unknown[] {
  if (Array.isArray(raw)) {
    return raw;
  }
  if (raw && typeof raw === 'object') {
    const obj = raw as { data?: unknown; items?: unknown };
    if (Array.isArray(obj.data)) {
      return obj.data;
    }
    if (Array.isArray(obj.items)) {
      return obj.items;
    }
  }
  return [];
}

/** Validates each item with `schema`, dropping the ones that don't match. */
function parseEach<S extends z.ZodTypeAny>(schema: S, raw: unknown): z.infer<S>[] {
  const out: z.infer<S>[] = [];
  for (const item of extractData(raw)) {
    const parsed = schema.safeParse(item);
    if (parsed.success) {
      out.push(parsed.data);
    }
  }
  return out;
}

export interface BrowseOptions {
  readonly n?: number;
  readonly start?: number;
  readonly sort?: 'popularity' | 'newly_added' | 'alphabetical';
  readonly type?: 'series' | 'movie_listing';
  readonly query?: string;
  readonly isDubbed?: boolean;
  readonly isSubbed?: boolean;
  /** Genre/category slug(s), e.g. `romance`. */
  readonly categories?: string;
}

export async function browseSeries(options: BrowseOptions = {}): Promise<Series[]> {
  const query: Record<string, QueryValue> = {
    n: options.n ?? DEFAULT_PAGE_SIZE,
    type: options.type ?? 'series',
  };
  if (options.start !== undefined) query.start = options.start;
  if (options.sort !== undefined) query.sort_by = options.sort;
  if (options.query !== undefined) query.q = options.query;
  if (options.isDubbed !== undefined) query.is_dubbed = options.isDubbed;
  if (options.isSubbed !== undefined) query.is_subbed = options.isSubbed;
  if (options.categories !== undefined) query.categories = options.categories;

  const raw = await getJson('/content/v2/discover/browse', query);
  return parseEach(panelSchema, raw).map(panelToSeries);
}

/** Discover genres/categories with real artwork (cached briefly). */
export async function getCategories(): Promise<Genre[]> {
  try {
    const raw = await getJson('/content/v2/discover/categories');
    const genres: Genre[] = [];
    for (const item of parseEach(categorySchema, raw)) {
      const genre = categoryToGenre(item);
      if (genre) {
        genres.push(genre);
      }
    }
    return genres;
  } catch {
    return [];
  }
}

/**
 * A representative poster for a genre: the most popular title actually tagged
 * with that category slug. This guarantees the artwork matches the genre
 * (Crunchyroll's own category background art is editorial and often unrelated).
 * Cached for a day; empty results are not cached.
 */
export async function getCategoryPoster(slug: string): Promise<string> {
  return cached(
    `genrePoster_${slug}`,
    DAY_MS,
    async () => {
      try {
        const series = await browseSeries({ categories: slug, sort: 'popularity', n: 1 });
        return series[0]?.poster || series[0]?.wide || '';
      } catch {
        return '';
      }
    },
    (url) => url.length > 0,
  );
}

export async function getSeriesDetail(seriesId: string): Promise<SeriesDetail> {
  const raw = await getJson(`/content/v2/cms/series/${seriesId}/`);
  const [dto] = parseEach(cmsSeriesSchema, raw);
  if (!dto) {
    throw new ApiError(`Série introuvable : ${seriesId}`);
  }
  return cmsSeriesToDetail(dto);
}

export async function getSeasons(seriesId: string): Promise<Season[]> {
  const raw = await getJson(`/content/v2/cms/series/${seriesId}/seasons`);
  return parseEach(seasonSchema, raw)
    .map(seasonToModel)
    .sort((a, b) => a.num - b.num);
}

export async function getSeasonEpisodes(seasonId: string): Promise<Episode[]> {
  const raw = await getJson(`/content/v2/cms/seasons/${seasonId}/episodes`);
  return parseEach(episodeSchema, raw)
    .map(episodeToModel)
    .sort((a, b) => a.num - b.num);
}

/**
 * Composes the home page from several browse queries. Using `browse` (whose
 * response shape is stable) keeps the home page robust regardless of the
 * under-documented `home_feed` endpoint, which can be layered in later.
 */
async function loadHomeFeed(): Promise<HomeFeed> {
  const [popular, recent, dubbed] = await Promise.all([
    browseSeries({ sort: 'popularity', n: 24 }).catch(() => []),
    browseSeries({ sort: 'newly_added', n: 24 }).catch(() => []),
    browseSeries({ sort: 'popularity', n: 24, isDubbed: true }).catch(() => []),
  ]);

  const rows: HomeRow[] = [];
  if (popular.length > 0) {
    rows.push({
      id: 'popular',
      titleKey: 'row.popular',
      subKey: 'row.popular.sub',
      items: popular,
    });
  }
  if (recent.length > 0) {
    rows.push({ id: 'recent', titleKey: 'row.recent', subKey: 'row.recent.sub', items: recent });
  }
  if (dubbed.length > 0) rows.push({ id: 'dubbed', titleKey: 'row.vf', items: dubbed });

  return { hero: popular.slice(0, HERO_COUNT), rows };
}

export async function getHomeFeed(): Promise<HomeFeed> {
  // Retry while empty — usually a transient token/race on first paint.
  return retryAsync(loadHomeFeed, 3, 800, (feed) => feed.rows.length === 0);
}

// ───────────────────────── Account-scoped helpers ─────────────────────────

const ACCOUNT_RETRIES = 20;
const ACCOUNT_RETRY_MS = 150;
let accountIdCache: string | null = null;

/** Resolves the logged-in account id, waiting briefly for the token if needed. */
async function getAccountId(): Promise<string | null> {
  if (accountIdCache) {
    return accountIdCache;
  }
  for (let attempt = 0; attempt < ACCOUNT_RETRIES; attempt += 1) {
    const status = await bridge.checkToken();
    if (status.accountId) {
      accountIdCache = status.accountId;
      return accountIdCache;
    }
    if (!status.hasToken && attempt > 3) {
      break;
    }
    await delay(ACCOUNT_RETRY_MS);
  }
  return null;
}

/** Fetches full objects (series/movies) by id, preserving the requested order. */
export async function getObjects(ids: readonly string[]): Promise<Series[]> {
  const account = await getAccountId();
  if (!account || ids.length === 0) {
    return [];
  }
  try {
    const raw = await getJson(`/content/v2/cms/${account}/objects/${ids.join(',')}`);
    const byId = new Map(
      parseEach(panelSchema, raw).map((panel) => [panel.id, panelToSeries(panel)]),
    );
    return ids.map((id) => byId.get(id)).filter((series): series is Series => series !== undefined);
  } catch {
    return [];
  }
}

/**
 * Simulcast catalog ordered by the most recently added/updated episode.
 *
 * Browsing `type=episode` sorted by `newly_added` gives episodes in recency
 * order; we dedupe by series (keeping the most recent) and resolve their full
 * series objects (for posters), preserving that order — so the grid is exactly
 * sorted by latest episode. Falls back to newly-added series if unavailable.
 */
export async function getSimulcast(limit = 30): Promise<Series[]> {
  const raw = await getJson('/content/v2/discover/browse', {
    type: 'episode',
    sort_by: 'newly_added',
    n: 100,
  });

  const orderedSeriesIds: string[] = [];
  const seen = new Set<string>();
  for (const episode of parseEach(episodePanelSchema, raw)) {
    const seriesId = episode.episode_metadata?.series_id;
    if (seriesId && !seen.has(seriesId)) {
      seen.add(seriesId);
      orderedSeriesIds.push(seriesId);
      if (orderedSeriesIds.length >= limit) {
        break;
      }
    }
  }

  if (orderedSeriesIds.length === 0) {
    return browseSeries({ sort: 'newly_added', n: limit });
  }
  const series = await getObjects(orderedSeriesIds);
  return series.length > 0 ? series : browseSeries({ sort: 'newly_added', n: limit });
}

export interface PlayheadInfo {
  readonly playhead: number;
  readonly fullyWatched: boolean;
}

/** Returns watch-progress per content id (empty if unauthenticated). */
export async function getPlayheads(
  contentIds: readonly string[],
): Promise<Map<string, PlayheadInfo>> {
  const result = new Map<string, PlayheadInfo>();
  const account = await getAccountId();
  if (!account || contentIds.length === 0) {
    return result;
  }
  try {
    const raw = await getJson(`/content/v2/${account}/playheads`, {
      content_ids: contentIds.join(','),
    });
    for (const item of parseEach(playheadSchema, raw)) {
      result.set(item.content_id, {
        playhead: item.playhead ?? 0,
        fullyWatched: item.fully_watched ?? false,
      });
    }
  } catch {
    // Watch state is best-effort; return whatever we have.
  }
  return result;
}

/** Extracts the underlying series panel from a watchlist item (which may wrap it). */
function unwrapPanel(item: unknown): unknown {
  if (item && typeof item === 'object' && 'panel' in item) {
    return (item as { panel: unknown }).panel;
  }
  return item;
}

function hasImage(series: Series): boolean {
  return Boolean(series.poster || series.wide);
}

/** Fills in poster/wide art for any series missing it, via `getObjects`. */
async function backfillImages(series: Series[]): Promise<Series[]> {
  const missing = series.filter((item) => !hasImage(item)).map((item) => item.id);
  if (missing.length === 0) {
    return series;
  }
  const byId = new Map((await getObjects(missing)).map((item) => [item.id, item]));
  return series.map((item) => {
    const upgraded = byId.get(item.id);
    return !hasImage(item) && upgraded ? upgraded : item;
  });
}

/**
 * The user's Crunchyroll watchlist (their saved/"favorited" anime), newest
 * first. Maps the watchlist panels directly (they carry artwork) and backfills
 * any image-light entries.
 */
export async function getWatchlist(limit = 40): Promise<Series[]> {
  const account = await getAccountId();
  if (!account) {
    return [];
  }
  try {
    const raw = await getJson(`/content/v2/discover/${account}/watchlist`, {
      n: limit,
      order: 'desc',
    });
    const series: Series[] = [];
    for (const item of extractData(raw)) {
      const parsed = panelSchema.safeParse(unwrapPanel(item));
      if (parsed.success) {
        series.push(panelToSeries(parsed.data));
      }
    }
    return backfillImages(series);
  } catch {
    return [];
  }
}

/** Fetches and validates raw watch-history entries (newest first). */
async function fetchWatchHistoryItems(limit: number, page = 0): Promise<WatchHistoryItemDto[]> {
  const account = await getAccountId();
  if (!account) {
    return [];
  }
  try {
    const raw = await getJson(`/content/v2/${account}/watch-history`, {
      page_size: limit,
      page,
    });
    return parseEach(watchHistoryItemSchema, raw);
  } catch {
    return [];
  }
}

/**
 * Recently watched anime (deduped by series, most recent first). Uses the
 * episode thumbnail as a guaranteed image, upgrading to the series poster.
 */
export async function getWatchHistory(limit = 40): Promise<Series[]> {
  const items = await fetchWatchHistoryItems(limit);
  const order: string[] = [];
  const seen = new Set<string>();
  const base = new Map<string, Series>();
  for (const item of items) {
    const series = watchHistoryToSeries(item);
    if (!series.id || seen.has(series.id)) {
      continue;
    }
    seen.add(series.id);
    order.push(series.id);
    base.set(series.id, series);
  }
  if (order.length === 0) {
    return [];
  }
  const byId = new Map((await getObjects(order)).map((item) => [item.id, item]));
  return order.flatMap((id) => {
    const fallback = base.get(id);
    if (!fallback) {
      return [];
    }
    const upgraded = byId.get(id);
    return [upgraded && hasImage(upgraded) ? upgraded : fallback];
  });
}

/** In-progress episodes (continue watching), deduped by series, newest first. */
export async function getContinueWatching(limit = 24): Promise<ContinueItem[]> {
  const items = await fetchWatchHistoryItems(limit);
  const out: ContinueItem[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const cont = watchHistoryToContinue(item);
    if (cont && !seen.has(cont.seriesId)) {
      seen.add(cont.seriesId);
      out.push(cont);
    }
  }
  return out;
}

/** Watchlist membership only (ids), without resolving full objects. */
export async function getWatchlistIds(limit = 100): Promise<string[]> {
  const account = await getAccountId();
  if (!account) {
    return [];
  }
  try {
    const raw = await getJson(`/content/v2/discover/${account}/watchlist`, {
      n: limit,
      order: 'desc',
    });
    const ids: string[] = [];
    for (const item of extractData(raw)) {
      const id = (unwrapPanel(item) as { id?: unknown }).id;
      if (typeof id === 'string') {
        ids.push(id);
      }
    }
    return ids;
  } catch {
    return [];
  }
}

/** Adds a series to the Crunchyroll watchlist. Returns success. */
export async function addToWatchlist(seriesId: string): Promise<boolean> {
  const account = await getAccountId();
  if (!account) {
    return false;
  }
  const result = await bridge.apiRequest({
    method: 'POST',
    path: `/content/v2/discover/${account}/watchlist`,
    body: { content_id: seriesId },
  });
  return result.ok;
}

/** Removes a series from the Crunchyroll watchlist. Returns success. */
export async function removeFromWatchlist(seriesId: string): Promise<boolean> {
  const account = await getAccountId();
  if (!account) {
    return false;
  }
  const result = await bridge.apiRequest({
    method: 'DELETE',
    path: `/content/v2/${account}/watchlist/${seriesId}`,
  });
  return result.ok;
}

const AVATAR_BASE = 'https://static.crunchyroll.com/assets/avatar/170x170';
const MINUTES_PER_EPISODE = 24;

export interface Profile {
  readonly username: string;
  readonly avatarUrl: string;
}

/** Current account profile (display name + avatar). */
export async function getProfile(): Promise<Profile | null> {
  try {
    const raw = await getJson('/accounts/v1/me/profile');
    const parsed = profileSchema.safeParse(raw);
    if (!parsed.success) {
      return null;
    }
    const username = parsed.data.profile_name ?? parsed.data.username ?? '';
    const avatarUrl = parsed.data.avatar ? `${AVATAR_BASE}/${parsed.data.avatar}` : '';
    return { username, avatarUrl };
  } catch {
    return null;
  }
}

export interface WatchStats {
  readonly episodes: number;
  readonly hours: number;
  readonly series: number;
}

const WATCH_HISTORY_PAGE = 100;
const WATCH_HISTORY_MAX_PAGES = 10;
const EMPTY_STATS: WatchStats = { episodes: 0, hours: 0, series: 0 };

function readTotal(raw: unknown): number | null {
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    for (const key of ['total', 'total_count', 'count']) {
      const value = obj[key];
      if (typeof value === 'number') {
        return value;
      }
    }
  }
  return null;
}

/**
 * Watch statistics from the account's history: episodes watched (the endpoint's
 * total when present, otherwise a paged count), distinct series, and estimated
 * hours from episode durations.
 */
export async function getWatchStats(): Promise<WatchStats> {
  const account = await getAccountId();
  if (!account) {
    return EMPTY_STATS;
  }
  try {
    const firstRaw = await getJson(`/content/v2/${account}/watch-history`, {
      page_size: WATCH_HISTORY_PAGE,
      page: 0,
    });

    const seriesIds = new Set<string>();
    let durationMs = 0;
    let durationCount = 0;
    const collect = (items: readonly WatchHistoryItemDto[]): void => {
      for (const item of items) {
        const seriesId = item.parent_id ?? item.panel?.episode_metadata?.series_id;
        if (seriesId) {
          seriesIds.add(seriesId);
        }
        const ms = item.panel?.episode_metadata?.duration_ms;
        if (typeof ms === 'number') {
          durationMs += ms;
          durationCount += 1;
        }
      }
    };

    const firstItems = parseEach(watchHistoryItemSchema, firstRaw);
    collect(firstItems);

    const total = readTotal(firstRaw);
    let episodes = total ?? firstItems.length;

    // No total reported and the first page is full → page through to count.
    if (total === null && firstItems.length >= WATCH_HISTORY_PAGE) {
      for (let page = 1; page < WATCH_HISTORY_MAX_PAGES; page += 1) {
        const items = await fetchWatchHistoryItems(WATCH_HISTORY_PAGE, page);
        collect(items);
        episodes += items.length;
        if (items.length < WATCH_HISTORY_PAGE) {
          break;
        }
      }
    }

    const avgMinutes =
      durationCount > 0 && durationMs > 0
        ? durationMs / durationCount / 60_000
        : MINUTES_PER_EPISODE;
    return {
      episodes,
      hours: Math.round((episodes * avgMinutes) / 60),
      series: seriesIds.size,
    };
  } catch {
    return EMPTY_STATS;
  }
}

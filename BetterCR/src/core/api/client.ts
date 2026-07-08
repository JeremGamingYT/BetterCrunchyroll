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
  episodePanelToSeries,
  episodeToModel,
  panelToSeries,
  seasonToModel,
  watchHistoryToContinue,
  watchHistoryToSeries,
} from '@core/mappers/content';
import { thumbUrl } from '@core/mappers/images';
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
let apiLocale = 'en-US';

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
  /** Season tag, e.g. `fall-2024`. */
  readonly seasonalTag?: string;
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
  if (options.seasonalTag !== undefined) query.seasonal_tag = options.seasonalTag;

  const raw = await getJson('/content/v2/discover/browse', query);
  return parseEach(panelSchema, raw).map(panelToSeries);
}

/** Series similar to the given one (account-scoped recommendation). */
export async function getSimilar(seriesId: string, n = 20): Promise<Series[]> {
  const account = await getAccountId();
  if (!account || !seriesId) {
    return [];
  }
  try {
    const raw = await getJson(`/content/v2/discover/${account}/similar_to/${seriesId}`, { n });
    return parseEach(panelSchema, raw).map(panelToSeries);
  } catch {
    return [];
  }
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

export interface EpisodeInfo {
  readonly id: string;
  readonly seriesId: string;
  readonly seasonId: string;
  readonly seriesTitle: string;
  readonly seasonNumber: number;
  readonly number: number;
  readonly title: string;
  readonly description: string;
  readonly thumb: string;
  readonly durationMs: number;
}

/** Resolves a single episode (by id) to its series/season + metadata. */
export async function getEpisodeInfo(episodeId: string): Promise<EpisodeInfo | null> {
  const account = await getAccountId();
  if (!account) {
    return null;
  }
  try {
    const raw = await getJson(`/content/v2/cms/${account}/objects/${episodeId}`);
    const [panel] = parseEach(episodePanelSchema, raw);
    if (!panel) {
      return null;
    }
    const meta = panel.episode_metadata;
    return {
      id: panel.id,
      seriesId: meta?.series_id ?? panel.series_id ?? '',
      seasonId: meta?.season_id ?? '',
      seriesTitle: meta?.series_title ?? panel.series_title ?? panel.title ?? '',
      seasonNumber: meta?.season_number ?? 1,
      number: meta?.episode_number ?? 0,
      title: panel.title ?? '',
      description: panel.description ?? '',
      thumb: thumbUrl(panel.images),
      durationMs: meta?.duration_ms ?? 0,
    };
  } catch {
    return null;
  }
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

/** Short cache so reloads / in-app returns to Home paint instantly. */
const HOME_FEED_TTL_MS = 3 * 60_000;

export async function getHomeFeed(): Promise<HomeFeed> {
  // Cache only the catalogue rows, and only briefly: "Continue watching" is
  // fetched separately (and stays live), so progress is never stale here, and a
  // 3-minute TTL keeps the browse rows fresh while making reloads feel instant.
  return cached(
    `home:${apiLocale}`,
    HOME_FEED_TTL_MS,
    // Retry while empty — usually a transient token/race on first paint.
    () => retryAsync(loadHomeFeed, 3, 800, (feed) => feed.rows.length === 0),
    (feed) => feed.rows.length > 0,
  );
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

/** Max ids per `objects` request — keeps the URL well under length limits. */
const OBJECTS_CHUNK = 50;

/** Fetches full objects (series/movies) by id, preserving the requested order. */
export async function getObjects(ids: readonly string[]): Promise<Series[]> {
  const account = await getAccountId();
  if (!account || ids.length === 0) {
    return [];
  }
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += OBJECTS_CHUNK) {
    chunks.push(ids.slice(i, i + OBJECTS_CHUNK));
  }
  const pages = await Promise.all(
    chunks.map(async (chunk) => {
      try {
        const raw = await getJson(`/content/v2/cms/${account}/objects/${chunk.join(',')}`);
        return parseEach(panelSchema, raw);
      } catch {
        return [];
      }
    }),
  );
  const byId = new Map(pages.flat().map((panel) => [panel.id, panelToSeries(panel)]));
  return ids.map((id) => byId.get(id)).filter((series): series is Series => series !== undefined);
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

export interface NewEpisode {
  readonly seriesId: string;
  readonly seriesTitle: string;
  readonly episodeNumber: number;
  readonly thumb: string;
  readonly watchPath: string;
  readonly airDate: string;
}

function isToday(iso: string | undefined): boolean {
  if (!iso) {
    return false;
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return false;
  }
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

/** Episodes aired today (Crunchyroll newly-added), deduped by series. */
export async function getNewEpisodesToday(limit = 15): Promise<NewEpisode[]> {
  try {
    const raw = await getJson('/content/v2/discover/browse', {
      type: 'episode',
      sort_by: 'newly_added',
      n: 100,
    });
    const out: NewEpisode[] = [];
    const seen = new Set<string>();
    for (const episode of parseEach(episodePanelSchema, raw)) {
      const meta = episode.episode_metadata;
      if (!isToday(meta?.episode_air_date)) {
        continue;
      }
      const seriesId = meta?.series_id ?? episode.series_id ?? '';
      if (!seriesId || seen.has(seriesId)) {
        continue;
      }
      seen.add(seriesId);
      out.push({
        seriesId,
        seriesTitle: meta?.series_title ?? episode.series_title ?? episode.title ?? '',
        episodeNumber: meta?.episode_number ?? 0,
        thumb: thumbUrl(episode.images),
        watchPath: `/watch/${episode.id}`,
        airDate: meta?.episode_air_date ?? '',
      });
      if (out.length >= limit) {
        break;
      }
    }
    return out;
  } catch {
    return [];
  }
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

/** Extracts the underlying panel from a watchlist item (which may wrap it). */
function unwrapPanel(item: unknown): unknown {
  if (item && typeof item === 'object' && 'panel' in item) {
    return (item as { panel: unknown }).panel;
  }
  return item;
}

function hasImage(series: Series): boolean {
  return Boolean(series.poster || series.wide);
}

/**
 * Resolves a watchlist panel to its parent **series** id + a fallback view
 * model. Watchlist panels are often the in-progress *episode* (which carries
 * only a thumbnail and the episode title), so we key on `series_id` and rebuild
 * with the series title — the real poster is fetched separately via getObjects.
 */
function watchlistSeries(panel: unknown): { id: string; fallback: Series } | null {
  const ep = episodePanelSchema.safeParse(panel);
  if (ep.success && ep.data.episode_metadata?.series_id) {
    const seriesId = ep.data.episode_metadata.series_id;
    return { id: seriesId, fallback: { ...episodePanelToSeries(ep.data), id: seriesId } };
  }
  const series = panelSchema.safeParse(panel);
  if (series.success) {
    return { id: series.data.id, fallback: panelToSeries(series.data) };
  }
  return null;
}

const WATCHLIST_PAGE = 100;

/** Fetches raw watchlist items, paging until `limit` is reached or none remain. */
async function fetchWatchlistRaw(account: string, limit: number): Promise<unknown[]> {
  const out: unknown[] = [];
  for (let start = 0; start < limit; start += WATCHLIST_PAGE) {
    const n = Math.min(WATCHLIST_PAGE, limit - start);
    const raw = await getJson(`/content/v2/discover/${account}/watchlist`, {
      n,
      start,
      order: 'desc',
    });
    const items = extractData(raw);
    out.push(...items);
    if (items.length < n) {
      break; // last page
    }
  }
  return out;
}

/**
 * The user's Crunchyroll watchlist (their saved/"favorited" anime), newest
 * first, deduped by series and paged to `limit`. Each entry is resolved to its
 * full **series** object (poster + series title) via getObjects, so cards never
 * show an episode thumbnail/title or a broken image.
 */
export async function getWatchlist(limit = 40): Promise<Series[]> {
  const account = await getAccountId();
  if (!account) {
    return [];
  }
  try {
    const ids: string[] = [];
    const seen = new Set<string>();
    const fallback = new Map<string, Series>();
    for (const item of await fetchWatchlistRaw(account, limit)) {
      const resolved = watchlistSeries(unwrapPanel(item));
      if (resolved && !seen.has(resolved.id)) {
        seen.add(resolved.id);
        ids.push(resolved.id);
        fallback.set(resolved.id, resolved.fallback);
      }
    }
    if (ids.length === 0) {
      return [];
    }
    const byId = new Map((await getObjects(ids)).map((item) => [item.id, item]));
    return ids
      .map((id) => {
        const full = byId.get(id);
        return full && hasImage(full) ? full : fallback.get(id);
      })
      .filter((series): series is Series => series !== undefined);
  } catch {
    return [];
  }
}

/** Total number of items in the user's watchlist (the real "favorites" count). */
export async function getWatchlistTotal(): Promise<number> {
  const account = await getAccountId();
  if (!account) {
    return 0;
  }
  try {
    const raw = await getJson(`/content/v2/discover/${account}/watchlist`, { n: 1, order: 'desc' });
    return readTotal(raw) ?? 0;
  } catch {
    return 0;
  }
}

/** Fetches and validates raw watch-history entries (newest first). */
async function fetchWatchHistoryItems(limit: number, page = 0): Promise<WatchHistoryItemDto[]> {
  const account = await getAccountId();
  if (!account) {
    return [];
  }
  try {
    // The API rejects `page=0` ("invalid_value"); the first page omits it and
    // pages are 1-indexed thereafter.
    const query: Record<string, QueryValue> = { page_size: limit };
    if (page > 0) {
      query.page = page;
    }
    const raw = await getJson(`/content/v2/${account}/watch-history`, query);
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

const CONTINUE_SCAN = 120;

/** In-progress episodes (continue watching), deduped by series, newest first. */
export async function getContinueWatching(limit = 24): Promise<ContinueItem[]> {
  // Scan a wide recent window: the newest entries are often already finished, so
  // a small page can miss every in-progress episode.
  const items = await fetchWatchHistoryItems(Math.max(limit, CONTINUE_SCAN));
  const out: ContinueItem[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const cont = watchHistoryToContinue(item);
    if (cont && !seen.has(cont.seriesId)) {
      seen.add(cont.seriesId);
      out.push(cont);
      if (out.length >= limit) {
        break;
      }
    }
  }
  return out;
}

/** Watchlist membership only (ids), without resolving full objects. */
export async function getWatchlistIds(limit = 400): Promise<string[]> {
  const account = await getAccountId();
  if (!account) {
    return [];
  }
  try {
    const ids: string[] = [];
    const seen = new Set<string>();
    for (const item of await fetchWatchlistRaw(account, limit)) {
      // Watchlist panels are episodes; key on the parent series id (membership
      // is checked against series ids across the app).
      const resolved = watchlistSeries(unwrapPanel(item));
      if (resolved && !seen.has(resolved.id)) {
        seen.add(resolved.id);
        ids.push(resolved.id);
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
    path: `/content/v2/${account}/watchlist`,
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
/** How many history pages to scan when counting distinct series (bounded). */
const STATS_SERIES_PAGES = 10;
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
 * `total`), distinct series (counted across a bounded number of pages), and
 * estimated hours from average episode duration × episodes.
 */
export async function getWatchStats(): Promise<WatchStats> {
  const account = await getAccountId();
  if (!account) {
    return EMPTY_STATS;
  }
  try {
    // First page — `page` omitted (the API rejects `page=0`).
    const firstRaw = await getJson(`/content/v2/${account}/watch-history`, {
      page_size: WATCH_HISTORY_PAGE,
    });
    const firstItems = parseEach(watchHistoryItemSchema, firstRaw);
    const episodes = readTotal(firstRaw) ?? firstItems.length;
    if (episodes === 0) {
      return EMPTY_STATS;
    }

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
    collect(firstItems);

    // Count distinct series across a bounded number of further pages (fetched in
    // parallel) so "series followed" reflects more than the first page without
    // walking the entire history.
    const pages = Math.min(STATS_SERIES_PAGES, Math.ceil(episodes / WATCH_HISTORY_PAGE));
    if (pages > 1) {
      const rest = await Promise.all(
        Array.from({ length: pages - 1 }, (_, index) =>
          fetchWatchHistoryItems(WATCH_HISTORY_PAGE, index + 1),
        ),
      );
      for (const items of rest) {
        collect(items);
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

export interface TopSeries {
  readonly id: string;
  readonly title: string;
  readonly count: number;
}

export interface DetailedStats extends WatchStats {
  /** Hours watched within the current calendar month. */
  readonly hoursThisMonth: number;
  /** Consecutive days (up to today/yesterday) with at least one episode watched. */
  readonly streak: number;
  /** Most-watched series by episode count (from recent history), top first. */
  readonly topSeries: readonly TopSeries[];
}

const EMPTY_DETAILED: DetailedStats = {
  ...EMPTY_STATS,
  hoursThisMonth: 0,
  streak: 0,
  topSeries: [],
};
/** History depth scanned for the rich stats (bounded; recent activity). */
const STATS_DETAIL_PAGES = 8;
const TOP_SERIES_COUNT = 10;

/** Local day key (YYYY-MM-DD) for streak grouping. */
function dayKey(date: Date): string {
  return `${String(date.getFullYear())}-${String(date.getMonth())}-${String(date.getDate())}`;
}

/** Length of the consecutive-day streak ending today (or yesterday) in `days`. */
function streakLength(days: ReadonlySet<string>): number {
  if (days.size === 0) {
    return 0;
  }
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  if (!days.has(dayKey(cursor))) {
    // Allow the streak to still count if the user simply hasn't watched yet today.
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(dayKey(cursor))) {
      return 0;
    }
  }
  let count = 0;
  while (days.has(dayKey(cursor))) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

/**
 * Rich watch statistics computed from a bounded scan of recent history:
 * hours this month, the current day-streak, and the most-watched series.
 * Base totals (episodes/hours/series) mirror {@link getWatchStats}.
 */
export async function getDetailedStats(): Promise<DetailedStats> {
  const account = await getAccountId();
  if (!account) {
    return EMPTY_DETAILED;
  }
  try {
    const firstRaw = await getJson(`/content/v2/${account}/watch-history`, {
      page_size: WATCH_HISTORY_PAGE,
    });
    const firstItems = parseEach(watchHistoryItemSchema, firstRaw);
    const episodes = readTotal(firstRaw) ?? firstItems.length;
    if (episodes === 0) {
      return EMPTY_DETAILED;
    }

    const pages = Math.min(STATS_DETAIL_PAGES, Math.ceil(episodes / WATCH_HISTORY_PAGE));
    const rest =
      pages > 1
        ? await Promise.all(
            Array.from({ length: pages - 1 }, (_, index) =>
              fetchWatchHistoryItems(WATCH_HISTORY_PAGE, index + 1),
            ),
          )
        : [];
    const all = [firstItems, ...rest].flat();

    const now = new Date();
    const seriesIds = new Set<string>();
    const days = new Set<string>();
    const perSeries = new Map<string, { title: string; count: number }>();
    let durationMs = 0;
    let durationCount = 0;
    let monthMs = 0;

    for (const item of all) {
      const meta = item.panel?.episode_metadata;
      const seriesId = item.parent_id ?? meta?.series_id;
      const ms = typeof meta?.duration_ms === 'number' ? meta.duration_ms : 0;
      if (ms > 0) {
        durationMs += ms;
        durationCount += 1;
      }
      if (seriesId) {
        seriesIds.add(seriesId);
        const title = meta?.series_title ?? item.panel?.series_title ?? '';
        const entry = perSeries.get(seriesId) ?? { title, count: 0 };
        entry.count += 1;
        if (!entry.title && title) {
          entry.title = title;
        }
        perSeries.set(seriesId, entry);
      }
      if (item.date_played) {
        const when = new Date(item.date_played);
        if (!Number.isNaN(when.getTime())) {
          days.add(dayKey(when));
          if (when.getFullYear() === now.getFullYear() && when.getMonth() === now.getMonth()) {
            monthMs += ms > 0 ? ms : MINUTES_PER_EPISODE * 60_000;
          }
        }
      }
    }

    const avgMinutes =
      durationCount > 0 && durationMs > 0
        ? durationMs / durationCount / 60_000
        : MINUTES_PER_EPISODE;
    const topSeries = [...perSeries.entries()]
      .map(([id, value]) => ({ id, title: value.title, count: value.count }))
      .filter((entry) => entry.title.length > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, TOP_SERIES_COUNT);

    return {
      episodes,
      hours: Math.round((episodes * avgMinutes) / 60),
      series: seriesIds.size,
      hoursThisMonth: Math.round(monthMs / 3_600_000),
      streak: streakLength(days),
      topSeries,
    };
  } catch {
    return EMPTY_DETAILED;
  }
}

/** Real Crunchyroll account preferences (audio/subtitle language). */
export interface CrPreferences {
  readonly audioLanguage: string;
  readonly subtitleLanguage: string;
}

/** Reads the account's real Crunchyroll preferences (`/accounts/v1/me/profile`). */
export async function getCrPreferences(): Promise<CrPreferences | null> {
  try {
    const raw = await getJson('/accounts/v1/me/profile');
    if (raw && typeof raw === 'object') {
      const o = raw as Record<string, unknown>;
      return {
        audioLanguage:
          typeof o.preferred_content_audio_language === 'string'
            ? o.preferred_content_audio_language
            : '',
        subtitleLanguage:
          typeof o.preferred_content_subtitle_language === 'string'
            ? o.preferred_content_subtitle_language
            : '',
      };
    }
  } catch {
    // Not signed in or endpoint unavailable.
  }
  return null;
}

/** Updates the account's Crunchyroll language preferences. Returns success. */
export async function updateCrPreferences(patch: Partial<CrPreferences>): Promise<boolean> {
  const body: Record<string, string> = {};
  if (patch.audioLanguage !== undefined) {
    body.preferred_content_audio_language = patch.audioLanguage;
  }
  if (patch.subtitleLanguage !== undefined) {
    body.preferred_content_subtitle_language = patch.subtitleLanguage;
  }
  if (Object.keys(body).length === 0) {
    return true;
  }
  const result = await bridge.apiRequest({
    method: 'PATCH',
    path: '/accounts/v1/me/profile',
    body,
  });
  return result.ok;
}

/* ── Star ratings (Crunchyroll `content-reviews` service) ─────────────────
 * The same endpoints the official web app calls: a public per-series summary
 * and the signed-in user's own rating (values are "1s".."5s"). Every call is
 * defensive — if CR moves the service, the widget simply hides. */

/** Community star rating of a series. */
export interface SeriesRatingSummary {
  /** Average, on a 0–5 scale. */
  readonly average: number;
  /** Number of ratings the average is built from. */
  readonly total: number;
}

export async function getSeriesRatingSummary(
  seriesId: string,
): Promise<SeriesRatingSummary | null> {
  try {
    const raw = await getJson(`/content-reviews/v2/rating/series/${seriesId}`);
    if (raw && typeof raw === 'object') {
      const o = raw as { average?: unknown; total?: unknown };
      const average = Number(o.average);
      const total = Number(o.total);
      if (Number.isFinite(average) && average > 0) {
        return { average, total: Number.isFinite(total) ? total : 0 };
      }
    }
  } catch {
    /* service unavailable — caller hides the widget */
  }
  return null;
}

/** The signed-in user's own star rating for a series (0 = not rated yet).
 *  Documented route: `content-reviews/v3` (documentation/EtpContentReviews). */
export async function getUserSeriesRating(seriesId: string): Promise<number> {
  const account = await getAccountId();
  if (!account) {
    return 0;
  }
  try {
    const raw = await getJson(`/content-reviews/v3/user/${account}/rating/series/${seriesId}`);
    const rating = (raw as { rating?: unknown } | null)?.rating;
    const parsed = typeof rating === 'string' ? Number.parseInt(rating, 10) : 0;
    return Number.isFinite(parsed) ? Math.min(5, Math.max(0, parsed)) : 0;
  } catch {
    return 0;
  }
}

/** Rates a series 1–5 stars ("1s".."5s") on the user's real Crunchyroll
 *  account. Documented route: `content-reviews/v3` PUT. */
export async function rateSeries(seriesId: string, stars: number): Promise<boolean> {
  const account = await getAccountId();
  const value = Math.round(stars);
  if (!account || value < 1 || value > 5) {
    return false;
  }
  const result = await bridge.apiRequest({
    method: 'PUT',
    path: `/content-reviews/v3/user/${account}/rating/series/${seriesId}`,
    body: { rating: `${String(value)}s` },
  });
  return result.ok;
}

/* ── Multi-profile (documentation/EtpAccount + EtpAccountAuth) ──────────── */

/** One Crunchyroll profile on the signed-in account. */
export interface CrProfile {
  readonly profileId: string;
  readonly name: string;
  readonly avatarUrl: string;
  readonly isPrimary: boolean;
}

/** First string-valued field found among `keys` on `o`. */
function pickString(o: Record<string, unknown>, keys: readonly string[]): string {
  for (const key of keys) {
    const value = o[key];
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }
  return '';
}

/** Normalises an avatar reference (bare filename or absolute URL) to a URL. */
function avatarToUrl(avatar: string): string {
  if (!avatar) {
    return '';
  }
  return /^https?:\/\//.test(avatar) ? avatar : `${AVATAR_BASE}/${avatar}`;
}

/** Multiprofile listing plus the account's profile quota. */
export interface MultiprofileInfo {
  readonly profiles: readonly CrProfile[];
  /** How many profiles this account may hold (`max_profiles`). */
  readonly maxProfiles: number;
}

/**
 * Profiles + quota (`GET /accounts/v1/me/multiprofile`). Live shape (verified):
 * `{ tier_max_profiles, max_profiles, profiles: [{ profile_id, profile_name,
 * username, avatar, is_primary, is_selected, … }] }` — parsing stays permissive
 * about the container/field names all the same, and logs the raw payload when
 * nothing can be understood so diagnosis stays trivial.
 */
export async function getMultiprofile(): Promise<MultiprofileInfo> {
  try {
    const raw = await getJson('/accounts/v1/me/multiprofile');
    const container = raw as Record<string, unknown> | unknown[] | null;
    const list = Array.isArray(container)
      ? container
      : Array.isArray(container?.profiles)
        ? (container.profiles as unknown[])
        : Array.isArray(container?.items)
          ? (container.items as unknown[])
          : Array.isArray(container?.data)
            ? (container.data as unknown[])
            : null;
    if (!list) {
      console.warn('[BetterCR] multiprofile: unexpected shape', raw);
      return { profiles: [], maxProfiles: 0 };
    }
    const profiles = list.flatMap((item) => {
      const o = item as Record<string, unknown>;
      const profileId = pickString(o, ['profile_id', 'id', 'profileId']);
      if (!profileId) {
        return [];
      }
      return [
        {
          profileId,
          name: pickString(o, ['profile_name', 'username', 'nickname', 'name']),
          avatarUrl: avatarToUrl(pickString(o, ['avatar', 'avatar_url', 'avatarUrl'])),
          isPrimary: o.is_primary === true || o.primary === true,
        },
      ];
    });
    if (profiles.length === 0) {
      console.warn('[BetterCR] multiprofile: 0 profiles parsed from', raw);
    }
    const maxRaw = Array.isArray(container) ? NaN : Number(container?.max_profiles);
    return {
      profiles,
      maxProfiles: Number.isFinite(maxRaw) && maxRaw > 0 ? maxRaw : profiles.length,
    };
  } catch (error) {
    console.warn('[BetterCR] multiprofile request failed', error);
    return { profiles: [], maxProfiles: 0 };
  }
}

/** All profiles on the account (thin wrapper over {@link getMultiprofile}). */
export async function getProfiles(): Promise<CrProfile[]> {
  return [...(await getMultiprofile()).profiles];
}

/** Outcome of a profile mutation; `error` carries Crunchyroll's own message. */
export interface ProfileMutation {
  readonly ok: boolean;
  readonly error?: string;
}

function toMutation(result: { readonly ok: boolean; readonly error?: string }): ProfileMutation {
  return result.ok ? { ok: true } : { ok: false, error: result.error ?? 'request failed' };
}

/** Creates a profile (`POST /accounts/v1/me/multiprofile`, doc-verified). */
export async function createProfile(input: {
  readonly profileName: string;
  readonly username: string;
  readonly avatar: string;
}): Promise<ProfileMutation> {
  const result = await bridge.apiRequest({
    method: 'POST',
    path: '/accounts/v1/me/multiprofile',
    body: {
      profile_name: input.profileName,
      username: input.username,
      avatar: input.avatar,
    },
  });
  return toMutation(result);
}

/** Updates a profile's name and/or avatar (`PATCH .../multiprofile/{id}`). */
export async function updateProfile(
  profileId: string,
  patch: { readonly profileName?: string; readonly avatar?: string },
): Promise<ProfileMutation> {
  const body: Record<string, string> = {};
  if (patch.profileName !== undefined) {
    body.profile_name = patch.profileName;
  }
  if (patch.avatar !== undefined) {
    body.avatar = patch.avatar;
  }
  if (Object.keys(body).length === 0) {
    return { ok: true };
  }
  const result = await bridge.apiRequest({
    method: 'PATCH',
    path: `/accounts/v1/me/multiprofile/${profileId}`,
    body,
  });
  return toMutation(result);
}

/** Deletes a profile (`DELETE .../multiprofile/{id}`). Irreversible. */
export async function deleteProfile(profileId: string): Promise<ProfileMutation> {
  const result = await bridge.apiRequest({
    method: 'DELETE',
    path: `/accounts/v1/me/multiprofile/${profileId}`,
  });
  return toMutation(result);
}

/** One selectable avatar (bare asset name + full image URL). */
export interface AvatarOption {
  readonly asset: string;
  readonly url: string;
}

/** Deep-scans an object for the first string that looks like a .png asset. */
function findPngAsset(value: unknown, depth = 0): string {
  if (typeof value === 'string') {
    return /\.png$/i.test(value) ? value : '';
  }
  if (depth >= 3 || value === null || typeof value !== 'object') {
    return '';
  }
  for (const nested of Object.values(value)) {
    const hit = findPngAsset(nested, depth + 1);
    if (hit) {
      return hit;
    }
  }
  return '';
}

/**
 * The avatar catalogue (`GET /assets/v2/{locale}/avatar` — 200 with
 * `{items:[…]}` live). Item shape is not documented, so extraction is layered:
 * bare strings, common id/name keys, then a deep scan for anything ending in
 * `.png` (profile avatars are always `<name>.png`, e.g.
 * `1046-dr-stone-senku.png`). Logs the first item when nothing matches.
 */
export async function getAvatarOptions(): Promise<AvatarOption[]> {
  try {
    const raw = await getJson(`/assets/v2/${apiLocale}/avatar`);
    const items = (raw as { items?: unknown } | null)?.items;
    if (!Array.isArray(items)) {
      console.warn('[BetterCR] avatar catalogue: unexpected shape', raw);
      return [];
    }
    const options = items.flatMap((item) => {
      const asset =
        typeof item === 'string'
          ? item
          : pickString(item as Record<string, unknown>, ['id', 'asset_id', 'name', 'filename']) ||
            findPngAsset(item);
      return asset ? [{ asset, url: avatarToUrl(asset) }] : [];
    });
    if (options.length === 0 && items.length > 0) {
      console.warn('[BetterCR] avatar catalogue: could not parse items; first item:', items[0]);
    }
    return options;
  } catch {
    return [];
  }
}

/**
 * Typed Crunchyroll API client used by the SPA. Each function proxies a request
 * through the {@link bridge}, validates the response with zod (skipping any
 * malformed items rather than throwing), and returns ready-to-render models.
 */
import type { z } from 'zod';
import {
  cmsSeriesSchema,
  episodePanelSchema,
  episodeSchema,
  panelSchema,
  playheadSchema,
  profileSchema,
  seasonSchema,
} from '@core/schemas/crunchyroll';
import { delay } from '@shared/async';
import {
  cmsSeriesToDetail,
  episodeToModel,
  panelToSeries,
  seasonToModel,
} from '@core/mappers/content';
import type {
  Episode,
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

  const raw = await getJson('/content/v2/discover/browse', query);
  return parseEach(panelSchema, raw).map(panelToSeries);
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
export async function getHomeFeed(): Promise<HomeFeed> {
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

/** The user's Crunchyroll watchlist (most recently updated first). */
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
    const panels = extractData(raw).map(unwrapPanel);

    const ids: string[] = [];
    for (const panel of panels) {
      const id = (panel as { id?: unknown }).id;
      if (typeof id === 'string') {
        ids.push(id);
      }
    }
    if (ids.length === 0) {
      return [];
    }

    // Resolve full objects so posters/wide art are always present, in order.
    const resolved = await getObjects(ids);
    if (resolved.length > 0) {
      return resolved;
    }

    // Fallback: map the (possibly image-light) watchlist panels directly.
    const series: Series[] = [];
    for (const panel of panels) {
      const parsed = panelSchema.safeParse(panel);
      if (parsed.success) {
        series.push(panelToSeries(parsed.data));
      }
    }
    return series;
  } catch {
    return [];
  }
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
}

const WATCH_HISTORY_PAGE = 100;
const WATCH_HISTORY_MAX_PAGES = 10;

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

function sampleDurationMinutes(items: readonly unknown[]): number {
  let ms = 0;
  let count = 0;
  for (const item of items) {
    const value = (unwrapPanel(item) as { duration_ms?: unknown }).duration_ms;
    if (typeof value === 'number') {
      ms += value;
      count += 1;
    }
  }
  return count > 0 && ms > 0 ? ms / count / 60_000 : MINUTES_PER_EPISODE;
}

/** Aggregate watch statistics from the account's watch history (best-effort). */
export async function getWatchStats(): Promise<WatchStats> {
  const account = await getAccountId();
  if (!account) {
    return { episodes: 0, hours: 0 };
  }
  try {
    const firstRaw = await getJson(`/content/v2/${account}/watch-history`, {
      page_size: WATCH_HISTORY_PAGE,
      page: 0,
    });
    const firstItems = extractData(firstRaw);
    const avgMinutes = sampleDurationMinutes(firstItems);

    let episodes = readTotal(firstRaw) ?? firstItems.length;

    // No total reported and the first page is full → page through to count.
    if (readTotal(firstRaw) === null && firstItems.length >= WATCH_HISTORY_PAGE) {
      for (let page = 1; page < WATCH_HISTORY_MAX_PAGES; page += 1) {
        const more = extractData(
          await getJson(`/content/v2/${account}/watch-history`, {
            page_size: WATCH_HISTORY_PAGE,
            page,
          }),
        );
        episodes += more.length;
        if (more.length < WATCH_HISTORY_PAGE) {
          break;
        }
      }
    }

    return { episodes, hours: Math.round((episodes * avgMinutes) / 60) };
  } catch {
    return { episodes: 0, hours: 0 };
  }
}

/**
 * Maps validated Crunchyroll DTOs to the UI view models. This is where the
 * data source is swapped from the old mock/AniList shape to live Crunchyroll
 * data without the components noticing.
 */
import type {
  ContinueItem,
  Episode,
  Genre,
  Season,
  Series,
  SeriesDetail,
} from '@core/models/content';
import type {
  CategoryDto,
  CmsSeriesDto,
  EpisodeDto,
  EpisodePanelDto,
  PanelDto,
  SeasonDto,
  WatchHistoryItemDto,
} from '@core/schemas/crunchyroll';
import { listUrl, posterUrl, thumbUrl, wideUrl } from './images';

const MS_PER_MINUTE = 60_000;

function firstRating(ratings: readonly string[] | undefined): string {
  return ratings?.[0] ?? '';
}

export function panelToSeries(panel: PanelDto): Series {
  const meta = panel.series_metadata;
  const poster = posterUrl(panel.images);
  const wide = wideUrl(panel.images) || poster;
  return {
    id: panel.id,
    title: panel.title ?? '',
    desc: panel.description ?? '',
    poster,
    wide,
    wideXL: wide,
    eps: meta?.episode_count ?? 0,
    seasons: meta?.season_count ?? 1,
    year: meta?.series_launch_year ?? 0,
    dub: meta?.is_dubbed ?? false,
    sub: meta?.is_subbed ?? false,
    simulcast: meta?.is_simulcast ?? false,
    rating: firstRating(meta?.maturity_ratings),
  };
}

export function cmsSeriesToDetail(dto: CmsSeriesDto): SeriesDetail {
  const poster = posterUrl(dto.images);
  const wide = wideUrl(dto.images) || poster;
  return {
    id: dto.id,
    title: dto.title ?? '',
    desc: dto.description ?? '',
    poster,
    wide,
    wideXL: wide,
    eps: dto.episode_count ?? 0,
    seasons: dto.season_count ?? 1,
    year: dto.series_launch_year ?? 0,
    dub: dto.is_dubbed ?? false,
    sub: dto.is_subbed ?? false,
    simulcast: dto.is_simulcast ?? false,
    rating: firstRating(dto.maturity_ratings),
    extDesc: dto.extended_description ?? '',
    keywords: dto.keywords ?? [],
    descriptors: dto.content_descriptors ?? [],
  };
}

export function seasonToModel(dto: SeasonDto): Season {
  const num = dto.season_number ?? 0;
  return {
    id: dto.id,
    num,
    title: dto.title ?? (num > 0 ? `Saison ${num}` : 'Saison'),
    episodeCount: dto.number_of_episodes ?? 0,
  };
}

/**
 * Builds a Series view-model from a watch-history/episode panel: the parent
 * series id/title, with the episode thumbnail as a guaranteed image fallback.
 */
export function episodePanelToSeries(panel: EpisodePanelDto): Series {
  const meta = panel.episode_metadata;
  const thumb = thumbUrl(panel.images);
  return {
    id: meta?.series_id ?? panel.series_id ?? panel.id,
    title: meta?.series_title ?? panel.series_title ?? panel.title ?? '',
    desc: '',
    poster: thumb,
    wide: thumb,
    wideXL: thumb,
    eps: 0,
    seasons: 1,
    year: 0,
    dub: false,
    sub: false,
    simulcast: false,
    rating: '',
  };
}

/** Parent series of a watch-history entry, with the episode thumbnail. */
export function watchHistoryToSeries(item: WatchHistoryItemDto): Series {
  const panel = item.panel;
  const meta = panel?.episode_metadata;
  const thumb = thumbUrl(panel?.images);
  return {
    id: item.parent_id ?? meta?.series_id ?? panel?.series_id ?? panel?.id ?? '',
    title: meta?.series_title ?? panel?.series_title ?? panel?.title ?? '',
    desc: '',
    poster: thumb,
    wide: thumb,
    wideXL: thumb,
    eps: 0,
    seasons: 1,
    year: 0,
    dub: false,
    sub: false,
    simulcast: false,
    rating: '',
  };
}

/** A "continue watching" card from an in-progress watch-history entry. */
export function watchHistoryToContinue(item: WatchHistoryItemDto): ContinueItem | null {
  const panel = item.panel;
  const playhead = item.playhead ?? 0;
  if (!panel || item.fully_watched || playhead <= 0) {
    return null;
  }
  const meta = panel.episode_metadata;
  const seriesId = item.parent_id ?? meta?.series_id ?? panel.series_id ?? '';
  if (!seriesId) {
    return null;
  }
  const durationMs = meta?.duration_ms ?? 0;
  const durationSec = durationMs / 1000;
  const progress = durationSec > 0 ? Math.min(99, Math.round((playhead / durationSec) * 100)) : 0;
  return {
    seriesId,
    episodeId: panel.id,
    seriesTitle: meta?.series_title ?? panel.series_title ?? '',
    epTitle: panel.title ?? '',
    epNum: meta?.episode_number ?? 0,
    seasonNum: meta?.season_number ?? 1,
    thumb: thumbUrl(panel.images),
    progress,
    durMin: durationMs ? Math.round(durationMs / MS_PER_MINUTE) : 24,
    watchPath: `/watch/${panel.id}`,
  };
}

/** A genre tile from a discover category. */
export function categoryToGenre(dto: CategoryDto): Genre | null {
  const id = dto.id ?? dto.slug;
  if (!id) {
    return null;
  }
  return {
    id,
    title: dto.localization?.title ?? dto.title ?? id,
    image: listUrl(dto.images?.background) || listUrl(dto.images?.low),
  };
}

export function episodeToModel(dto: EpisodeDto): Episode {
  return {
    id: dto.id,
    num: dto.episode_number ?? 0,
    seasonNum: dto.season_number ?? 0,
    title: dto.title ?? '',
    desc: dto.description ?? '',
    thumb: thumbUrl(dto.images),
    durMin: dto.duration_ms ? Math.round(dto.duration_ms / MS_PER_MINUTE) : 0,
    air: dto.episode_air_date ?? dto.availability_starts ?? '',
    watchPath: `/watch/${dto.id}`,
  };
}

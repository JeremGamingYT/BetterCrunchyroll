/**
 * Maps validated Crunchyroll DTOs to the UI view models. This is where the
 * data source is swapped from the old mock/AniList shape to live Crunchyroll
 * data without the components noticing.
 */
import type { Episode, Season, Series, SeriesDetail } from '@core/models/content';
import type { CmsSeriesDto, EpisodeDto, PanelDto, SeasonDto } from '@core/schemas/crunchyroll';
import { posterUrl, thumbUrl, wideUrl } from './images';

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

import { useEffect, useState } from 'react';
import type { Episode, Series } from '@core/models/content';
import {
  browseSeries,
  getPlayheads,
  getSeasonEpisodes,
  getSeasons,
  getSeriesDetail,
  type PlayheadInfo,
} from '@core/api/client';
import { bridge } from '@core/api/transport';
import { fetchExternalMeta, type ExternalMeta } from '@core/providers';
import { useAsync } from '@app/hooks/useAsync';
import { useRouter } from '@app/router';
import { useI18n } from '@app/i18n/i18n';
import { useWatchlist, toggleWatchlist as toggleWatch } from '@app/lib/watchlist';
import { Icon } from '@app/components/Icon';
import { Chip } from '@app/components/Chip';
import { Row } from '@app/components/Row';
import { PosterCard } from '@app/components/PosterCard';
import { ErrorState } from '@app/components/StateViews';

const EP_DELAY_CAP = 280;
const REVEAL_PLAYHEAD_SECONDS = 30;
const SCORE_DIVISOR = 10;

interface EpisodeCardProps {
  readonly ep: Episode;
  readonly index: number;
  readonly revealed: boolean;
  readonly seen: boolean;
  readonly onPlay: (ep: Episode) => void;
}

function EpisodeCard({ ep, index, revealed, seen, onPlay }: EpisodeCardProps): React.JSX.Element {
  const { t } = useI18n();
  return (
    <div
      className={`ecard${revealed ? '' : ' is-unseen'}`}
      style={{ animationDelay: `${String(Math.min((index % 8) * 40, EP_DELAY_CAP))}ms` }}
    >
      <button className="ecard-hit" onClick={() => onPlay(ep)}>
        <div className="ecard-frame">
          <img className="ecard-img" src={ep.thumb} alt="" loading="lazy" />
          <div className="ccard-shade" />
          <span className="ccard-play">
            <Icon name="play" size={16} />
          </span>
          <span className="ecard-spoiler">
            <Icon name="eyeoff" size={22} />
          </span>
          {ep.durMin > 0 && <span className="ecard-dur">{ep.durMin} min</span>}
          {seen && (
            <span className="ecard-seen">
              <Icon name="check" size={11} /> {t('common.seen')}
            </span>
          )}
        </div>
        <div className="ecard-cap">
          <p className="ecard-title">
            <span className="ecard-num">E{ep.num}</span>{' '}
            <span className="ecard-name">{ep.title}</span>
          </p>
          {ep.desc && <p className="ecard-desc">{ep.desc}</p>}
        </div>
      </button>
    </div>
  );
}

function DetailSkeleton(): React.JSX.Element {
  return (
    <div>
      <div className="sk" style={{ width: '100%', height: 'min(86vh,820px)' }} />
      <div className="page-pad" style={{ marginTop: 28 }}>
        <div className="sk" style={{ width: '100%', height: 180, borderRadius: 22 }} />
      </div>
    </div>
  );
}

export interface DetailPageProps {
  readonly seriesId: string;
}

export function DetailPage({ seriesId }: DetailPageProps): React.JSX.Element {
  const { go } = useRouter();
  const { t, lang } = useI18n();

  const detailState = useAsync(() => getSeriesDetail(seriesId), [seriesId, lang]);
  const seasonsState = useAsync(() => getSeasons(seriesId), [seriesId, lang]);
  const relatedState = useAsync(
    () => browseSeries({ sort: 'popularity', n: 18 }),
    [seriesId, lang],
  );
  const [activeSeasonId, setActiveSeasonId] = useState<string | null>(null);
  const { ids: watchlistIds } = useWatchlist();
  const marked = watchlistIds.has(seriesId);

  const seasons = seasonsState.data ?? [];
  const seasonId = activeSeasonId ?? seasons[0]?.id ?? null;
  const episodesState = useAsync(
    () => (seasonId ? getSeasonEpisodes(seasonId) : Promise.resolve<Episode[]>([])),
    [seasonId, lang],
  );

  const episodes = episodesState.data ?? [];
  const episodeIds = episodes.map((episode) => episode.id).join(',');
  const playheadsState = useAsync(
    () => getPlayheads(episodeIds ? episodeIds.split(',') : []),
    [episodeIds],
  );

  // Enrichment (AniList first) — keyed on the resolved CR title/year.
  const detailTitle = detailState.data?.title ?? '';
  const detailYear = detailState.data?.year ?? 0;
  const metaState = useAsync(
    () =>
      detailTitle
        ? fetchExternalMeta(detailTitle, detailYear || undefined)
        : Promise.resolve<ExternalMeta | null>(null),
    [detailTitle, detailYear],
  );

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [seriesId]);

  if (detailState.loading) {
    return <DetailSkeleton />;
  }
  if (detailState.error || !detailState.data) {
    return <ErrorState message={detailState.error ?? 'Série introuvable.'} />;
  }

  const detail = detailState.data;
  const meta = metaState.data;
  const related = (relatedState.data ?? []).filter((series) => series.id !== seriesId).slice(0, 14);
  const playheads = playheadsState.data ?? new Map<string, PlayheadInfo>();

  const playheadOf = (ep: Episode): PlayheadInfo | undefined => playheads.get(ep.id);
  const isRevealed = (ep: Episode): boolean => {
    const info = playheadOf(ep);
    return info ? info.fullyWatched || info.playhead > REVEAL_PLAYHEAD_SECONDS : false;
  };

  const play = (ep: Episode): void => bridge.navigate(ep.watchPath);
  const startFirst = (): void => {
    const first = episodes[0];
    if (first) {
      play(first);
    }
  };
  const openDetail = (series: Series): void => go({ page: 'detail', seriesId: series.id });

  const toggleWatchlist = (): void => {
    void toggleWatch(seriesId);
  };

  // Crunchyroll stays the source of truth; AniList fills gaps and richer art.
  const bannerImage = meta?.bannerImage || detail.wideXL || detail.wide || detail.poster;
  const posterImage = detail.poster || meta?.coverImage || '';
  const about = detail.desc || meta?.description || detail.extDesc;
  const keywords = detail.keywords.length > 0 ? detail.keywords : (meta?.genres ?? []);
  const scoreLabel = meta?.score && meta.score > 0 ? (meta.score / SCORE_DIVISOR).toFixed(1) : '';

  const langs = [detail.sub ? 'VOSTFR' : '', detail.dub ? 'VF' : ''].filter(Boolean).join(' · ');
  const facts: Array<readonly [string, string]> = [
    [t('facts.year'), detail.year > 0 ? String(detail.year) : ''],
    [t('facts.seasons'), String(detail.seasons || seasons.length || 1)],
    [t('facts.episodes'), String(detail.eps || meta?.episodes || '')],
    [t('facts.rating'), detail.rating],
    [t('facts.languages'), langs],
    [t('facts.studio'), meta?.studios?.[0] ?? ''],
  ].filter((fact): fact is [string, string] => fact[1] !== '');

  return (
    <div data-screen-label={`Détails — ${detail.title}`}>
      <div className="dt-stage">
        <div className="dt-stage-bg">
          <img src={bannerImage} alt="" />
        </div>
        <div className="dt-stage-grad" />
        <div className="dt-stage-glow" />
        <button
          className="btn btn-icon dt-back"
          onClick={() => go({ page: 'home' })}
          aria-label="Retour"
        >
          <Icon name="back" size={18} />
        </button>
        <div className="dt-stage-inner page-pad">
          <div className="dt-poster-wrap">
            <img className="dt-poster" src={posterImage} alt={detail.title} />
          </div>
          <div className="dt-headline">
            <span className="dt-kicker">
              <i className="dot" /> {t('detail.series')}
              {detail.year > 0 ? ` · ${String(detail.year)}` : ''}
            </span>
            <h1 className="dt-title">{detail.title}</h1>
            <div className="dt-ratingline">
              <div className="dt-meta" style={{ marginTop: 0 }}>
                {scoreLabel && (
                  <Chip tone="acc">
                    <Icon name="star" size={12} solid /> {scoreLabel}
                  </Chip>
                )}
                {detail.rating && <Chip tone="line">{detail.rating}</Chip>}
                {detail.eps > 0 && <span>{t('common.episodes', { n: detail.eps })}</span>}
                {detail.dub && <Chip tone="line">VF</Chip>}
                {detail.sub && <Chip tone="line">VOSTFR</Chip>}
              </div>
            </div>
            <p className="dt-synopsis">{detail.desc}</p>
            <div className="dt-cta">
              <button className="btn btn-acc" onClick={startFirst} disabled={episodes.length === 0}>
                <Icon name="play" size={18} /> {t('detail.start')}
              </button>
              <button
                className={`btn btn-glass${marked ? ' is-marked' : ''}`}
                onClick={toggleWatchlist}
              >
                <Icon name={marked ? 'check' : 'bookmark'} size={17} solid={marked} />{' '}
                {marked ? t('detail.inWatchlist') : t('detail.watchlist')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="page-pad dt-section" style={{ marginTop: 30 }}>
        <div className="glass-card">
          <div className="glass-about">
            <p className="glass-h">{t('detail.about')}</p>
            <p>{about}</p>
            {detail.descriptors.length > 0 && (
              <p className="dt-warn" style={{ marginTop: 14 }}>
                {detail.descriptors.join(' · ')}
              </p>
            )}
            {keywords.length > 0 && (
              <div className="glass-tags">
                {keywords.map((keyword) => (
                  <span key={keyword} className="chip chip-btn">
                    {keyword}
                  </span>
                ))}
              </div>
            )}
            {meta && (
              <span className="meta-source">
                via <b>{meta.source}</b>
              </span>
            )}
          </div>
          <div className="facts-col">
            <p className="glass-h">{t('detail.info')}</p>
            <div className="facts">
              {facts.map(([key, value]) => (
                <div key={key} className="fact">
                  <span className="fact-k">{key}</span>
                  <span className="fact-v">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="page-pad dt-section">
        {seasons.length > 0 && (
          <div className="dt-seasons">
            {seasons.map((season) => (
              <button
                key={season.id}
                className={`season-tab${season.id === seasonId ? ' is-active' : ''}`}
                onClick={() => setActiveSeasonId(season.id)}
              >
                {season.title}
              </button>
            ))}
          </div>
        )}
        {episodesState.loading ? (
          <div className="ep-grid">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="sk-pcard"
                style={{ animationDelay: `${String(index * 60)}ms` }}
              >
                <div className="sk sk-thumb" />
                <div className="sk sk-line" />
              </div>
            ))}
          </div>
        ) : (
          <div className="ep-grid">
            {episodes.map((episode, index) => (
              <EpisodeCard
                key={episode.id}
                ep={episode}
                index={index}
                revealed={isRevealed(episode)}
                seen={playheadOf(episode)?.fullyWatched ?? false}
                onPlay={play}
              />
            ))}
          </div>
        )}
      </div>

      {related.length > 0 && (
        <div className="dt-section" style={{ marginBottom: 10 }}>
          <Row title={t('detail.related')}>
            {related.map((series, index) => (
              <PosterCard
                key={series.id}
                anime={series}
                index={index}
                onOpen={openDetail}
                onPlay={openDetail}
              />
            ))}
          </Row>
        </div>
      )}
    </div>
  );
}

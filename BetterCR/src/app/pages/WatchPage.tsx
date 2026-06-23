import { useEffect, useMemo, useRef } from 'react';
import type { Episode } from '@core/models/content';
import {
  getEpisodeInfo,
  getPlayheads,
  getSeasonEpisodes,
  getSeasons,
  getSeriesDetail,
  type EpisodeInfo,
  type PlayheadInfo,
} from '@core/api/client';
import { bridge } from '@core/api/transport';
import { useAsync } from '@app/hooks/useAsync';
import { useRouter } from '@app/router';
import { useI18n } from '@app/i18n/i18n';
import { Chip } from '@app/components/Chip';
import { Icon } from '@app/components/Icon';
import { CommentsSection } from '@app/components/CommentsSection';

export interface WatchPageProps {
  readonly seriesId: string;
  readonly episodeId?: string;
}

interface WatchData {
  readonly info: EpisodeInfo | null;
  readonly seriesTitle: string;
  readonly dub: boolean;
  readonly sub: boolean;
  readonly episodes: readonly Episode[];
}

async function loadWatch(seriesId: string, episodeId: string | undefined): Promise<WatchData> {
  const info = episodeId ? await getEpisodeInfo(episodeId) : null;
  const realSeriesId = info?.seriesId || seriesId;

  const [detail, seasons] = await Promise.all([
    getSeriesDetail(realSeriesId).catch(() => null),
    getSeasons(realSeriesId).catch(() => []),
  ]);

  const seasonId = info?.seasonId || seasons[0]?.id || '';
  const episodes = seasonId ? await getSeasonEpisodes(seasonId).catch(() => []) : [];

  return {
    info,
    seriesTitle: info?.seriesTitle || detail?.title || '',
    dub: detail?.dub ?? false,
    sub: detail?.sub ?? true,
    episodes,
  };
}

/**
 * BetterCR watch page. The native Crunchyroll player is laid over the `.player`
 * slot by the content script (we report the slot's viewport rect); everything
 * around it — header, episode info, up-next, footer — is the BetterCR UI.
 */
export function WatchPage({ seriesId, episodeId }: WatchPageProps): React.JSX.Element {
  const { go } = useRouter();
  const { t } = useI18n();
  const { data } = useAsync(() => loadWatch(seriesId, episodeId), [seriesId, episodeId]);

  const slotRef = useRef<HTMLDivElement>(null);

  const current = useMemo(() => {
    if (!data) return null;
    const byId = episodeId ? data.episodes.find((ep) => ep.id === episodeId) : undefined;
    if (byId) return byId;
    if (data.info) {
      return data.episodes.find((ep) => ep.num === data.info?.number) ?? null;
    }
    return null;
  }, [data, episodeId]);

  // Anti-spoiler: keep comments hidden until this episode has actually been
  // watched. Defaults to locked while the playhead is still loading.
  const epKey = episodeId || current?.id || '';
  const playheadState = useAsync(
    () => (epKey ? getPlayheads([epKey]) : Promise.resolve(new Map<string, PlayheadInfo>())),
    [epKey],
  );
  const ph = epKey ? playheadState.data?.get(epKey) : undefined;
  const watched = ph ? ph.fullyWatched || ph.playhead > 30 : false;
  const commentsLocked = epKey ? !watched : false;

  const num = current?.num ?? data?.info?.number ?? 0;
  const epTitle = current?.title || data?.info?.title || '';
  const durMin = current?.durMin || (data?.info ? Math.round(data.info.durationMs / 60000) : 0);
  const upNext = useMemo(
    () => (data ? data.episodes.filter((ep) => ep.num > num).slice(0, 6) : []),
    [data, num],
  );

  // Report the player slot's viewport rect so the content script can lay the
  // native Crunchyroll player exactly over it (and release it on unmount).
  useEffect(() => {
    const el = slotRef.current;
    if (!el) return;
    let raf = 0;
    const report = (): void => {
      const r = el.getBoundingClientRect();
      bridge.watchSlot({ x: r.left, y: r.top, width: r.width, height: r.height });
    };
    const schedule = (): void => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(report);
    };
    report();
    const settle = window.setTimeout(report, 350);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    const ro = new ResizeObserver(schedule);
    ro.observe(el);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      ro.disconnect();
      cancelAnimationFrame(raf);
      clearTimeout(settle);
      bridge.watchSlot(null);
    };
  }, [data]);

  const playEpisode = (ep: Episode): void => bridge.navigate(ep.watchPath);
  const openSeries = (): void => go({ page: 'detail', seriesId: data?.info?.seriesId || seriesId });

  return (
    <div className="watch bcr-watch" data-screen-label="Lecteur">
      {/* The native CR player is positioned over this slot by the content script. */}
      <div className="bcr-player-stage">
        <div className="bcr-player-slot" ref={slotRef} />
      </div>

      <div className="watch-below page-pad">
        <div className="watch-info">
          {data?.seriesTitle && (
            <button className="watch-kicker watch-kicker-btn" onClick={openSeries}>
              {data.seriesTitle}
            </button>
          )}
          <h1 className="watch-title">{num ? `E${String(num)} · ${epTitle}` : epTitle || '…'}</h1>
          <div className="dt-meta">
            {durMin > 0 && <span>{t('common.min', { n: durMin })}</span>}
            {data?.dub && <Chip tone="line">VF</Chip>}
            {data?.sub && <Chip tone="line">VOSTFR</Chip>}
          </div>
          <button className="row-all" onClick={openSeries}>
            {t('player.viewSeries')} <Icon name="chevR" size={14} />
          </button>
        </div>

        {upNext.length > 0 && (
          <aside className="watch-next">
            <h2 className="row-title">{t('player.upnext')}</h2>
            <div className="next-list">
              {upNext.map((ep) => (
                <button key={ep.id} className="next-item" onClick={() => playEpisode(ep)}>
                  <div className="next-thumb">
                    {ep.thumb && <img src={ep.thumb} alt="" loading="lazy" />}
                    <span className="ccard-play next-play">
                      <Icon name="play" size={13} />
                    </span>
                  </div>
                  <div className="next-cap">
                    <p className="next-title">
                      <span className="ecard-num">E{ep.num}</span> {ep.title}
                    </p>
                    {ep.durMin > 0 && (
                      <p className="pcard-meta">{t('common.min', { n: ep.durMin })}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </aside>
        )}
      </div>

      <CommentsSection
        episodeId={epKey}
        seriesId={data?.info?.seriesId || seriesId}
        seriesTitle={data?.seriesTitle}
        watchPath={epKey ? `/watch/${epKey}` : undefined}
        locked={commentsLocked}
      />
    </div>
  );
}

import { useEffect, useState, type CSSProperties, type MouseEvent } from 'react';
import type { Series } from '@core/models/content';
import {
  addToWatchlist,
  getWatchHistory,
  getWatchlist,
  removeFromWatchlist,
} from '@core/api/client';
import { useAsync } from '@app/hooks/useAsync';
import { useRouter } from '@app/router';
import { useI18n } from '@app/i18n/i18n';
import { animeColor } from '@app/lib/anime-color';
import { Icon } from '@app/components/Icon';
import { Chip } from '@app/components/Chip';
import { EmptyState } from '@app/components/StateViews';

type Tab = 'recent' | 'fav';

interface WatchCardProps {
  readonly series: Series;
  readonly index: number;
  readonly favorite: boolean;
  readonly onOpen: (series: Series) => void;
  readonly onToggleFavorite: (series: Series) => void;
}

function WatchCard({
  series,
  index,
  favorite,
  onOpen,
  onToggleFavorite,
}: WatchCardProps): React.JSX.Element {
  const { t } = useI18n();
  const image = series.wide || series.poster;
  const style = {
    animationDelay: `${String(Math.min((index % 9) * 40, 320))}ms`,
    '--cardc': animeColor(series.id + series.title),
  } as CSSProperties;

  const onHeart = (event: MouseEvent): void => {
    event.stopPropagation();
    onToggleFavorite(series);
  };

  return (
    <div className="wcard" style={style}>
      <div
        className="ccard-frame wcard-frame"
        role="button"
        tabIndex={0}
        onClick={() => onOpen(series)}
      >
        {image ? (
          <img className="ccard-img" src={image} alt="" loading="lazy" />
        ) : (
          <div className="wcard-noimg">{series.title}</div>
        )}
        <div className="ccard-shade" />
        <span className="ccard-play">
          <Icon name="play" size={16} />
        </span>
        <button
          className={`wcard-fav${favorite ? ' is-on' : ''}`}
          title={t(favorite ? 'wl.unfav' : 'wl.fav')}
          aria-pressed={favorite}
          onClick={onHeart}
        >
          <Icon name="heart" size={15} solid={favorite} />
        </button>
      </div>
      <button className="wcard-cap" onClick={() => onOpen(series)}>
        <p className="pcard-title">{series.title}</p>
        <div className="wcard-langs">
          {series.dub && <Chip tone="line">VF</Chip>}
          {series.sub && <Chip tone="line">VOSTFR</Chip>}
        </div>
      </button>
    </div>
  );
}

export function WatchlistPage(): React.JSX.Element {
  const { go } = useRouter();
  const { t, lang } = useI18n();
  const [tab, setTab] = useState<Tab>('recent');

  const recentState = useAsync(() => getWatchHistory(48), [lang]);
  const favoritesState = useAsync(() => getWatchlist(48), [lang]);

  // Watchlist (= favorites) membership, with optimistic heart toggles.
  const [favIds, setFavIds] = useState<ReadonlySet<string>>(new Set());
  useEffect(() => {
    setFavIds(new Set((favoritesState.data ?? []).map((series) => series.id)));
  }, [favoritesState.data]);

  const toggleFavorite = (series: Series): void => {
    const isFav = favIds.has(series.id);
    const next = new Set(favIds);
    if (isFav) {
      next.delete(series.id);
    } else {
      next.add(series.id);
    }
    setFavIds(next); // optimistic
    const op = isFav ? removeFromWatchlist(series.id) : addToWatchlist(series.id);
    void op.then((ok) => {
      if (!ok) {
        setFavIds((current) => {
          const reverted = new Set(current);
          if (isFav) {
            reverted.add(series.id);
          } else {
            reverted.delete(series.id);
          }
          return reverted;
        });
      }
    });
  };

  const openDetail = (series: Series): void => go({ page: 'detail', seriesId: series.id });

  const recent = recentState.data ?? [];
  const favorites = (favoritesState.data ?? []).filter((series) => favIds.has(series.id));
  const active = tab === 'fav' ? favorites : recent;
  const loading = tab === 'fav' ? favoritesState.loading : recentState.loading;

  const tabs: ReadonlyArray<{ id: Tab; label: string; count: number }> = [
    { id: 'recent', label: lang === 'en' ? 'Recent' : 'Récent', count: recent.length },
    { id: 'fav', label: t('wl.favorites'), count: favorites.length },
  ];

  return (
    <div className="page-pad" data-screen-label="Watchlist">
      <div className="page-head">
        <h1 className="page-title">{t('wl.title')}</h1>
        <p className="page-sub">{t('wl.count', { n: favorites.length })}</p>
      </div>

      <div className="filters">
        {tabs.map((entry) => (
          <button
            key={entry.id}
            className={`season-tab${tab === entry.id ? ' is-active' : ''}`}
            onClick={() => setTab(entry.id)}
          >
            {entry.label}
            {entry.count > 0 && <span className="filter-count">{entry.count}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="wl-grid">
          {Array.from({ length: 9 }).map((_, index) => (
            <div
              key={index}
              className="sk-ccard"
              style={{ animationDelay: `${String(index * 60)}ms` }}
            >
              <div className="sk sk-thumb" />
              <div className="sk sk-line" />
            </div>
          ))}
        </div>
      ) : active.length === 0 ? (
        <EmptyState title={t('wl.empty')} detail={t('section.genres.sub')} />
      ) : (
        <div className="wl-grid">
          {active.map((series, index) => (
            <WatchCard
              key={series.id}
              series={series}
              index={index}
              favorite={favIds.has(series.id)}
              onOpen={openDetail}
              onToggleFavorite={toggleFavorite}
            />
          ))}
        </div>
      )}
    </div>
  );
}

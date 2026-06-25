import { useEffect, useState, type CSSProperties, type MouseEvent } from 'react';
import type { Series } from '@core/models/content';
import { getWatchHistory, getWatchlist } from '@core/api/client';
import { useAsync } from '@app/hooks/useAsync';
import { useRouter } from '@app/router';
import { useI18n } from '@app/i18n/i18n';
import { animeColor } from '@app/lib/anime-color';
import { seedWatchlist, toggleWatchlist, useWatchlist } from '@app/lib/watchlist';
import { Icon } from '@app/components/Icon';
import { Chip } from '@app/components/Chip';
import { EmptyState } from '@app/components/StateViews';

/** Fetch the whole watchlist (the account can have hundreds of entries). */
const FAVORITES_LIMIT = 400;

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
  const favoritesState = useAsync(() => getWatchlist(FAVORITES_LIMIT), [lang]);

  // Shared watchlist membership (also drives the bookmark on every card). Seed
  // it from the full fetch so hearts are correct immediately.
  const { ids: favIds, loaded: favLoaded } = useWatchlist();
  useEffect(() => {
    if (favoritesState.data) {
      seedWatchlist(favoritesState.data.map((series) => series.id));
    }
  }, [favoritesState.data]);

  const toggleFavorite = (series: Series): void => {
    void toggleWatchlist(series.id);
  };

  const openDetail = (series: Series): void => go({ page: 'detail', seriesId: series.id });

  const recent = recentState.data ?? [];
  const allFavorites = favoritesState.data ?? [];
  // Once membership is known, hide entries the user removed this session.
  const favorites = favLoaded
    ? allFavorites.filter((series) => favIds.has(series.id))
    : allFavorites;
  const active = tab === 'fav' ? favorites : recent;
  const loading = tab === 'fav' ? favoritesState.loading : recentState.loading;

  const tabs: ReadonlyArray<{ id: Tab; label: string; count: number }> = [
    { id: 'recent', label: t('wl.recent'), count: recent.length },
    { id: 'fav', label: t('wl.favorites'), count: favorites.length },
  ];

  return (
    <div className="page-pad" data-screen-label="Watchlist">
      <div className="page-head">
        <h1 className="page-title">{t('wl.title')}</h1>
        <p className="page-sub">{t('wl.count', { n: active.length })}</p>
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
        <EmptyState title={t(tab === 'fav' ? 'wl.emptyFav' : 'wl.empty')} detail={t('wl.browse')} />
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

import { useState, type CSSProperties, type MouseEvent } from 'react';
import type { Series } from '@core/models/content';
import { getObjects, getWatchlist } from '@core/api/client';
import { useAsync } from '@app/hooks/useAsync';
import { useRouter } from '@app/router';
import { useI18n } from '@app/i18n/i18n';
import { animeColor } from '@app/lib/anime-color';
import { useFavorite, useFavoriteIds } from '@app/lib/favorites';
import { Icon } from '@app/components/Icon';
import { Chip } from '@app/components/Chip';
import { EmptyState } from '@app/components/StateViews';

type Filter = 'all' | 'fav';

function WatchCard({
  series,
  index,
  onOpen,
}: {
  readonly series: Series;
  readonly index: number;
  readonly onOpen: (series: Series) => void;
}): React.JSX.Element {
  const { t } = useI18n();
  const [favorite, toggle] = useFavorite(series.id);
  const style = {
    animationDelay: `${String(Math.min((index % 9) * 40, 320))}ms`,
    '--cardc': animeColor(series.id + series.title),
  } as CSSProperties;

  const onHeart = (event: MouseEvent): void => {
    event.stopPropagation();
    toggle();
  };

  return (
    <div className="wcard" style={style}>
      <div
        className="ccard-frame wcard-frame"
        role="button"
        tabIndex={0}
        onClick={() => onOpen(series)}
      >
        <img className="ccard-img" src={series.wide || series.poster} alt="" loading="lazy" />
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
  const [filter, setFilter] = useState<Filter>('all');
  const favoriteIds = useFavoriteIds();

  const watchlistState = useAsync(() => getWatchlist(48), [lang]);
  const watchlist = watchlistState.data ?? [];

  // Favorites not already present in the watchlist are fetched separately.
  const watchlistIds = new Set(watchlist.map((series) => series.id));
  const missingFavIds = favoriteIds.filter((id) => !watchlistIds.has(id)).join(',');
  const favOnlyState = useAsync(
    () => (missingFavIds ? getObjects(missingFavIds.split(',')) : Promise.resolve<Series[]>([])),
    [missingFavIds, lang],
  );

  const openDetail = (series: Series): void => go({ page: 'detail', seriesId: series.id });

  const favorites = [...watchlist, ...(favOnlyState.data ?? [])].filter((series) =>
    favoriteIds.includes(series.id),
  );
  const shown = filter === 'fav' ? favorites : watchlist;

  const tabs: ReadonlyArray<{ id: Filter; key: string; count: number }> = [
    { id: 'all', key: 'wl.all', count: watchlist.length },
    { id: 'fav', key: 'wl.favorites', count: favorites.length },
  ];

  return (
    <div className="page-pad" data-screen-label="Watchlist">
      <div className="page-head">
        <h1 className="page-title">{t('wl.title')}</h1>
        <p className="page-sub">{t('wl.count', { n: watchlist.length })}</p>
      </div>

      <div className="filters">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`season-tab${filter === tab.id ? ' is-active' : ''}`}
            onClick={() => setFilter(tab.id)}
          >
            {t(tab.key)}
            {tab.count > 0 && <span className="filter-count">{tab.count}</span>}
          </button>
        ))}
      </div>

      {watchlistState.loading ? (
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
      ) : shown.length === 0 ? (
        <EmptyState title={t('wl.empty')} detail={t('section.genres.sub')} />
      ) : (
        <div className="wl-grid">
          {shown.map((series, index) => (
            <WatchCard key={series.id} series={series} index={index} onOpen={openDetail} />
          ))}
        </div>
      )}
    </div>
  );
}

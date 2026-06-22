import type { CSSProperties } from 'react';
import type { Series } from '@core/models/content';
import { getObjects, getWatchlist } from '@core/api/client';
import { useAsync } from '@app/hooks/useAsync';
import { useRouter } from '@app/router';
import { useI18n } from '@app/i18n/i18n';
import { useFavoriteIds } from '@app/lib/favorites';
import { useProfile } from '@app/profile';
import { Icon, type IconName } from '@app/components/Icon';
import { PosterCard } from '@app/components/PosterCard';

function dedupe(series: readonly Series[]): Series[] {
  const seen = new Set<string>();
  const out: Series[] = [];
  for (const item of series) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      out.push(item);
    }
  }
  return out;
}

export function SettingsPage(): React.JSX.Element {
  const { go } = useRouter();
  const { t, lang } = useI18n();
  const { profile, stats: watch } = useProfile();
  const favoriteIds = useFavoriteIds();
  const favKey = favoriteIds.join(',');

  const watchlistState = useAsync(() => getWatchlist(60), [lang]);
  const favState = useAsync(
    () => (favKey ? getObjects(favKey.split(',')) : Promise.resolve<Series[]>([])),
    [favKey, lang],
  );

  const watchlist = watchlistState.data ?? [];
  const favorites = favState.data ?? [];
  const pool = dedupe([...watchlist, ...favorites]);

  const vf = pool.filter((series) => series.dub).length;
  const vostfr = pool.filter((series) => series.sub && !series.dub).length;
  const total = vf + vostfr || 1;
  const vfPct = Math.round((vf / total) * 100);

  const numberLocale = lang === 'fr' ? 'fr-FR' : 'en-US';
  const fmt = (value: number): string => value.toLocaleString(numberLocale);
  const backdrop = favorites[0]?.wide || watchlist[0]?.wide || '';

  const stats: ReadonlyArray<{ icon: IconName; value: number; label: string }> = [
    { icon: 'play', value: watch?.episodes ?? 0, label: t('set.stat.eps') },
    { icon: 'clock', value: watch?.hours ?? 0, label: t('set.stat.hours') },
    { icon: 'heart', value: favoriteIds.length, label: t('set.stat.favs') },
    { icon: 'film', value: watchlist.length, label: t('set.stat.series') },
  ];

  return (
    <div className="page-pad" data-screen-label="Profil">
      <div className="set-profile">
        <div className="set-profile-bg">{backdrop && <img src={backdrop} alt="" />}</div>
        <span className="set-avatar">
          {profile?.avatarUrl ? (
            <img src={profile.avatarUrl} alt="" />
          ) : (
            <Icon name="user" size={34} />
          )}
        </span>
        <div className="set-id">
          <h1 className="set-name">{profile?.username || t('menu.user')}</h1>
          <div className="set-id-row">
            <span className="set-prem">
              <Icon name="star" size={12} solid /> {t('menu.premium')}
            </span>
          </div>
        </div>
        <button
          className="btn btn-glass set-watchlist-btn"
          onClick={() => go({ page: 'watchlist' })}
        >
          <Icon name="bookmark" size={16} /> {t('set.seeWatchlist')}
        </button>
      </div>

      <section className="set-section">
        <h2 className="set-h2">
          <span className="set-h2-tick" />
          {t('set.statsTitle')}
        </h2>
        <div className="set-grid">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className="set-stat set-stat-lg"
              style={{ animationDelay: `${String(index * 60)}ms` }}
            >
              <span className="set-stat-ic">
                <Icon name={stat.icon} size={20} solid={stat.icon === 'heart'} />
              </span>
              <span className="set-stat-val">{fmt(stat.value)}</span>
              <span className="set-stat-lbl">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {total > 1 && (
        <section className="set-section">
          <h2 className="set-h2">
            <span className="set-h2-tick" />
            {t('set.breakdownTitle')}
          </h2>
          <div className="set-bar-card">
            <div className="set-bar">
              <div className="set-bar-vf" style={{ width: `${String(vfPct)}%` } as CSSProperties} />
              <div
                className="set-bar-sub"
                style={{ width: `${String(100 - vfPct)}%` } as CSSProperties}
              />
            </div>
            <div className="set-bar-legend">
              <span className="set-leg">
                <i className="set-dot set-dot-vf" />
                {t('set.vf')} · {fmt(vf)} ({vfPct}%)
              </span>
              <span className="set-leg">
                <i className="set-dot set-dot-sub" />
                {t('set.vostfr')} · {fmt(vostfr)} ({100 - vfPct}%)
              </span>
            </div>
          </div>
        </section>
      )}

      {favorites.length > 0 && (
        <section className="set-section">
          <h2 className="set-h2">
            <span className="set-h2-tick" />
            {t('set.favTitle')} <span className="set-h2-count">{favorites.length}</span>
          </h2>
          <div className="grid-cards">
            {favorites.map((series, index) => (
              <PosterCard
                key={series.id}
                anime={series}
                index={index % 12}
                onOpen={(item) => go({ page: 'detail', seriesId: item.id })}
                onPlay={(item) => go({ page: 'detail', seriesId: item.id })}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

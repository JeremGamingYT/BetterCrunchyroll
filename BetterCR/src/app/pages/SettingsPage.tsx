import { useState, type CSSProperties } from 'react';
import {
  getCrPreferences,
  getDetailedStats,
  getWatchHistory,
  getWatchlist,
  getWatchlistTotal,
  updateCrPreferences,
  type CrPreferences,
} from '@core/api/client';
import { fetchExternalMeta } from '@core/providers';
import { retryAsync } from '@shared/async';
import { useAsync } from '@app/hooks/useAsync';
import { useRouter } from '@app/router';
import { useI18n } from '@app/i18n/i18n';
import { useProfile } from '@app/profile';
import { ACCENT_OPTIONS, useTweaks } from '@app/tweaks/useTweaks';
import { Icon, type IconName } from '@app/components/Icon';
import { PosterCard } from '@app/components/PosterCard';

const STATS_RETRIES = 8;
const STATS_RETRY_MS = 1500;

/** Languages offered for the real Crunchyroll audio/subtitle preferences. */
const LANG_OPTIONS: ReadonlyArray<{ code: string; label: string }> = [
  { code: 'ja-JP', label: '日本語' },
  { code: 'en-US', label: 'English' },
  { code: 'fr-FR', label: 'Français' },
  { code: 'es-419', label: 'Español (LatAm)' },
  { code: 'es-ES', label: 'Español (España)' },
  { code: 'pt-BR', label: 'Português (Brasil)' },
  { code: 'de-DE', label: 'Deutsch' },
  { code: 'it-IT', label: 'Italiano' },
  { code: 'ar-SA', label: 'العربية' },
  { code: 'ru-RU', label: 'Русский' },
  { code: 'hi-IN', label: 'हिन्दी' },
];

export function SettingsPage(): React.JSX.Element {
  const { go } = useRouter();
  const { t, lang, setLang } = useI18n();
  const { profile } = useProfile();
  const { tweaks, setTweak } = useTweaks();

  // Real Crunchyroll account preferences (audio/subtitle language).
  const crState = useAsync(() => getCrPreferences(), []);
  const [crOverride, setCrOverride] = useState<Partial<CrPreferences>>({});
  const audioLang = crOverride.audioLanguage ?? crState.data?.audioLanguage ?? '';
  const subLang = crOverride.subtitleLanguage ?? crState.data?.subtitleLanguage ?? '';
  const saveCr = (key: keyof CrPreferences, value: string): void => {
    setCrOverride((prev) => ({ ...prev, [key]: value }));
    void updateCrPreferences({ [key]: value });
  };

  // Watch statistics from the account's history. Fetched here (rather than at
  // app start) and retried while empty so a cold token/account on first paint
  // no longer leaves the stats stuck at zero.
  const statsState = useAsync(
    () =>
      retryAsync(
        () => getDetailedStats(),
        STATS_RETRIES,
        STATS_RETRY_MS,
        (s) => s.episodes === 0,
      ),
    [lang],
  );
  // Favorites = the Crunchyroll watchlist; "recent" = watch history.
  const favoritesState = useAsync(() => getWatchlist(60), [lang]);
  const favoritesTotalState = useAsync(() => getWatchlistTotal(), [lang]);
  const recentState = useAsync(() => getWatchHistory(24), [lang]);

  const watch = statsState.data;
  const favorites = favoritesState.data ?? [];
  const favoritesTotal = favoritesTotalState.data ?? 0;
  const recent = recentState.data ?? [];
  const topSeries = watch?.topSeries ?? [];

  // Favourite genres: enrich the most-watched series (via the multi-API
  // provider chain) and tally their genres.
  const topKey = topSeries.map((series) => series.id).join(',');
  const genresState = useAsync(async () => {
    if (topSeries.length === 0) {
      return [] as ReadonlyArray<{ name: string; count: number }>;
    }
    const metas = await Promise.all(
      topSeries.slice(0, 8).map((series) => fetchExternalMeta(series.title).catch(() => null)),
    );
    const tally = new Map<string, number>();
    for (const meta of metas) {
      for (const genre of meta?.genres ?? []) {
        tally.set(genre, (tally.get(genre) ?? 0) + 1);
      }
    }
    return [...tally.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [topKey]);
  const genres = genresState.data ?? [];

  const vf = favorites.filter((series) => series.dub).length;
  const vostfr = favorites.filter((series) => series.sub && !series.dub).length;
  const total = vf + vostfr || 1;
  const vfPct = Math.round((vf / total) * 100);

  const numberLocale = lang === 'fr' ? 'fr-FR' : 'en-US';
  const fmt = (value: number): string => value.toLocaleString(numberLocale);
  const backdrop = recent[0]?.wide || favorites[0]?.wide || '';

  const stats: ReadonlyArray<{
    icon: IconName;
    value: number;
    label: string;
    loading: boolean;
  }> = [
    {
      icon: 'play',
      value: watch?.episodes ?? 0,
      label: t('set.stat.eps'),
      loading: statsState.loading,
    },
    {
      icon: 'clock',
      value: watch?.hours ?? 0,
      label: t('set.stat.hours'),
      loading: statsState.loading,
    },
    {
      icon: 'chart',
      value: watch?.hoursThisMonth ?? 0,
      label: t('set.stat.month'),
      loading: statsState.loading,
    },
    {
      icon: 'flame',
      value: watch?.streak ?? 0,
      label: t('set.stat.streak'),
      loading: statsState.loading,
    },
    {
      icon: 'heart',
      value: favoritesTotal || favorites.length,
      label: t('set.stat.favs'),
      loading: favoritesTotalState.loading && favoritesState.loading,
    },
    {
      icon: 'film',
      value: watch?.series ?? recent.length,
      label: t('set.stat.series'),
      loading: statsState.loading && recentState.loading,
    },
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
          {t('set.prefs')}
        </h2>
        <div className="set-prefs">
          <div className="set-pref">
            <span className="set-pref-lbl">{t('set.uiLang')}</span>
            <div className="set-seg">
              <button
                className={`set-seg-btn${lang === 'fr' ? ' is-on' : ''}`}
                onClick={() => setLang('fr')}
              >
                Français
              </button>
              <button
                className={`set-seg-btn${lang === 'en' ? ' is-on' : ''}`}
                onClick={() => setLang('en')}
              >
                English
              </button>
            </div>
          </div>
          <div className="set-pref">
            <span className="set-pref-lbl">{t('set.accent')}</span>
            <div className="set-accents">
              {ACCENT_OPTIONS.map((color) => (
                <button
                  key={color}
                  className={`set-accent${tweaks.accent === color ? ' is-on' : ''}`}
                  style={{ background: color } as CSSProperties}
                  aria-label={color}
                  onClick={() => setTweak('accent', color)}
                />
              ))}
            </div>
          </div>
          <div className="set-pref">
            <span className="set-pref-lbl">{t('set.animations')}</span>
            <button
              className={`set-switch${tweaks.motion ? ' is-on' : ''}`}
              role="switch"
              aria-checked={tweaks.motion}
              onClick={() => setTweak('motion', !tweaks.motion)}
            >
              <i />
            </button>
          </div>
          <div className="set-pref">
            <span className="set-pref-lbl">{t('set.antiSpoiler')}</span>
            <button
              className={`set-switch${tweaks.hideSpoilers ? ' is-on' : ''}`}
              role="switch"
              aria-checked={tweaks.hideSpoilers}
              onClick={() => setTweak('hideSpoilers', !tweaks.hideSpoilers)}
            >
              <i />
            </button>
          </div>
        </div>
      </section>

      <section className="set-section">
        <h2 className="set-h2">
          <span className="set-h2-tick" />
          {t('set.crPrefs')}
        </h2>
        <div className="set-prefs">
          <div className="set-pref">
            <span className="set-pref-lbl">{t('set.audioLang')}</span>
            <select
              className="set-select"
              value={audioLang}
              onChange={(event) => saveCr('audioLanguage', event.target.value)}
            >
              {!LANG_OPTIONS.some((o) => o.code === audioLang) && (
                <option value={audioLang}>{audioLang || '—'}</option>
              )}
              {LANG_OPTIONS.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="set-pref">
            <span className="set-pref-lbl">{t('set.subLang')}</span>
            <select
              className="set-select"
              value={subLang}
              onChange={(event) => saveCr('subtitleLanguage', event.target.value)}
            >
              {!LANG_OPTIONS.some((o) => o.code === subLang) && (
                <option value={subLang}>{subLang || '—'}</option>
              )}
              {LANG_OPTIONS.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="set-pref-note">{t('set.crNote')}</p>
      </section>

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
              <span className="set-stat-val">
                {stat.loading && stat.value === 0 ? '…' : fmt(stat.value)}
              </span>
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

      {genres.length > 0 && (
        <section className="set-section">
          <h2 className="set-h2">
            <span className="set-h2-tick" />
            {t('set.genresTitle')}
          </h2>
          <div className="set-genres">
            {genres.map((genre) => (
              <span key={genre.name} className="set-genre">
                {genre.name}
                <i>{genre.count}</i>
              </span>
            ))}
          </div>
        </section>
      )}

      {topSeries.length > 0 && (
        <section className="set-section">
          <h2 className="set-h2">
            <span className="set-h2-tick" />
            {t('set.topTitle')}
          </h2>
          <div className="set-top">
            {topSeries.map((series, index) => (
              <button
                key={series.id}
                className="set-top-row"
                onClick={() => go({ page: 'detail', seriesId: series.id })}
              >
                <span className="set-top-rank">{index + 1}</span>
                <span className="set-top-title">{series.title}</span>
                <span className="set-top-count">{t('common.epShort', { n: series.count })}</span>
              </button>
            ))}
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

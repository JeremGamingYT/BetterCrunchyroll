import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { Series } from '@core/models/content';
import { browseSeries, getCategories, type BrowseOptions } from '@core/api/client';
import { useAsync } from '@app/hooks/useAsync';
import { useRouter } from '@app/router';
import { useI18n } from '@app/i18n/i18n';
import { PosterCard } from '@app/components/PosterCard';
import { Icon } from '@app/components/Icon';

const PAGE_SIZE = 36;
const SEASONS = ['winter', 'spring', 'summer', 'fall'] as const;
type Season = (typeof SEASONS)[number];
type SortKey = 'popularity' | 'newly_added' | 'alphabetical';

interface Filters {
  readonly q: string;
  readonly genre: string;
  readonly season: Season | '';
  readonly year: string;
  readonly type: 'series' | 'movie_listing';
  readonly vf: boolean;
  readonly vostfr: boolean;
  readonly sort: SortKey;
}

const EMPTY: Filters = {
  q: '',
  genre: '',
  season: '',
  year: '',
  type: 'series',
  vf: false,
  vostfr: false,
  sort: 'popularity',
};

function toOptions(f: Filters, start: number): BrowseOptions {
  const options: BrowseOptions = { n: PAGE_SIZE, start, sort: f.sort, type: f.type };
  if (f.q.trim()) return { ...options, query: f.q.trim() };
  if (f.genre) Object.assign(options, { categories: f.genre });
  if (f.season && f.year) Object.assign(options, { seasonalTag: `${f.season}-${f.year}` });
  if (f.vf) Object.assign(options, { isDubbed: true });
  if (f.vostfr) Object.assign(options, { isSubbed: true });
  return options;
}

interface ResultState {
  readonly items: readonly Series[];
  readonly start: number;
  readonly done: boolean;
  readonly loading: boolean;
  readonly more: boolean;
}
const INITIAL: ResultState = { items: [], start: 0, done: false, loading: true, more: false };

export function SearchPage(): React.JSX.Element {
  const { go } = useRouter();
  const { t, lang } = useI18n();
  const genresState = useAsync(() => getCategories(), []);
  const genres = genresState.data ?? [];

  const [applied, setApplied] = useState<Filters>(EMPTY);
  const [draftQuery, setDraftQuery] = useState('');
  const [state, setState] = useState<ResultState>(INITIAL);

  const years = useMemo(() => {
    const now = new Date().getFullYear();
    return Array.from({ length: now - 2006 + 1 }, (_, i) => now - i);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setState(INITIAL);
    browseSeries(toOptions(applied, 0))
      .then((items) => {
        if (!cancelled) {
          setState({
            items,
            start: items.length,
            done: items.length < PAGE_SIZE,
            loading: false,
            more: false,
          });
        }
      })
      .catch(() => {
        if (!cancelled) setState({ ...INITIAL, loading: false, done: true });
      });
    return () => {
      cancelled = true;
    };
  }, [applied, lang]);

  const loadMore = (): void => {
    if (state.more || state.done) return;
    setState((prev) => ({ ...prev, more: true }));
    browseSeries(toOptions(applied, state.start))
      .then((batch) => {
        setState((prev) => ({
          ...prev,
          items: [...prev.items, ...batch],
          start: prev.start + batch.length,
          done: batch.length < PAGE_SIZE,
          more: false,
        }));
      })
      .catch(() => setState((prev) => ({ ...prev, more: false })));
  };

  const set = <K extends keyof Filters>(key: K, value: Filters[K]): void =>
    setApplied((prev) => ({ ...prev, [key]: value }));
  const submitQuery = (event: FormEvent): void => {
    event.preventDefault();
    set('q', draftQuery);
  };
  const reset = (): void => {
    setDraftQuery('');
    setApplied(EMPTY);
  };

  const openDetail = (series: Series): void => go({ page: 'detail', seriesId: series.id });
  const seasonLabel = (s: Season): string => t(`search.season.${s}`);

  return (
    <div className="page-pad" data-screen-label="Recherche">
      <div className="page-head">
        <h1 className="page-title">{t('search.title')}</h1>
        <p className="page-sub">{t('search.sub')}</p>
      </div>

      <form className="srch-bar" onSubmit={submitQuery}>
        <span className="srch-input">
          <Icon name="search" size={18} />
          <input
            value={draftQuery}
            placeholder={t('search.placeholder')}
            onChange={(event) => setDraftQuery(event.target.value)}
          />
        </span>
        <button className="btn btn-acc" type="submit">
          {t('search.go')}
        </button>
      </form>

      <div className="srch-filters">
        <label className="sf">
          <span>{t('search.f.type')}</span>
          <select
            value={applied.type}
            onChange={(e) => set('type', e.target.value as Filters['type'])}
          >
            <option value="series">{t('search.type.series')}</option>
            <option value="movie_listing">{t('search.type.movies')}</option>
          </select>
        </label>
        <label className="sf">
          <span>{t('search.f.genre')}</span>
          <select value={applied.genre} onChange={(e) => set('genre', e.target.value)}>
            <option value="">{t('search.any')}</option>
            {genres.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
        </label>
        <label className="sf">
          <span>{t('search.f.season')}</span>
          <select
            value={applied.season}
            onChange={(e) => set('season', e.target.value as Filters['season'])}
          >
            <option value="">{t('search.any')}</option>
            {SEASONS.map((s) => (
              <option key={s} value={s}>
                {seasonLabel(s)}
              </option>
            ))}
          </select>
        </label>
        <label className="sf">
          <span>{t('search.f.year')}</span>
          <select value={applied.year} onChange={(e) => set('year', e.target.value)}>
            <option value="">{t('search.any')}</option>
            {years.map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <label className="sf">
          <span>{t('search.f.sort')}</span>
          <select value={applied.sort} onChange={(e) => set('sort', e.target.value as SortKey)}>
            <option value="popularity">{t('search.sort.pop')}</option>
            <option value="newly_added">{t('search.sort.new')}</option>
            <option value="alphabetical">{t('search.sort.az')}</option>
          </select>
        </label>
        <button
          className={`srch-chip${applied.vf ? ' is-on' : ''}`}
          onClick={() => set('vf', !applied.vf)}
        >
          VF
        </button>
        <button
          className={`srch-chip${applied.vostfr ? ' is-on' : ''}`}
          onClick={() => set('vostfr', !applied.vostfr)}
        >
          VOSTFR
        </button>
        <button className="srch-reset" onClick={reset}>
          {t('search.reset')}
        </button>
      </div>

      {state.loading ? (
        <div className="grid-cards">
          {Array.from({ length: 12 }).map((_, index) => (
            <div
              key={index}
              className="sk-pcard"
              style={{ animationDelay: `${String(index * 50)}ms` }}
            >
              <div className="sk sk-thumb" />
              <div className="sk sk-line" />
            </div>
          ))}
        </div>
      ) : state.items.length === 0 ? (
        <p className="srch-none">{t('search.none')}</p>
      ) : (
        <>
          <div className="grid-cards">
            {state.items.map((series, index) => (
              <PosterCard
                key={`${series.id}-${String(index)}`}
                anime={series}
                index={index % 12}
                onOpen={openDetail}
                onPlay={openDetail}
              />
            ))}
          </div>
          {!state.done && (
            <div className="grid-more">
              <button className="btn btn-glass" onClick={loadMore} disabled={state.more}>
                {state.more ? '…' : t('search.more')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

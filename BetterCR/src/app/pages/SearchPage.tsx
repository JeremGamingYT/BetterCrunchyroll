import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { Series } from '@core/models/content';
import { browseSeries, getCategories, type BrowseOptions } from '@core/api/client';
import { useAsync } from '@app/hooks/useAsync';
import { useRouter } from '@app/router';
import { useI18n } from '@app/i18n/i18n';
import { PosterCard } from '@app/components/PosterCard';
import { Icon } from '@app/components/Icon';
import { Dropdown, type DropdownOption } from '@app/components/Dropdown';

const PAGE_SIZE = 36;
const SEASONS = ['winter', 'spring', 'summer', 'fall'] as const;
type Season = (typeof SEASONS)[number];
type SortKey = 'popularity' | 'newly_added' | 'alphabetical';
type AudioFilter = 'all' | 'dub' | 'sub';

interface Filters {
  readonly q: string;
  readonly genre: string;
  readonly season: Season | '';
  readonly year: string;
  readonly type: 'series' | 'movie_listing';
  readonly audio: AudioFilter;
  readonly sort: SortKey;
}

const EMPTY: Filters = {
  q: '',
  genre: '',
  season: '',
  year: '',
  type: 'series',
  audio: 'all',
  sort: 'popularity',
};

function toOptions(f: Filters, start: number): BrowseOptions {
  const options: BrowseOptions = { n: PAGE_SIZE, start, sort: f.sort, type: f.type };
  if (f.q.trim()) return { ...options, query: f.q.trim() };
  if (f.genre) Object.assign(options, { categories: f.genre });
  if (f.season && f.year) Object.assign(options, { seasonalTag: `${f.season}-${f.year}` });
  if (f.audio === 'dub') Object.assign(options, { isDubbed: true });
  if (f.audio === 'sub') Object.assign(options, { isSubbed: true });
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

  const typeOptions: ReadonlyArray<DropdownOption<Filters['type']>> = [
    { value: 'series', label: t('search.type.series') },
    { value: 'movie_listing', label: t('search.type.movies') },
  ];
  const genreOptions: ReadonlyArray<DropdownOption<string>> = [
    { value: '', label: t('search.any') },
    ...genres.map((g) => ({ value: g.id, label: g.title })),
  ];
  const seasonOptions: ReadonlyArray<DropdownOption<Filters['season']>> = [
    { value: '', label: t('search.any') },
    ...SEASONS.map((s) => ({ value: s, label: seasonLabel(s) })),
  ];
  const yearOptions: ReadonlyArray<DropdownOption<string>> = [
    { value: '', label: t('search.any') },
    ...years.map((y) => ({ value: String(y), label: String(y) })),
  ];
  const sortOptions: ReadonlyArray<DropdownOption<SortKey>> = [
    { value: 'popularity', label: t('search.sort.pop') },
    { value: 'newly_added', label: t('search.sort.new') },
    { value: 'alphabetical', label: t('search.sort.az') },
  ];
  const audioOptions: ReadonlyArray<DropdownOption<AudioFilter>> = [
    { value: 'all', label: t('search.any') },
    { value: 'dub', label: t('set.vf') },
    { value: 'sub', label: t('set.vostfr') },
  ];

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
          <Dropdown
            className="dd-block"
            value={applied.type}
            options={typeOptions}
            onChange={(v) => set('type', v)}
          />
        </label>
        <label className="sf">
          <span>{t('search.f.genre')}</span>
          <Dropdown
            className="dd-block"
            value={applied.genre}
            options={genreOptions}
            onChange={(v) => set('genre', v)}
          />
        </label>
        <label className="sf">
          <span>{t('search.f.season')}</span>
          <Dropdown
            className="dd-block"
            value={applied.season}
            options={seasonOptions}
            onChange={(v) => set('season', v)}
          />
        </label>
        <label className="sf">
          <span>{t('search.f.year')}</span>
          <Dropdown
            className="dd-block"
            value={applied.year}
            options={yearOptions}
            onChange={(v) => set('year', v)}
          />
        </label>
        <label className="sf">
          <span>{t('search.f.sort')}</span>
          <Dropdown
            className="dd-block"
            value={applied.sort}
            options={sortOptions}
            onChange={(v) => set('sort', v)}
          />
        </label>
        <label className="sf">
          <span>{t('search.f.audio')}</span>
          <Dropdown
            className="dd-block"
            value={applied.audio}
            options={audioOptions}
            onChange={(v) => set('audio', v)}
          />
        </label>
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

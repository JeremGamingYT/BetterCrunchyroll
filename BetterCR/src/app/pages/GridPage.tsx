import { useEffect, useState } from 'react';
import type { Series } from '@core/models/content';
import { browseSeries, getSimulcast, type BrowseOptions } from '@core/api/client';
import { useRouter } from '@app/router';
import { useI18n } from '@app/i18n/i18n';
import { PosterCard } from '@app/components/PosterCard';
import { ErrorState } from '@app/components/StateViews';

export type GridVariant = 'series' | 'films' | 'simulcast';

const PAGE_SIZE = 36;

interface GridConfig {
  readonly titleKey: string;
  readonly subKey: string;
  readonly browse: BrowseOptions;
}

const CONFIG: Record<GridVariant, GridConfig> = {
  series: {
    titleKey: 'grid.series.title',
    subKey: 'grid.series.sub',
    browse: { sort: 'popularity' },
  },
  films: {
    titleKey: 'grid.films.title',
    subKey: 'grid.films.sub',
    browse: { type: 'movie_listing', sort: 'popularity' },
  },
  simulcast: {
    titleKey: 'grid.simulcast.title',
    subKey: 'grid.simulcast.sub',
    browse: { sort: 'newly_added' },
  },
};

interface GridState {
  readonly items: readonly Series[];
  readonly start: number;
  readonly done: boolean;
  readonly loading: boolean;
  readonly loadingMore: boolean;
  readonly error: string | null;
}

const INITIAL: GridState = {
  items: [],
  start: 0,
  done: false,
  loading: true,
  loadingMore: false,
  error: null,
};

export interface GridPageProps {
  readonly variant: GridVariant;
}

export function GridPage({ variant }: GridPageProps): React.JSX.Element {
  const { go } = useRouter();
  const { t, lang } = useI18n();
  const config = CONFIG[variant];
  const paginated = variant !== 'simulcast';
  const [state, setState] = useState<GridState>(INITIAL);

  const fetchPage = (start: number): Promise<Series[]> =>
    paginated ? browseSeries({ ...config.browse, n: PAGE_SIZE, start }) : getSimulcast(48);

  // Initial load + reset whenever the variant or language changes.
  useEffect(() => {
    let cancelled = false;
    setState(INITIAL);
    fetchPage(0)
      .then((batch) => {
        if (!cancelled) {
          setState({
            items: batch,
            start: batch.length,
            done: !paginated || batch.length < PAGE_SIZE,
            loading: false,
            loadingMore: false,
            error: null,
          });
        }
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setState({
            ...INITIAL,
            loading: false,
            error: reason instanceof Error ? reason.message : String(reason),
          });
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant, lang]);

  const loadMore = (): void => {
    if (state.loadingMore || state.done) {
      return;
    }
    const start = state.start;
    setState((prev) => ({ ...prev, loadingMore: true }));
    fetchPage(start)
      .then((batch) => {
        setState((prev) => ({
          ...prev,
          items: [...prev.items, ...batch],
          start: prev.start + batch.length,
          done: batch.length < PAGE_SIZE,
          loadingMore: false,
        }));
      })
      .catch(() => setState((prev) => ({ ...prev, loadingMore: false })));
  };

  const openDetail = (series: Series): void => go({ page: 'detail', seriesId: series.id });
  const loadMoreLabel = lang === 'en' ? 'Load more' : 'Charger plus';

  return (
    <div className="page-pad" data-screen-label={t(config.titleKey)}>
      <div className="page-head">
        <h1 className="page-title">{t(config.titleKey)}</h1>
        <p className="page-sub">{t(config.subKey)}</p>
      </div>

      {state.error ? (
        <ErrorState message={state.error} />
      ) : state.loading ? (
        <div className="grid-cards">
          {Array.from({ length: 12 }).map((_, index) => (
            <div
              key={index}
              className="sk-pcard"
              style={{ animationDelay: `${String(index * 60)}ms` }}
            >
              <div className="sk sk-thumb" />
              <div className="sk sk-line" />
              <div className="sk sk-line sk-short" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid-cards">
            {state.items.map((series, index) => (
              <PosterCard
                key={`${series.id}-${String(index)}`}
                anime={series}
                index={index % 12}
                showAiring={variant === 'simulcast'}
                onOpen={openDetail}
                onPlay={openDetail}
              />
            ))}
          </div>
          {paginated && !state.done && state.items.length > 0 && (
            <div className="grid-more">
              <button className="btn btn-glass" onClick={loadMore} disabled={state.loadingMore}>
                {state.loadingMore ? '…' : loadMoreLabel}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

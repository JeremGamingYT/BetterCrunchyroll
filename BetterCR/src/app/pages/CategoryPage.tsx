import { useEffect, useState } from 'react';
import type { Series } from '@core/models/content';
import { browseSeries } from '@core/api/client';
import { useRouter } from '@app/router';
import { useI18n } from '@app/i18n/i18n';
import { PosterCard } from '@app/components/PosterCard';
import { ErrorState } from '@app/components/StateViews';

const PAGE_SIZE = 36;

interface PageState {
  readonly items: readonly Series[];
  readonly start: number;
  readonly done: boolean;
  readonly loading: boolean;
  readonly loadingMore: boolean;
  readonly error: string | null;
}

const INITIAL: PageState = {
  items: [],
  start: 0,
  done: false,
  loading: true,
  loadingMore: false,
  error: null,
};

function titleFromSlug(slug: string): string {
  return slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export interface CategoryPageProps {
  readonly categoryId: string;
  readonly title?: string;
}

export function CategoryPage({ categoryId, title }: CategoryPageProps): React.JSX.Element {
  const { go } = useRouter();
  const { lang } = useI18n();
  const [state, setState] = useState<PageState>(INITIAL);

  const fetchPage = (start: number): Promise<Series[]> =>
    browseSeries({ categories: categoryId, sort: 'popularity', n: PAGE_SIZE, start });

  useEffect(() => {
    let cancelled = false;
    setState(INITIAL);
    fetchPage(0)
      .then((batch) => {
        if (!cancelled) {
          setState({
            items: batch,
            start: batch.length,
            done: batch.length < PAGE_SIZE,
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
  }, [categoryId, lang]);

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
  const heading = title || titleFromSlug(categoryId);
  const loadMoreLabel = lang === 'en' ? 'Load more' : 'Charger plus';

  return (
    <div className="page-pad" data-screen-label={heading}>
      <div className="page-head">
        <h1 className="page-title">{heading}</h1>
        <p className="page-sub">{lang === 'en' ? 'Browse the genre' : 'Parcourir le genre'}</p>
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
      ) : state.items.length === 0 ? (
        <ErrorState message={lang === 'en' ? 'Nothing in this genre.' : 'Rien dans ce genre.'} />
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

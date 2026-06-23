import type { DependencyList } from 'react';
import type { Series } from '@core/models/content';
import { browseSeries, getSimilar, getSimulcast, getWatchHistory } from '@core/api/client';
import { useAsync } from '@app/hooks/useAsync';
import { useRouter } from '@app/router';
import { useI18n } from '@app/i18n/i18n';
import { Row } from '@app/components/Row';
import { PosterCard } from '@app/components/PosterCard';
import { SkeletonRow } from '@app/components/Skeletons';

const SHORT_MAX_EPISODES = 13;

function useOpenDetail(): (series: Series) => void {
  const { go } = useRouter();
  return (series) => go({ page: 'detail', seriesId: series.id });
}

function PosterRow({
  title,
  sub,
  items,
  loading,
}: {
  title: string;
  sub?: string;
  items: readonly Series[];
  loading: boolean;
}): React.JSX.Element | null {
  const openDetail = useOpenDetail();
  if (loading) {
    return <SkeletonRow count={8} />;
  }
  if (items.length === 0) {
    return null;
  }
  return (
    <Row title={title} sub={sub}>
      {items.map((series, index) => (
        <PosterCard
          key={series.id}
          anime={series}
          index={index}
          onOpen={openDetail}
          onPlay={openDetail}
        />
      ))}
    </Row>
  );
}

function DiscoverRow({
  title,
  sub,
  loader,
  deps,
}: {
  title: string;
  sub?: string;
  loader: () => Promise<Series[]>;
  deps?: DependencyList;
}): React.JSX.Element | null {
  const { data, loading } = useAsync(loader, deps ?? []);
  return <PosterRow title={title} sub={sub} items={data ?? []} loading={loading} />;
}

/** "Parce que tu regardes X…" — similar to the most recently watched series. */
function BecauseRow(): React.JSX.Element | null {
  const { t } = useI18n();
  const { data, loading } = useAsync(async () => {
    const recent = await getWatchHistory(8);
    const basis = recent[0];
    if (!basis) {
      return { basis: null as Series | null, items: [] as Series[] };
    }
    const items = (await getSimilar(basis.id, 20)).filter((s) => s.id !== basis.id);
    return { basis, items };
  }, []);

  if (loading) {
    return <SkeletonRow count={8} />;
  }
  if (!data?.basis || data.items.length === 0) {
    return null;
  }
  return (
    <PosterRow
      title={t('disc.because', { title: data.basis.title })}
      items={data.items}
      loading={false}
    />
  );
}

export function DiscoverPage(): React.JSX.Element {
  const { t } = useI18n();

  return (
    <div className="page-pad" data-screen-label="Découvertes">
      <div className="page-head">
        <h1 className="page-title">{t('disc.title')}</h1>
        <p className="page-sub">{t('disc.sub')}</p>
      </div>

      <div className="rows disc-rows">
        <BecauseRow />
        <DiscoverRow
          title={t('disc.short')}
          sub={t('disc.short.sub')}
          loader={async () =>
            (await browseSeries({ sort: 'popularity', n: 60 }))
              .filter((s) => s.eps > 0 && s.eps <= SHORT_MAX_EPISODES)
              .slice(0, 18)
          }
        />
        <DiscoverRow
          title={t('disc.gems')}
          sub={t('disc.gems.sub')}
          loader={() => browseSeries({ sort: 'popularity', n: 24, start: 70 })}
        />
        <DiscoverRow
          title={t('disc.simulcast')}
          sub={t('disc.simulcast.sub')}
          loader={() => getSimulcast(20)}
        />
        <DiscoverRow
          title={t('disc.films')}
          sub={t('disc.films.sub')}
          loader={() => browseSeries({ type: 'movie_listing', sort: 'popularity', n: 20 })}
        />
      </div>
    </div>
  );
}

import { Fragment, useState } from 'react';
import type { Series } from '@core/models/content';
import { getHomeFeed } from '@core/api/client';
import { useAsync } from '@app/hooks/useAsync';
import { useRouter } from '@app/router';
import { useI18n } from '@app/i18n/i18n';
import { Hero } from '@app/components/Hero';
import { Row } from '@app/components/Row';
import { Top10Row } from '@app/components/Top10Row';
import { GenreSection } from '@app/components/GenreSection';
import { PosterCard } from '@app/components/PosterCard';
import { SkeletonHero, SkeletonRow } from '@app/components/Skeletons';
import { ErrorState } from '@app/components/StateViews';

const TOP10_COUNT = 10;
const GENRE_BACKDROPS = 8;

function HomeSkeleton(): React.JSX.Element {
  return (
    <div>
      <SkeletonHero />
      <div className="rows">
        <SkeletonRow count={9} />
        <SkeletonRow count={9} />
      </div>
    </div>
  );
}

export function HomePage(): React.JSX.Element {
  const { go } = useRouter();
  const { t, lang } = useI18n();
  const [retryKey, setRetryKey] = useState(0);
  const { data, error, loading } = useAsync(() => getHomeFeed(), [lang, retryKey]);

  const openDetail = (series: Series): void => go({ page: 'detail', seriesId: series.id });
  const retry = (): void => setRetryKey((key) => key + 1);

  if (loading) {
    return <HomeSkeleton />;
  }
  if (error || !data || data.rows.length === 0) {
    return (
      <ErrorState
        message={error ?? 'Catalogue momentanément indisponible. Réessayez.'}
        onRetry={retry}
      />
    );
  }

  const popular = data.rows.find((row) => row.id === 'popular')?.items ?? [];
  const top10 = popular.slice(0, TOP10_COUNT);
  const backdrops = popular.slice(0, GENRE_BACKDROPS).map((s) => s.wide || s.poster);

  return (
    <div data-screen-label="Accueil">
      {data.hero.length > 0 && <Hero items={data.hero} onOpen={openDetail} onPlay={openDetail} />}
      <div className="rows">
        {data.rows.map((row, index) => (
          <Fragment key={row.id}>
            <Row
              title={t(row.titleKey)}
              sub={row.subKey ? t(row.subKey) : undefined}
              onAll={() => go({ page: 'series' })}
            >
              {row.items.map((series, cardIndex) => (
                <PosterCard
                  key={series.id}
                  anime={series}
                  index={cardIndex}
                  onOpen={openDetail}
                  onPlay={openDetail}
                />
              ))}
            </Row>
            {index === 0 && top10.length >= 5 && <Top10Row items={top10} onOpen={openDetail} />}
            {index === 0 && (
              <GenreSection onPick={() => go({ page: 'series' })} backdrops={backdrops} />
            )}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

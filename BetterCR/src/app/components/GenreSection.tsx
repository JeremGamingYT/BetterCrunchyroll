import { type CSSProperties } from 'react';
import { getCategories } from '@core/api/client';
import { useAsync } from '@app/hooks/useAsync';
import { useRouter } from '@app/router';
import { useI18n } from '@app/i18n/i18n';
import { animeColor } from '@app/lib/anime-color';
import { Icon } from './Icon';

const MAX_DELAY_MS = 320;
const MAX_GENRES = 12;

export function GenreSection(): React.JSX.Element | null {
  const { t } = useI18n();
  const { go } = useRouter();
  const { data } = useAsync(() => getCategories(), []);
  const genres = (data ?? []).slice(0, MAX_GENRES);

  if (genres.length === 0) {
    return null;
  }

  return (
    <section className="row">
      <div className="row-head">
        <h2 className="row-title">{t('section.genres')}</h2>
      </div>
      <div className="genre-grid">
        {genres.map((genre, index) => {
          const style = {
            '--gc': animeColor(genre.id),
            animationDelay: `${String(Math.min(index * 40, MAX_DELAY_MS))}ms`,
          } as CSSProperties;
          return (
            <button
              key={genre.id}
              className="genre-card"
              style={style}
              onClick={() => go({ page: 'category', categoryId: genre.id, title: genre.title })}
            >
              {genre.image && <img src={genre.image} alt="" loading="lazy" />}
              <span className="genre-label">{genre.title}</span>
              <span className="genre-arrow">
                <Icon name="chevR" size={18} />
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

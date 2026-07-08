import { type CSSProperties } from 'react';
import type { Genre } from '@core/models/content';
import { getCategories, getCategoryPoster } from '@core/api/client';
import { useAsync } from '@app/hooks/useAsync';
import { useInView } from '@app/hooks/useInView';
import { useRouter } from '@app/router';
import { useI18n } from '@app/i18n/i18n';
import { animeColor } from '@app/lib/anime-color';
import { Icon } from './Icon';

const MAX_DELAY_MS = 320;
const MAX_GENRES = 12;

interface GenreCardProps {
  readonly genre: Genre;
  readonly index: number;
  readonly onOpen: (genre: Genre) => void;
}

/**
 * A single genre tile. Loads a representative poster (the most popular title
 * actually tagged with the genre) once scrolled into view, so the artwork
 * always matches the genre — never an unrelated show.
 */
function GenreCard({ genre, index, onOpen }: GenreCardProps): React.JSX.Element {
  const [ref, inView] = useInView<HTMLButtonElement>();
  const { data: poster } = useAsync(
    () => (inView ? getCategoryPoster(genre.id) : Promise.resolve('')),
    [genre.id, inView],
  );
  const image = poster || '';
  const style = {
    '--gc': animeColor(genre.id),
    animationDelay: `${String(Math.min(index * 40, MAX_DELAY_MS))}ms`,
  } as CSSProperties;

  return (
    <button ref={ref} className="genre-card" style={style} onClick={() => onOpen(genre)}>
      {image && <img src={image} alt="" loading="lazy" decoding="async" />}
      <span className="genre-label">{genre.title}</span>
      <span className="genre-arrow">
        <Icon name="chevR" size={18} />
      </span>
    </button>
  );
}

export function GenreSection(): React.JSX.Element | null {
  const { t } = useI18n();
  const { go } = useRouter();
  const { data } = useAsync(() => getCategories(), []);
  const genres = (data ?? []).slice(0, MAX_GENRES);

  if (genres.length === 0) {
    return null;
  }

  const openGenre = (genre: Genre): void =>
    go({ page: 'category', categoryId: genre.id, title: genre.title });

  return (
    <section className="row">
      <div className="row-head">
        <h2 className="row-title">{t('section.genres')}</h2>
      </div>
      <div className="genre-grid">
        {genres.map((genre, index) => (
          <GenreCard key={genre.id} genre={genre} index={index} onOpen={openGenre} />
        ))}
      </div>
    </section>
  );
}

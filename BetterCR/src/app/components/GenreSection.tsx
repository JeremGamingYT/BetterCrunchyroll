import { type CSSProperties } from 'react';
import { useI18n } from '@app/i18n/i18n';
import { Icon } from './Icon';

const MAX_DELAY_MS = 320;

const GENRES: ReadonlyArray<{ key: string; color: string }> = [
  { key: 'genre.action', color: '#e0556b' },
  { key: 'genre.romance', color: '#e070a8' },
  { key: 'genre.fantasy', color: '#8a6fe0' },
  { key: 'genre.comedy', color: '#e0a13f' },
  { key: 'genre.scifi', color: '#3f9fe0' },
  { key: 'genre.slice', color: '#3fc08a' },
  { key: 'genre.adventure', color: '#e07a3f' },
  { key: 'genre.drama', color: '#6f86e0' },
];

export interface GenreSectionProps {
  readonly onPick: () => void;
  /** Optional backdrop images (one per genre card) for visual variety. */
  readonly backdrops?: readonly string[];
}

export function GenreSection({ onPick, backdrops = [] }: GenreSectionProps): React.JSX.Element {
  const { t } = useI18n();
  return (
    <section className="row">
      <div className="row-head">
        <h2 className="row-title">{t('section.genres')}</h2>
      </div>
      <div className="genre-grid">
        {GENRES.map((genre, index) => {
          const image = backdrops[index];
          const style = {
            '--gc': genre.color,
            animationDelay: `${String(Math.min(index * 40, MAX_DELAY_MS))}ms`,
          } as CSSProperties;
          return (
            <button key={genre.key} className="genre-card" style={style} onClick={onPick}>
              {image && <img src={image} alt="" loading="lazy" />}
              <span className="genre-label">{t(genre.key)}</span>
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

import { type CSSProperties } from 'react';
import type { Series } from '@core/models/content';
import { animeColor } from '@app/lib/anime-color';
import { useI18n } from '@app/i18n/i18n';

const MAX_DELAY_MS = 360;
const LAST_INDEX = 9;

export interface Top10RowProps {
  readonly items: readonly Series[];
  readonly onOpen: (series: Series) => void;
}

export function Top10Row({ items, onOpen }: Top10RowProps): React.JSX.Element {
  const { t } = useI18n();
  return (
    <section className="row">
      <div className="row-head">
        <h2 className="row-title">{t('row.top10')}</h2>
      </div>
      <div className="t10-scroll scrollbar-none">
        {items.map((series, index) => {
          const meta = [
            series.year > 0 ? String(series.year) : '',
            series.eps > 0 ? t('common.epShort', { n: series.eps }) : '',
          ]
            .filter(Boolean)
            .join(' · ');
          const style = {
            animationDelay: `${String(Math.min(index * 45, MAX_DELAY_MS))}ms`,
            '--cardc': animeColor(series.id + series.title),
          } as CSSProperties;
          return (
            <div
              key={series.id}
              className={`t10card${index === LAST_INDEX ? ' is-ten' : ''}`}
              style={style}
            >
              <span className="t10-rank">{index + 1}</span>
              <div className="t10-poster">
                <button
                  className="pcard-hit"
                  onClick={() => onOpen(series)}
                  aria-label={series.title}
                >
                  <div className="pcard-frame">
                    <img className="pcard-img" src={series.poster} alt="" loading="lazy" />
                    <div className="pcard-shade" />
                    <div className="t10-veil">
                      <p className="t10-title">{series.title}</p>
                      {meta && <p className="t10-meta">{meta}</p>}
                    </div>
                  </div>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

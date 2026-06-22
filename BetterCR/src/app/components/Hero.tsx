import { useEffect, useState, type CSSProperties } from 'react';
import type { Series } from '@core/models/content';
import { useI18n } from '@app/i18n/i18n';
import { Icon } from './Icon';
import { Chip } from './Chip';

const ADVANCE_MS = 9000;

export interface HeroProps {
  readonly items: readonly Series[];
  readonly onOpen: (series: Series) => void;
  readonly onPlay: (series: Series) => void;
}

export function Hero({ items, onOpen, onPlay }: HeroProps): React.JSX.Element | null {
  const { t } = useI18n();
  const [index, setIndex] = useState(0);
  const count = items.length;

  useEffect(() => {
    if (count <= 1) {
      return undefined;
    }
    const timer = window.setTimeout(() => setIndex((i) => (i + 1) % count), ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [index, count]);

  if (count === 0) {
    return null;
  }
  const slide = items[index] ?? items[0];
  if (!slide) {
    return null;
  }
  const move = (delta: number): void => setIndex((i) => (i + delta + count) % count);

  return (
    <div className="hero" data-screen-label="Hero">
      {items.map((item, i) => (
        <div key={item.id} className={`hero-bg${i === index ? ' is-active' : ''}`}>
          <img src={item.wideXL || item.wide || item.poster} alt="" className="hero-img" />
        </div>
      ))}
      <div className="hero-grad" />
      <div className="hero-grad-side" />

      <div className="hero-content" key={slide.id}>
        <span className="hero-kicker">
          <i className="dot" /> {t('common.featured')} · {t('common.selection')}
        </span>
        <h1 className="hero-title">{slide.title}</h1>
        <div className="hero-meta">
          {slide.rating && <Chip tone="line">{slide.rating}</Chip>}
          {slide.year > 0 && <span>{slide.year}</span>}
          {slide.eps > 0 && <span>{t('common.episodes', { n: slide.eps })}</span>}
          {slide.dub && <Chip tone="line">VF</Chip>}
          {slide.sub && <Chip tone="line">VOSTFR</Chip>}
        </div>
        <p className="hero-desc">{slide.desc}</p>
        <div className="hero-cta">
          <button className="btn btn-acc" onClick={() => onPlay(slide)}>
            <Icon name="play" size={18} /> {t('common.watch')}
          </button>
          <button className="btn btn-glass" onClick={() => onOpen(slide)}>
            <Icon name="info" size={18} /> {t('common.moreInfo')}
          </button>
          <button className="btn btn-icon" aria-label="Ajouter à la watchlist">
            <Icon name="plus" size={18} />
          </button>
        </div>
      </div>

      <div className="hero-foot">
        <button className="hero-nav" onClick={() => move(-1)} aria-label="Précédent">
          <Icon name="chevL" size={18} />
        </button>
        <div className="hero-dots">
          {items.map((item, i) => (
            <button
              key={item.id}
              className={`hero-dot${i === index ? ' is-active' : ''}`}
              onClick={() => setIndex(i)}
              aria-label={item.title}
            >
              <span
                className="hero-dot-fill"
                style={
                  i === index
                    ? ({ animationDuration: `${ADVANCE_MS}ms` } as CSSProperties)
                    : undefined
                }
              />
            </button>
          ))}
        </div>
        <button className="hero-nav" onClick={() => move(1)} aria-label="Suivant">
          <Icon name="chevR" size={18} />
        </button>
      </div>
    </div>
  );
}

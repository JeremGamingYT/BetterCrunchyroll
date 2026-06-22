import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useI18n } from '@app/i18n/i18n';
import { Icon } from './Icon';

const EDGE_THRESHOLD_PX = 12;
const NUDGE_RATIO = 0.82;

export interface RowProps {
  readonly title: string;
  readonly sub?: string;
  readonly children: ReactNode;
  readonly onAll?: () => void;
}

export function Row({ title, sub, children, onAll }: RowProps): React.JSX.Element {
  const { t } = useI18n();
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [edges, setEdges] = useState({ left: false, right: true });

  const update = useCallback(() => {
    const element = scrollerRef.current;
    if (!element) {
      return;
    }
    setEdges({
      left: element.scrollLeft > EDGE_THRESHOLD_PX,
      right: element.scrollLeft < element.scrollWidth - element.clientWidth - EDGE_THRESHOLD_PX,
    });
  }, []);

  useEffect(() => {
    update();
  }, [children, update]);

  const nudge = (direction: number): void => {
    const element = scrollerRef.current;
    if (element) {
      element.scrollBy({ left: direction * element.clientWidth * NUDGE_RATIO, behavior: 'smooth' });
    }
  };

  return (
    <section className="row">
      <div className="row-head">
        <div className="row-headings">
          <h2 className="row-title">{title}</h2>
          {sub && <p className="row-sub">{sub}</p>}
        </div>
        {onAll && (
          <button className="row-all" onClick={onAll}>
            {t('common.seeAll')} <Icon name="chevR" size={14} />
          </button>
        )}
      </div>
      <div className="row-body">
        <button
          className={`row-arrow row-arrow-l${edges.left ? ' is-on' : ''}`}
          onClick={() => nudge(-1)}
          aria-label="Précédent"
        >
          <Icon name="chevL" size={20} />
        </button>
        <button
          className={`row-arrow row-arrow-r${edges.right ? ' is-on' : ''}`}
          onClick={() => nudge(1)}
          aria-label="Suivant"
        >
          <Icon name="chevR" size={20} />
        </button>
        <div className={`row-fade row-fade-l${edges.left ? ' is-on' : ''}`} />
        <div className={`row-fade row-fade-r${edges.right ? ' is-on' : ''}`} />
        <div className="row-scroll scrollbar-none" ref={scrollerRef} onScroll={update}>
          {children}
        </div>
      </div>
    </section>
  );
}

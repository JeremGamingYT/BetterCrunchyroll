import { type CSSProperties } from 'react';
import type { ContinueItem } from '@core/models/content';
import { animeColor } from '@app/lib/anime-color';
import { useI18n } from '@app/i18n/i18n';
import { Icon } from './Icon';

const MAX_DELAY_MS = 360;

export interface ContinueCardProps {
  readonly item: ContinueItem;
  readonly index?: number;
  readonly onPlay?: (item: ContinueItem) => void;
}

export function ContinueCard({ item, index = 0, onPlay }: ContinueCardProps): React.JSX.Element {
  const { t } = useI18n();
  const remain = Math.max(1, Math.round((item.durMin * (100 - item.progress)) / 100));
  const style = {
    animationDelay: `${String(Math.min(index * 45, MAX_DELAY_MS))}ms`,
    '--cardc': animeColor(item.seriesId + item.seriesTitle),
  } as CSSProperties;

  return (
    <div className="ccard" style={style}>
      <button className="ccard-hit" onClick={() => onPlay?.(item)}>
        <div className="ccard-frame">
          <img className="ccard-img" src={item.thumb} alt="" loading="lazy" />
          <div className="ccard-shade" />
          <span className="ccard-play">
            <Icon name="play" size={18} />
          </span>
          <span className="ccard-remain">
            <Icon name="clock" size={11} /> {t('common.minLeft', { n: remain })}
          </span>
        </div>
        <div className="ccard-cap">
          <p className="pcard-title">{item.seriesTitle}</p>
          <p className="pcard-meta">
            S{item.seasonNum || 1} E{item.epNum} · {item.epTitle}
          </p>
          <p className="prog-text">
            <span className="prog-pct">{item.progress} %</span> · {t('common.left', { n: remain })}
          </p>
        </div>
      </button>
    </div>
  );
}

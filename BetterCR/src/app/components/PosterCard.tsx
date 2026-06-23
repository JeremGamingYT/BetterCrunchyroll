import { type CSSProperties, type MouseEvent } from 'react';
import type { Series } from '@core/models/content';
import { animeColor } from '@app/lib/anime-color';
import { useWatchlist, toggleWatchlist } from '@app/lib/watchlist';
import { Icon } from './Icon';
import { Chip } from './Chip';

const MAX_DELAY_MS = 360;

export interface PosterCardProps {
  readonly anime: Series;
  readonly index?: number;
  readonly onOpen?: (anime: Series) => void;
  readonly onPlay?: (anime: Series) => void;
  readonly showNew?: boolean;
  readonly showAiring?: boolean;
}

export function PosterCard({
  anime,
  index = 0,
  onOpen,
  onPlay,
  showNew = false,
  showAiring = false,
}: PosterCardProps): React.JSX.Element {
  const { ids } = useWatchlist();
  const marked = ids.has(anime.id);

  const meta: string[] = [];
  if (anime.year) {
    meta.push(String(anime.year));
  }
  if (anime.eps) {
    meta.push(`${String(anime.eps)} ép.`);
  }

  const style = {
    animationDelay: `${String(Math.min(index * 45, MAX_DELAY_MS))}ms`,
    '--cardc': animeColor(anime.id + anime.title),
  } as CSSProperties;

  const play = (event: MouseEvent): void => {
    event.stopPropagation();
    onPlay?.(anime);
  };
  const toggleMark = (event: MouseEvent): void => {
    event.stopPropagation();
    void toggleWatchlist(anime.id);
  };

  return (
    <div className="pcard" style={style}>
      <button className="pcard-hit" onClick={() => onOpen?.(anime)} aria-label={anime.title}>
        <div className="pcard-frame">
          <img className="pcard-img" src={anime.poster} alt="" loading="lazy" />
          <div className="pcard-shade" />
          {showNew && <span className="flag flag-new">NOUVEAU</span>}
          {showAiring && anime.simulcast && (
            <span className="flag flag-air">
              <i className="dot" />
              SIMULCAST
            </span>
          )}
          <div className="pcard-veil">
            <div className="pcard-actions">
              <span className="round-btn round-acc" onClick={play}>
                <Icon name="play" size={16} />
              </span>
              <span className={`round-btn${marked ? ' is-on' : ''}`} onClick={toggleMark}>
                <Icon name={marked ? 'check' : 'bookmark'} size={15} solid={marked} />
              </span>
            </div>
            <div className="pcard-langs">
              {anime.dub && <Chip tone="line">VF</Chip>}
              {anime.sub && <Chip tone="line">VOSTFR</Chip>}
            </div>
          </div>
        </div>
        <div className="pcard-cap">
          <p className="pcard-title">{anime.title}</p>
          <p className="pcard-meta">{meta.join(' · ')}</p>
        </div>
      </button>
    </div>
  );
}

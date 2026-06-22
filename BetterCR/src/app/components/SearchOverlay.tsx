import { useEffect, useRef, useState } from 'react';
import type { Series } from '@core/models/content';
import { browseSeries } from '@core/api/client';
import { useRouter } from '@app/router';
import { useI18n } from '@app/i18n/i18n';
import { Icon } from './Icon';
import { PosterCard } from './PosterCard';

const DEBOUNCE_MS = 300;
const POPULAR_TAGS = ['Jujutsu Kaisen', 'One Piece', 'Demon Slayer', 'Frieren', 'Solo Leveling'];

export interface SearchOverlayProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

export function SearchOverlay({ open, onClose }: SearchOverlayProps): React.JSX.Element {
  const { go } = useRouter();
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Series[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      const timer = window.setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [open]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    if (open) {
      document.addEventListener('keydown', onKey);
    }
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setSearching(false);
      return undefined;
    }
    setSearching(true);
    let cancelled = false;
    const timer = window.setTimeout(() => {
      browseSeries({ query: trimmed, n: 16 })
        .then((found) => {
          if (!cancelled) {
            setResults(found);
            setSearching(false);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setResults([]);
            setSearching(false);
          }
        });
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const openSeries = (series: Series): void => {
    onClose();
    go({ page: 'detail', seriesId: series.id });
  };

  return (
    <div className={`search-ov${open ? ' is-open' : ''}`} role="dialog" aria-hidden={!open}>
      <div className="search-top">
        <div className="search-box">
          <Icon name="search" size={20} className="search-glyph" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('search.placeholder')}
            className="search-input"
          />
          {query && (
            <button className="hdr-icon" onClick={() => setQuery('')}>
              <Icon name="x" size={16} />
            </button>
          )}
        </div>
        <button className="search-close" onClick={onClose}>
          <Icon name="x" size={20} />
        </button>
      </div>
      <div className="search-body scrollbar-none">
        {!query.trim() && (
          <div className="search-hint">
            <p className="search-hint-title">{t('search.popular')}</p>
            <div className="search-tags">
              {POPULAR_TAGS.map((tag) => (
                <button key={tag} className="chip chip-btn" onClick={() => setQuery(tag)}>
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}
        {query.trim() && !searching && results.length === 0 && (
          <p className="search-empty">{t('search.noresult', { q: query })}</p>
        )}
        <div className="search-grid">
          {results.map((series, index) => (
            <PosterCard
              key={series.id}
              anime={series}
              index={index}
              onOpen={openSeries}
              onPlay={openSeries}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

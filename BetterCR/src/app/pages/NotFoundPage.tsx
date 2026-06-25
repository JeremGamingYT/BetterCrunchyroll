import { useState } from 'react';
import { browseSeries } from '@core/api/client';
import { useAsync } from '@app/hooks/useAsync';
import { useRouter } from '@app/router';
import { useI18n } from '@app/i18n/i18n';
import { Icon } from '@app/components/Icon';

const NF_GIFS = [
  'https://media.giphy.com/media/edGzBC6GDOhutW32ps/giphy.gif',
  'https://media.giphy.com/media/uNzGan0eVgvmZfH6H5/giphy.gif',
  'https://media.giphy.com/media/Y4vg6chFftvP2/giphy.gif',
];

export function NotFoundPage(): React.JSX.Element {
  const { go } = useRouter();
  const { t, lang } = useI18n();
  const [gifIndex, setGifIndex] = useState(0);
  const [gifDead, setGifDead] = useState(false);
  const { data } = useAsync(() => browseSeries({ sort: 'popularity', n: 6 }), [lang]);
  const picks = (data ?? []).slice(0, 5);

  const onGifError = (): void => {
    if (gifIndex < NF_GIFS.length - 1) {
      setGifIndex(gifIndex + 1);
    } else {
      setGifDead(true);
    }
  };

  return (
    <div className="nf" data-screen-label="404">
      <div className="nf-in">
        <div className="nf-gifwrap">
          {!gifDead && (
            <img
              className="nf-gif"
              src={NF_GIFS[gifIndex]}
              alt={t('nf.gifalt')}
              onError={onGifError}
            />
          )}
          <div className="nf-gif-fallback" style={{ display: gifDead ? 'grid' : 'none' }}>
            <span style={{ fontSize: 30 }}>(╯°□°)╯</span>
            <span>// anime_reaction.gif</span>
          </div>
          <span className="nf-gif-tag">404 · NANI?!</span>
        </div>
        <div className="nf-text">
          <div className="nf-code">{t('nf.code')}</div>
          <h1 className="nf-title">{t('nf.title')}</h1>
          <p className="nf-desc">{t('nf.desc')}</p>
          <div className="nf-cta">
            <button className="btn btn-acc" onClick={() => go({ page: 'home' })}>
              <Icon name="home" size={17} /> {t('nf.home')}
            </button>
            <button className="btn btn-glass" onClick={() => go({ page: 'search' })}>
              <Icon name="search" size={17} /> {t('nf.search')}
            </button>
          </div>
          <div className="nf-suggest">
            <p className="nf-suggest-h">{t('nf.suggest')}</p>
            <div className="nf-chips">
              {picks.map((series) => (
                <button
                  key={series.id}
                  className="chip chip-btn"
                  onClick={() => go({ page: 'detail', seriesId: series.id })}
                >
                  {series.title}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

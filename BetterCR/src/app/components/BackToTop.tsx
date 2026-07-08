import { useEffect, useState } from 'react';
import { useI18n } from '@app/i18n/i18n';
import { Icon } from './Icon';

/** Scroll depth (px) after which the button appears. */
const SHOW_AFTER_PX = 900;

/**
 * Floating "back to top" button, bottom-right. Appears once the user has
 * scrolled past {@link SHOW_AFTER_PX} and smooth-scrolls home on click.
 * The handler only flips a boolean, so React re-renders solely on the
 * show/hide transitions — no throttling machinery needed.
 */
export function BackToTop(): React.JSX.Element {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = (): void => setVisible(window.scrollY > SHOW_AFTER_PX);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <button
      className={`totop${visible ? ' is-on' : ''}`}
      aria-label={t('common.backToTop')}
      title={t('common.backToTop')}
      tabIndex={visible ? 0 : -1}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
    >
      <Icon name="chevL" size={18} style={{ transform: 'rotate(90deg)' }} />
    </button>
  );
}

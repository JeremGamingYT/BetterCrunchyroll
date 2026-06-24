/**
 * In-overlay "update available" banner. Driven by {@link useUpdateNotice}
 * (which reads the background's cached GitHub release check). Clicking "update"
 * opens the releases page in a new tab via the content-script bridge.
 */
import { GITHUB_RELEASES_URL } from '@shared/config';
import { bridge } from '@core/api/transport';
import { useI18n } from '@app/i18n/i18n';
import { useUpdateNotice } from '@app/lib/updateCheck';
import { Icon } from './Icon';

export function UpdateBanner(): React.JSX.Element | null {
  const { t } = useI18n();
  const notice = useUpdateNotice();
  if (!notice) {
    return null;
  }
  return (
    <div className="bcr-update-toast" role="status">
      <Icon name="sparkle" size={18} />
      <span className="bcr-update-txt">{t('update.available', { v: notice.latest })}</span>
      <button
        className="btn btn-acc bcr-update-go"
        onClick={() => bridge.openExternal(GITHUB_RELEASES_URL)}
      >
        {t('update.get')}
      </button>
      <button className="bcr-update-x" onClick={notice.dismiss} aria-label={t('update.dismiss')}>
        <Icon name="x" size={16} />
      </button>
    </div>
  );
}

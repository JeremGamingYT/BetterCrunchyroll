import type { ReactNode } from 'react';
import { useI18n } from '@app/i18n/i18n';
import { Icon } from './Icon';

export interface MessageStateProps {
  readonly title: string;
  readonly detail?: string;
  readonly children?: ReactNode;
}

function CenteredState({ title, detail, children }: MessageStateProps): React.JSX.Element {
  return (
    <div className="state-view">
      <span className="hdr-wordmark state-mark">
        better<b>CR</b>
      </span>
      <p className="state-title">{title}</p>
      {detail && <p className="state-detail">{detail}</p>}
      {children}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  readonly message?: string;
  readonly onRetry?: () => void;
}): React.JSX.Element {
  const { t } = useI18n();
  return (
    <CenteredState title={t('state.errTitle')} detail={message}>
      <button className="btn btn-glass" onClick={onRetry ?? (() => window.location.reload())}>
        <Icon name="rew" size={16} /> {t('common.retry')}
      </button>
    </CenteredState>
  );
}

export function EmptyState({ title, detail }: MessageStateProps): React.JSX.Element {
  return <CenteredState title={title} detail={detail} />;
}

import type { ReactNode } from 'react';
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

export function ErrorState({ message }: { readonly message: string }): React.JSX.Element {
  return (
    <CenteredState title="Impossible de charger le contenu" detail={message}>
      <button className="btn btn-glass" onClick={() => window.location.reload()}>
        <Icon name="rew" size={16} /> Réessayer
      </button>
    </CenteredState>
  );
}

export function EmptyState({ title, detail }: MessageStateProps): React.JSX.Element {
  return <CenteredState title={title} detail={detail} />;
}

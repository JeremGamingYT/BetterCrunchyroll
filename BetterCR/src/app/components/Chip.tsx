import type { ReactNode } from 'react';

export interface ChipProps {
  readonly children: ReactNode;
  readonly tone?: 'ghost' | 'line' | 'acc' | 'btn';
  readonly className?: string;
}

export function Chip({ children, tone = 'ghost', className = '' }: ChipProps): React.JSX.Element {
  return <span className={`chip chip-${tone} ${className}`}>{children}</span>;
}

export interface ProgProps {
  readonly value: number;
  readonly slim?: boolean;
}

export function Prog({ value, slim = false }: ProgProps): React.JSX.Element {
  return (
    <div className={`prog${slim ? ' prog-slim' : ''}`}>
      <div className="prog-fill" style={{ width: `${String(value)}%` }} />
    </div>
  );
}

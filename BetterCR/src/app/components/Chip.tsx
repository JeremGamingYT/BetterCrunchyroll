import type { ReactNode } from 'react';

export interface ChipProps {
  readonly children: ReactNode;
  readonly tone?: 'ghost' | 'line' | 'acc' | 'btn';
  readonly className?: string;
}

export function Chip({ children, tone = 'ghost', className = '' }: ChipProps): React.JSX.Element {
  return <span className={`chip chip-${tone} ${className}`}>{children}</span>;
}

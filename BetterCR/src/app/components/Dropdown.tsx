import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Icon } from './Icon';

export interface DropdownOption<T extends string> {
  readonly value: T;
  readonly label: string;
  /** Optional short prefix rendered before the label (flag emoji, etc). */
  readonly icon?: string;
}

export interface DropdownProps<T extends string> {
  readonly value: T;
  readonly options: ReadonlyArray<DropdownOption<T>>;
  readonly onChange: (value: T) => void;
  readonly ariaLabel?: string;
  readonly className?: string;
  /** Horizontal anchor of the popover relative to the trigger. Default 'start'. */
  readonly align?: 'start' | 'end';
}

/** Rough per-row height used to decide whether the popover should open upward. */
const ROW_HEIGHT_PX = 38;
const LIST_PADDING_PX = 10;
const VIEWPORT_MARGIN_PX = 12;

/**
 * Custom-styled dropdown (button trigger + floating option list) used in place
 * of native `<select>` for anything themed dark — browsers render native
 * `<option>` popups with their own (usually white) chrome, which this app's
 * CSS can't reliably restyle, leaving light-on-white, near-illegible text.
 */
export function Dropdown<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  className,
  align = 'start',
}: DropdownProps<T>): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const current = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open) {
      return;
    }
    const close = (event: MouseEvent): void => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !rootRef.current) {
      return;
    }
    const rect = rootRef.current.getBoundingClientRect();
    const estimatedHeight = options.length * ROW_HEIGHT_PX + LIST_PADDING_PX;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    setDropUp(spaceBelow < estimatedHeight + VIEWPORT_MARGIN_PX && spaceAbove > spaceBelow);
  }, [open, options.length]);

  return (
    <div
      ref={rootRef}
      className={`dd${dropUp ? ' dd-up' : ''}${align === 'end' ? ' dd-end' : ''}${className ? ` ${className}` : ''}`}
    >
      <button
        type="button"
        className="dd-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((prev) => !prev)}
      >
        {current?.icon && <span className="dd-ic">{current.icon}</span>}
        <span className="dd-lbl">{current?.label}</span>
        <Icon name="chevD" size={14} className="dd-chev" />
      </button>
      {open && (
        <ul className="dd-list" role="listbox">
          {options.map((option) => (
            <li key={option.value} role="option" aria-selected={option.value === value}>
              <button
                type="button"
                className={`dd-opt${option.value === value ? ' is-sel' : ''}`}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                {option.icon && <span className="dd-ic">{option.icon}</span>}
                <span className="dd-lbl">{option.label}</span>
                {option.value === value && <Icon name="check" size={14} className="dd-check" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

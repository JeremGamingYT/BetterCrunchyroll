import { useCallback, useEffect, useState } from 'react';

export interface Tweaks {
  readonly accent: string;
  readonly cardWidth: number;
  readonly motion: boolean;
  /** Blur unwatched episode thumbnails/titles to avoid spoilers. */
  readonly hideSpoilers: boolean;
}

export const DEFAULT_TWEAKS: Tweaks = {
  accent: '#ff8133',
  cardWidth: 178,
  motion: true,
  hideSpoilers: true,
};

export const ACCENT_OPTIONS = ['#ff8133', '#f4b63f', '#ef4565', '#3fb6e8'] as const;

const STORAGE_KEY = 'bcr_tweaks';

function load(): Tweaks {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Tweaks>;
      return {
        accent: typeof parsed.accent === 'string' ? parsed.accent : DEFAULT_TWEAKS.accent,
        cardWidth:
          typeof parsed.cardWidth === 'number' ? parsed.cardWidth : DEFAULT_TWEAKS.cardWidth,
        motion: typeof parsed.motion === 'boolean' ? parsed.motion : DEFAULT_TWEAKS.motion,
        hideSpoilers:
          typeof parsed.hideSpoilers === 'boolean'
            ? parsed.hideSpoilers
            : DEFAULT_TWEAKS.hideSpoilers,
      };
    }
  } catch {
    // Fall through to defaults.
  }
  return DEFAULT_TWEAKS;
}

function save(tweaks: Tweaks): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tweaks));
  } catch {
    // Persistence is best-effort.
  }
}

export interface TweaksController {
  readonly tweaks: Tweaks;
  readonly setTweak: <K extends keyof Tweaks>(key: K, value: Tweaks[K]) => void;
}

/** Source of truth for the design tweaks; persists and applies CSS variables. */
export function useTweaks(): TweaksController {
  const [tweaks, setTweaks] = useState<Tweaks>(load);

  const setTweak = useCallback<TweaksController['setTweak']>((key, value) => {
    setTweaks((prev) => {
      const next = { ...prev, [key]: value };
      save(next);
      return next;
    });
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--acc', tweaks.accent);
    root.style.setProperty('--pw', `${String(tweaks.cardWidth)}px`);
    document.body.classList.toggle('no-motion', !tweaks.motion);
    document.body.classList.toggle('spoiler-guard', tweaks.hideSpoilers);
  }, [tweaks]);

  return { tweaks, setTweak };
}

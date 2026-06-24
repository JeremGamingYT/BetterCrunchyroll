/**
 * Appearance preferences (accent colour, animations, anti-spoiler), persisted
 * to localStorage and applied as CSS variables / body classes. Exposed as a
 * module-level store so any component (now the Settings page) can read and
 * update them without prop drilling. Card size is intentionally not adjustable.
 */
import { useSyncExternalStore } from 'react';
import { ACCENT_STORAGE_KEY } from '@shared/config';

export interface Tweaks {
  readonly accent: string;
  readonly motion: boolean;
  /** Blur unwatched episode thumbnails/titles to avoid spoilers. */
  readonly hideSpoilers: boolean;
}

export const DEFAULT_TWEAKS: Tweaks = {
  accent: '#ff8133',
  motion: true,
  hideSpoilers: true,
};

export const ACCENT_OPTIONS = ['#ff8133', '#f4b63f', '#ef4565', '#3fb6e8', '#8b5cf6'] as const;

const STORAGE_KEY = 'bcr_tweaks';

function load(): Tweaks {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Tweaks>;
      return {
        accent: typeof parsed.accent === 'string' ? parsed.accent : DEFAULT_TWEAKS.accent,
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

function apply(tweaks: Tweaks): void {
  if (!document.body) {
    document.addEventListener('DOMContentLoaded', () => apply(tweaks), { once: true });
    return;
  }
  document.documentElement.style.setProperty('--acc', tweaks.accent);
  document.body.classList.toggle('no-motion', !tweaks.motion);
  document.body.classList.toggle('spoiler-guard', tweaks.hideSpoilers);
  // Mirror the accent to chrome.storage so the content script can tint the
  // relocated native /watch player to match.
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      void chrome.storage.local.set({ [ACCENT_STORAGE_KEY]: tweaks.accent });
    }
  } catch {
    /* not in an extension context */
  }
}

let state: Tweaks = load();
apply(state);
const listeners = new Set<() => void>();

export interface TweaksController {
  readonly tweaks: Tweaks;
  readonly setTweak: <K extends keyof Tweaks>(key: K, value: Tweaks[K]) => void;
}

function setTweak<K extends keyof Tweaks>(key: K, value: Tweaks[K]): void {
  state = { ...state, [key]: value };
  save(state);
  apply(state);
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

const snapshot = (): Tweaks => state;

/** Source of truth for the appearance tweaks; persists and applies them. */
export function useTweaks(): TweaksController {
  const tweaks = useSyncExternalStore(subscribe, snapshot, snapshot);
  return { tweaks, setTweak };
}

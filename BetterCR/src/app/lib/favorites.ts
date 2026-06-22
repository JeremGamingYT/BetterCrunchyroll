import { useSyncExternalStore } from 'react';

/**
 * Local favorites store (series ids), persisted to localStorage and observable
 * by React via `useSyncExternalStore`. A cached array keeps snapshots stable so
 * the store can be subscribed to without re-render loops.
 */
const STORAGE_KEY = 'bcr_favs_v1';
const listeners = new Set<() => void>();

function readFromStorage(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === 'string');
      }
    }
  } catch {
    // Ignore — treated as empty.
  }
  return [];
}

let cache: string[] = readFromStorage();

function commit(next: string[]): void {
  cache = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Persistence is best-effort.
  }
  listeners.forEach((listener) => listener());
}

export const favorites = {
  all(): readonly string[] {
    return cache;
  },
  has(id: string): boolean {
    return cache.includes(id);
  },
  count(): number {
    return cache.length;
  },
  toggle(id: string): boolean {
    const next = cache.includes(id) ? cache.filter((item) => item !== id) : [...cache, id];
    commit(next);
    return next.includes(id);
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

/** Reactive `[isFavorite, toggle]` for a single series id. */
export function useFavorite(id: string): readonly [boolean, () => boolean] {
  const isFavorite = useSyncExternalStore(favorites.subscribe, () => favorites.has(id));
  return [isFavorite, () => favorites.toggle(id)] as const;
}

/** Reactive list of favorite ids (stable snapshot). */
export function useFavoriteIds(): readonly string[] {
  return useSyncExternalStore(favorites.subscribe, favorites.all);
}

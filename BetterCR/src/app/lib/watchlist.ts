/**
 * Shared Crunchyroll watchlist membership store.
 *
 * A single source of truth for "is this series in my watchlist", used by every
 * card's bookmark/heart toggle and the Watchlist page so they stay in sync. The
 * membership ids are loaded once (lazily) and mutations are optimistic, calling
 * the real CR API and reverting on failure.
 */
import { useSyncExternalStore } from 'react';
import { addToWatchlist, getWatchlistIds, removeFromWatchlist } from '@core/api/client';

interface WatchlistState {
  readonly ids: ReadonlySet<string>;
  readonly loaded: boolean;
}

let state: WatchlistState = { ids: new Set(), loaded: false };
let loadStarted = false;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

function setIds(ids: ReadonlySet<string>, loaded: boolean): void {
  state = { ids, loaded };
  emit();
}

function ensureLoaded(): void {
  if (loadStarted) {
    return;
  }
  loadStarted = true;
  void getWatchlistIds()
    .then((ids) => setIds(new Set(ids), true))
    .catch(() => {
      loadStarted = false;
    });
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  ensureLoaded();
  return () => {
    listeners.delete(callback);
  };
}

function getSnapshot(): WatchlistState {
  return state;
}

/** Reactive watchlist membership: `{ ids, loaded }`. */
export function useWatchlist(): WatchlistState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * Seeds membership from an already-fetched list (e.g. the Watchlist page's full
 * fetch) so cards reflect the right state immediately, without a second request.
 */
export function seedWatchlist(ids: readonly string[]): void {
  if (state.loaded) {
    return;
  }
  loadStarted = true;
  setIds(new Set(ids), true);
}

/** Optimistically toggles a series in the watchlist, reverting on failure. */
export async function toggleWatchlist(seriesId: string): Promise<void> {
  const isIn = state.ids.has(seriesId);
  const next = new Set(state.ids);
  if (isIn) {
    next.delete(seriesId);
  } else {
    next.add(seriesId);
  }
  setIds(next, true);

  const ok = isIn ? await removeFromWatchlist(seriesId) : await addToWatchlist(seriesId);
  if (!ok) {
    const reverted = new Set(state.ids);
    if (isIn) {
      reverted.add(seriesId);
    } else {
      reverted.delete(seriesId);
    }
    setIds(reverted, true);
  }
}

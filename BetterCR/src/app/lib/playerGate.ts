/**
 * Tiny global gate to temporarily hide the relocated native /watch player.
 *
 * The player floats above the overlay iframe, so anything that opens inside the
 * header (notifications panel, profile menu) would otherwise be covered by it.
 * Header overlays bump this gate while open; the WatchPage reports a null slot
 * (which hides the player) whenever the gate is raised.
 */
import { useSyncExternalStore } from 'react';

let count = 0;
const listeners = new Set<() => void>();
const emit = (): void => listeners.forEach((fn) => fn());

export function suppressPlayer(): void {
  count += 1;
  emit();
}

export function releasePlayer(): void {
  count = Math.max(0, count - 1);
  emit();
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

const snapshot = (): boolean => count > 0;

export function usePlayerSuppressed(): boolean {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

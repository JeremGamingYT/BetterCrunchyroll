/**
 * Personal, per-browser mute list: comments containing any of these words are
 * hidden locally (a private filter, on top of the server's profanity masking).
 * Backed by localStorage and exposed as an external store so the UI re-renders
 * when the list changes.
 */
import { useSyncExternalStore } from 'react';

const KEY = 'bcr_mutewords';
const listeners = new Set<() => void>();

function load(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((w): w is string => typeof w === 'string') : [];
  } catch {
    return [];
  }
}

let cache: readonly string[] = load();

function persist(next: readonly string[]): void {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  listeners.forEach((fn) => fn());
}

export function getMuteWords(): readonly string[] {
  return cache;
}

export function addMuteWord(word: string): void {
  const normalized = word.trim().toLowerCase();
  if (normalized && !cache.includes(normalized)) {
    persist([...cache, normalized]);
  }
}

export function removeMuteWord(word: string): void {
  persist(cache.filter((w) => w !== word));
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function useMuteWords(): readonly string[] {
  return useSyncExternalStore(subscribe, getMuteWords, getMuteWords);
}

/** Whether a comment's text matches any muted word (case-insensitive substring). */
export function isMuted(text: string, words: readonly string[]): boolean {
  if (words.length === 0) {
    return false;
  }
  const lower = text.toLowerCase();
  return words.some((w) => lower.includes(w));
}

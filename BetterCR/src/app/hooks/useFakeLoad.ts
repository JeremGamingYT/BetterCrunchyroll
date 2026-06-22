import { useEffect, useState } from 'react';

/** Tracks which page types have already shown their first-visit skeleton. */
const loadedOnce: Record<string, boolean> = {};

/** Returns `true` while a page type is "loading" on its first visit only. */
export function useFakeLoad(key: string, ms = 850): boolean {
  const [loading, setLoading] = useState(!loadedOnce[key]);

  useEffect(() => {
    if (loadedOnce[key]) {
      return;
    }
    const timer = window.setTimeout(() => {
      loadedOnce[key] = true;
      setLoading(false);
    }, ms);
    return () => clearTimeout(timer);
  }, [key, ms]);

  return loading;
}

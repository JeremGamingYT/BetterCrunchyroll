/**
 * In-app update notice. The background worker checks GitHub releases and caches
 * the latest tag in `chrome.storage.local` (UPDATE_STORAGE_KEY); the SPA runs in
 * an extension page so it can read that cache directly and surface a banner —
 * no extra network call from the app. Dismissals are remembered per version so
 * the banner doesn't nag once acknowledged.
 */
import { useCallback, useEffect, useState } from 'react';
import { UPDATE_STORAGE_KEY } from '@shared/config';
import { isNewer } from '@shared/version';

const DISMISS_KEY = 'bcr_update_dismissed';

function currentVersion(): string {
  try {
    return chrome.runtime.getManifest().version;
  } catch {
    return '0';
  }
}

function readDismissed(): string {
  try {
    return localStorage.getItem(DISMISS_KEY) ?? '';
  } catch {
    return '';
  }
}

export interface UpdateNotice {
  readonly latest: string;
  readonly dismiss: () => void;
}

/** Returns the pending-update notice, or null when up to date / dismissed. */
export function useUpdateNotice(): UpdateNotice | null {
  const [latest, setLatest] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<string>(readDismissed);

  useEffect(() => {
    let alive = true;
    const read = (): void => {
      try {
        chrome.storage.local.get(UPDATE_STORAGE_KEY, (result) => {
          if (!alive) {
            return;
          }
          const cached = result[UPDATE_STORAGE_KEY] as { latest?: string } | undefined;
          setLatest(typeof cached?.latest === 'string' ? cached.latest : null);
        });
      } catch {
        /* not an extension context */
      }
    };
    const onChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string,
    ): void => {
      if (area === 'local' && UPDATE_STORAGE_KEY in changes) {
        read();
      }
    };
    read();
    try {
      chrome.storage.onChanged.addListener(onChange);
    } catch {
      /* ignore */
    }
    return () => {
      alive = false;
      try {
        chrome.storage.onChanged.removeListener(onChange);
      } catch {
        /* ignore */
      }
    };
  }, []);

  const dismiss = useCallback(() => {
    if (!latest) {
      return;
    }
    try {
      localStorage.setItem(DISMISS_KEY, latest);
    } catch {
      /* ignore */
    }
    setDismissed(latest);
  }, [latest]);

  if (!latest || dismissed === latest || !isNewer(latest, currentVersion())) {
    return null;
  }
  return { latest, dismiss };
}

/**
 * Static, environment-independent configuration shared across all extension
 * contexts (page, content script, background, SPA).
 */

/** Crunchyroll content/auth API base. */
export const CR_API_BASE = 'https://www.crunchyroll.com' as const;

/** Default request locale / preferred audio language. */
export const CR_LOCALE = 'fr-FR' as const;

/** Path (inside the extension) of the redesigned SPA loaded in the overlay iframe. */
export const APP_PAGE_PATH = 'src/app/index.html' as const;

/** Margin subtracted from token expiry so refreshes happen before hard expiry. */
export const TOKEN_EXPIRY_MARGIN_MS = 30_000 as const;

/** Polling interval while waiting for the token. */
export const TOKEN_WAIT_INTERVAL_MS = 100 as const;

/** localStorage / chrome.storage key for the cached session token. */
export const TOKEN_STORAGE_KEY = 'bcr_token' as const;

/** chrome.storage.local key for the master on/off toggle (default: enabled). */
export const ENABLED_STORAGE_KEY = 'bcr_enabled' as const;

/** chrome.storage.local key mirroring the accent colour (so the content script
 *  can tint the relocated native /watch player to match the SPA's theme). */
export const ACCENT_STORAGE_KEY = 'bcr_accent' as const;

/** chrome.storage.local key caching the latest known release info. */
export const UPDATE_STORAGE_KEY = 'bcr_update' as const;

/** chrome.storage.local key caching the remote compatibility verdict (kill switch). */
export const HEALTH_STORAGE_KEY = 'bcr_health' as const;

/** GitHub repository + endpoints used by the update notifier. */
export const GITHUB_REPO = 'JeremGamingYT/BetterCrunchyroll' as const;
export const GITHUB_RELEASES_URL = `https://github.com/${GITHUB_REPO}/releases` as const;
export const GITHUB_LATEST_API =
  `https://api.github.com/repos/${GITHUB_REPO}/releases/latest` as const;

/**
 * Remote "compatibility kill switch" config, served from the repo root on the
 * `main` branch. The background worker polls it and caches the verdict; if
 * Crunchyroll ships a breaking change the maintainer flips `ok:false` here (or
 * raises `minVersion`) and every install steps aside for the native site. A
 * fetch failure is fail-open (the last known verdict stays), so an unreachable
 * GitHub never disables anyone. See `src/shared/health.ts`.
 */
export const HEALTH_REMOTE_URL =
  `https://raw.githubusercontent.com/${GITHUB_REPO}/main/health.json` as const;

/**
 * Base URL of the free BetterCR comments API (see `server/`). Leave empty to
 * hide the watch-page comments. After deploying `server/` to Vercel, set this
 * to e.g. `https://bettercr-comments.vercel.app/api/comments`.
 */
export const COMMENTS_API: string = 'https://better-crunchyroll.vercel.app/api/comments';

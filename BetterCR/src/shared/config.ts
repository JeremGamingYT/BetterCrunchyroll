/**
 * Static, environment-independent configuration shared across all extension
 * contexts (page, content script, background, SPA).
 */

/** Crunchyroll content/auth API base. `beta-api.crunchyroll.com` is equivalent. */
export const CR_API_BASE = 'https://www.crunchyroll.com' as const;

/** Crunchyroll playback service (DRM streams) — used only by the native player. */
export const CR_PLAY_BASE = 'https://cr-play-service.prd.crunchyrollsvc.com' as const;

/** Default request locale / preferred audio language. */
export const CR_LOCALE = 'fr-FR' as const;

/** Path (inside the extension) of the redesigned SPA loaded in the overlay iframe. */
export const APP_PAGE_PATH = 'src/app/index.html' as const;

/** Margin subtracted from token expiry so refreshes happen before hard expiry. */
export const TOKEN_EXPIRY_MARGIN_MS = 30_000 as const;

/** Maximum time the API layer waits for a token to appear before failing. */
export const TOKEN_WAIT_TIMEOUT_MS = 5_000 as const;

/** Polling interval while waiting for the token. */
export const TOKEN_WAIT_INTERVAL_MS = 100 as const;

/** localStorage / chrome.storage key for the cached session token. */
export const TOKEN_STORAGE_KEY = 'bcr_token' as const;

/**
 * Base URL of the free BetterCR comments API (see `server/`). Leave empty to
 * hide the watch-page comments. After deploying `server/` to Vercel, set this
 * to e.g. `https://bettercr-comments.vercel.app/api/comments`.
 */
export const COMMENTS_API: string = 'https://better-crunchyroll.vercel.app/api/comments';

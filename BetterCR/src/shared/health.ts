/**
 * Shared "compatibility kill switch" types + pure evaluation logic.
 *
 * BetterCR is a thin client layered over Crunchyroll. If Crunchyroll ships a
 * breaking change, the safe behaviour is to step aside and let the native site
 * show through — never to leave users staring at a broken overlay. Two
 * independent signals drive that pause:
 *   1. a REMOTE flag (`health.json` on the repo) the maintainer can flip, plus a
 *      minimum-version floor for forced updates — evaluated by this module;
 *   2. LOCAL self-detection of sustained Crunchyroll API failure — evaluated in
 *      the content script (see `content/health-monitor.ts`).
 *
 * This module is pure (no `chrome.*`, no DOM) so the same verdict logic is
 * shared by the background worker, the content script, and the popup.
 */
import { isNewer } from './version';

/** Why the redesign is paused (native Crunchyroll is shown instead). */
export type PauseReason = 'kill' | 'version' | 'self';

/** Localised, user-facing notice shown while paused. */
export interface PauseNotice {
  readonly fr?: string;
  readonly en?: string;
}

/** Shape of the remote `health.json`. Every field is optional / defensive. */
export interface RemoteHealth {
  /** An explicit `false` engages the kill switch everywhere; default healthy. */
  readonly ok: boolean;
  /** Installs strictly below this version are paused (forced update). */
  readonly minVersion?: string;
  readonly notice?: PauseNotice;
}

/** Verdict the background caches for the content script + popup to read. */
export interface HealthVerdict {
  readonly paused: boolean;
  readonly reason: PauseReason | null;
  readonly notice?: PauseNotice;
  /** Epoch ms of the evaluation. */
  readonly at: number;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function asNotice(value: unknown): PauseNotice | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }
  const fr = asString((value as { fr?: unknown }).fr);
  const en = asString((value as { en?: unknown }).en);
  if (!fr && !en) {
    return undefined;
  }
  return { ...(fr ? { fr } : {}), ...(en ? { en } : {}) };
}

/**
 * Defensively parses untrusted remote JSON into a {@link RemoteHealth}. Returns
 * null when the payload is not a usable object, so the caller keeps the last
 * known verdict — a malformed or truncated file must never silently disable the
 * extension for everyone.
 */
export function parseRemoteHealth(raw: unknown): RemoteHealth | null {
  if (typeof raw !== 'object' || raw === null) {
    return null;
  }
  // A missing `ok` reads as healthy; only an explicit `false` kills.
  const ok = (raw as { ok?: unknown }).ok !== false;
  const minVersion = asString((raw as { minVersion?: unknown }).minVersion);
  const notice = asNotice((raw as { notice?: unknown }).notice);
  return { ok, ...(minVersion ? { minVersion } : {}), ...(notice ? { notice } : {}) };
}

/** Evaluates the remote flag + version floor for the installed version. */
export function evaluateRemote(
  remote: RemoteHealth,
  currentVersion: string,
  at: number,
): HealthVerdict {
  const notice = remote.notice ? { notice: remote.notice } : {};
  if (!remote.ok) {
    return { paused: true, reason: 'kill', ...notice, at };
  }
  if (remote.minVersion && isNewer(remote.minVersion, currentVersion)) {
    return { paused: true, reason: 'version', ...notice, at };
  }
  return { paused: false, reason: null, at };
}

const DEFAULT_NOTICE: Record<'fr' | 'en', Record<PauseReason, string>> = {
  fr: {
    kill: 'BetterCR est en pause le temps d’une mise à jour de compatibilité. Le site Crunchyroll normal s’affiche en attendant.',
    version:
      'Une mise à jour de BetterCR est requise. Le site Crunchyroll normal s’affiche en attendant.',
    self: 'BetterCR a détecté un changement côté Crunchyroll et s’est mis en pause. Le site Crunchyroll normal s’affiche le temps d’un correctif.',
  },
  en: {
    kill: 'BetterCR is paused for a compatibility update. The normal Crunchyroll site is shown in the meantime.',
    version: 'A BetterCR update is required. The normal Crunchyroll site is shown in the meantime.',
    self: 'BetterCR detected a Crunchyroll change and paused itself. The normal Crunchyroll site is shown until a fix ships.',
  },
};

/** Picks the localised notice line, falling back to a built-in default. */
export function noticeText(
  notice: PauseNotice | undefined,
  reason: PauseReason,
  lang: 'fr' | 'en',
): string {
  const custom = lang === 'fr' ? (notice?.fr ?? notice?.en) : (notice?.en ?? notice?.fr);
  return custom ?? DEFAULT_NOTICE[lang][reason];
}

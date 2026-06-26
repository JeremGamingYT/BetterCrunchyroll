/**
 * Local, self-healing breakage detector for the content script.
 *
 * The content script proxies every Crunchyroll API call (and ONLY Crunchyroll —
 * comments/AniList/Kitsu are fetched directly by the SPA), so it is the natural
 * place to notice when Crunchyroll itself has broken. The bar for "broken" is
 * deliberately high and specific, to avoid the obvious false positive of one
 * failing feature looking like an outage:
 *
 *   - Only READ (GET) calls are scored. A failed mutation (add-to-watchlist,
 *     mark-watched, …) is a feature-level bug, never a reason to pause the whole
 *     redesign — so POST/PATCH/PUT/DELETE are ignored entirely.
 *   - Failures must be DIVERSE: at least N *distinct* read endpoints failing
 *     within a short window, with no read succeeding. One broken endpoint hit
 *     repeatedly (e.g. a user re-clicking a dead button) never trips it; a real
 *     Crunchyroll API change makes home/browse/objects/… all fail at once.
 *
 * It is fully RECOVERABLE: while paused it probes a known endpoint on a backoff
 * and restores the redesign the moment Crunchyroll answers. Nothing is
 * persisted — every reload starts fresh.
 */
import { performCrRequest } from './cr-api';
import type { HttpMethod } from '@shared/messages';

/** Distinct read endpoints that must fail (no read succeeding) before pausing. */
const DISTINCT_FAIL_THRESHOLD = 3;
/** Rolling window in which those distinct failures must occur. */
const WINDOW_MS = 30_000;
/** Don't trip unless this long has passed since the last read success (anti-blip). */
const MIN_SILENCE_MS = 12_000;
/** Hard cap on retained failure events (bounded memory). */
const MAX_EVENTS = 60;
/** First recovery-probe delay; doubles on each failed probe up to the cap. */
const RECOVERY_BASE_MS = 25_000;
const RECOVERY_MAX_MS = 150_000;
/**
 * Account-scoped endpoint used to test "Crunchyroll answers again". This is the
 * same profile endpoint the app already reads, so the probe exercises a path we
 * know exists rather than a guessed one.
 */
const PROBE_PATH = '/accounts/v1/me/profile';
/** Abort a hung probe so the backoff loop can never stall. */
const PROBE_TIMEOUT_MS = 8_000;

type TokenProvider = () => Promise<string | null>;

interface FailureEvent {
  readonly endpoint: string;
  readonly at: number;
}

function timeout(ms: number): Promise<never> {
  return new Promise((_resolve, reject) => {
    window.setTimeout(() => reject(new Error('probe timeout')), ms);
  });
}

/** True for path segments that look like an id (collapsed when keying endpoints). */
function isIdSegment(segment: string): boolean {
  return (
    segment.includes(',') || // comma-joined object ids
    /^G[A-Z0-9]{5,}$/i.test(segment) || // Crunchyroll content id
    /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(segment) || // uuid
    /^\d+$/.test(segment) || // numeric id
    (segment.length >= 9 && /\d/.test(segment)) // long mixed token
  );
}

/**
 * Reduces a request path to a stable "endpoint" key by dropping the query and
 * collapsing id-like segments, so per-item calls (`…/series/G123/`) count as one
 * endpoint. Errs toward collapsing (fewer distinct keys ⇒ harder to trip).
 */
function endpointKey(path: string): string {
  let pathname = path;
  try {
    if (/^https?:\/\//i.test(path)) {
      pathname = new URL(path).pathname;
    } else {
      pathname = path.split('?')[0] ?? path;
    }
  } catch {
    pathname = path;
  }
  return pathname
    .split('/')
    .map((segment) => (isIdSegment(segment) ? ':id' : segment))
    .join('/');
}

export class HealthMonitor {
  private failures: FailureEvent[] = [];
  private lastReadSuccessAt = Date.now();
  private broken = false;
  private recoverTimer = 0;
  private recoverDelay = RECOVERY_BASE_MS;
  private probing = false;

  /**
   * @param getToken  resolves the current session token (null when unavailable)
   * @param onChange  fired whenever the pause state flips (caller re-syncs the UI)
   */
  constructor(
    private readonly getToken: TokenProvider,
    private readonly onChange: () => void,
  ) {}

  /** True while a Crunchyroll-side breakage is suspected and the redesign is paused. */
  get selfBroken(): boolean {
    return this.broken;
  }

  /**
   * Records the outcome of one proxied Crunchyroll API call (token was present).
   * Only reads are scored; mutations are ignored so a single broken action can
   * never pause the redesign.
   */
  recordResult(ok: boolean, method: HttpMethod, path: string): void {
    if (method !== 'GET') {
      return;
    }
    if (ok) {
      this.lastReadSuccessAt = Date.now();
      this.failures = []; // a working read means Crunchyroll isn't down
      return;
    }
    this.failures.push({ endpoint: endpointKey(path), at: Date.now() });
    if (this.failures.length > MAX_EVENTS) {
      this.failures.shift();
    }
    this.evaluate();
  }

  /** Re-checks the failure window; also call periodically while traffic is quiet. */
  evaluate(): void {
    if (this.broken) {
      return;
    }
    const now = Date.now();
    this.failures = this.failures.filter((event) => now - event.at <= WINDOW_MS);
    if (now - this.lastReadSuccessAt < MIN_SILENCE_MS) {
      return;
    }
    const distinct = new Set(this.failures.map((event) => event.endpoint)).size;
    if (distinct >= DISTINCT_FAIL_THRESHOLD) {
      this.trip();
    }
  }

  /** Clears all state (e.g. when the master toggle turns BetterCR off). */
  reset(): void {
    this.failures = [];
    this.broken = false;
    this.recoverDelay = RECOVERY_BASE_MS;
    if (this.recoverTimer) {
      window.clearTimeout(this.recoverTimer);
      this.recoverTimer = 0;
    }
  }

  private trip(): void {
    this.broken = true;
    this.failures = [];
    console.warn(
      '[BetterCR] multiple distinct Crunchyroll read endpoints failing — pausing the redesign and falling back to the native site (auto-recovers when Crunchyroll responds again)',
    );
    this.scheduleProbe();
    this.onChange();
  }

  private markHealthy(): void {
    this.broken = false;
    this.failures = [];
    this.lastReadSuccessAt = Date.now();
    this.recoverDelay = RECOVERY_BASE_MS;
    if (this.recoverTimer) {
      window.clearTimeout(this.recoverTimer);
      this.recoverTimer = 0;
    }
    console.info('[BetterCR] Crunchyroll API healthy again — restoring the redesign');
    this.onChange();
  }

  private scheduleProbe(): void {
    if (this.recoverTimer) {
      return;
    }
    this.recoverTimer = window.setTimeout(() => {
      this.recoverTimer = 0;
      void this.probe();
    }, this.recoverDelay);
  }

  private async probe(): Promise<void> {
    if (!this.broken || this.probing) {
      return;
    }
    this.probing = true;
    let healthy = false;
    try {
      const token = await this.getToken();
      if (token) {
        await Promise.race([
          performCrRequest({ method: 'GET', path: PROBE_PATH }, token),
          timeout(PROBE_TIMEOUT_MS),
        ]);
        healthy = true;
      }
    } catch {
      healthy = false;
    } finally {
      this.probing = false;
    }
    if (healthy) {
      this.markHealthy();
      return;
    }
    this.recoverDelay = Math.min(this.recoverDelay * 2, RECOVERY_MAX_MS);
    this.scheduleProbe();
  }
}

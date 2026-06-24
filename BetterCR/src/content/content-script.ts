/**
 * Content script (isolated world) orchestrator.
 *
 * Wires together: page-context token interception, the SPA overlay iframe, the
 * typed postMessage bridge (API proxy / token status / login), and the
 * navigation watcher that keeps the overlay and the native /watch player in
 * sync with Crunchyroll's SPA URL changes.
 */
import { BCR_TOKEN_EVENT } from '@shared/page-bridge';
import { BCR_CHANNEL, isAppEnvelope, type AppEnvelope, type ContentReply } from '@shared/messages';
import { ok, err } from '@shared/result';
import { isWatchPath, mapCrPathToRoute } from '@shared/routing';
import { ACCENT_STORAGE_KEY, ENABLED_STORAGE_KEY } from '@shared/config';
import { TokenStore } from './token-store';
import { performCrRequest } from './cr-api';
import { passwordLogin } from './auth';
import { Overlay } from './overlay';
import { WatchSkin, type SkipKind, type SkipSegment } from './watch-skin';

const LOG_PREFIX = '[BetterCR]';
const NAV_POLL_MS = 500;
const SKIP_EVENTS_BASE = 'https://static.crunchyroll.com/skip-events/production';
const SKIP_KINDS: readonly SkipKind[] = ['recap', 'intro', 'credits'];

/** Parses Crunchyroll's skip-events JSON into the segments we act on. */
function parseSkipEvents(data: unknown): SkipSegment[] {
  if (!data || typeof data !== 'object') {
    return [];
  }
  const obj = data as Record<string, unknown>;
  const out: SkipSegment[] = [];
  for (const kind of SKIP_KINDS) {
    const seg = obj[kind];
    if (seg && typeof seg === 'object') {
      const { start, end } = seg as { start?: unknown; end?: unknown };
      if (typeof start === 'number' && typeof end === 'number' && end > start) {
        out.push({ kind, start, end });
      }
    }
  }
  return out;
}

/** Episode id from a `/watch/{id}/…` path (locale prefix tolerated). */
function watchEpisodeId(pathname: string): string {
  return /\/watch\/([^/?#]+)/.exec(pathname)?.[1] ?? '';
}

/**
 * Path (relative to the extension root) of the classic token interceptor.
 * It is a plain IIFE in `public/` so it runs in the page's MAIN world without
 * needing `chrome.*` (which is undefined there).
 */
const INJECTED_SCRIPT_PATH = 'inject/token-interceptor.js';

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Injects an extension-bundled classic script into the page's own JS realm. */
function injectPageScript(resourcePath: string): void {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL(resourcePath);
  script.onload = (): void => script.remove();
  (document.head ?? document.documentElement).appendChild(script);
}

/** Current Crunchyroll locale prefix (e.g. `/fr`), or '' if none. */
function localePrefix(): string {
  const match = /^\/([a-z]{2})(?=\/|$)/.exec(window.location.pathname);
  return match ? `/${match[1]}` : '';
}

class ContentApp {
  private readonly tokens = new TokenStore();
  private readonly overlay = new Overlay();
  private readonly watch = new WatchSkin();
  private lastHref = '';
  private lastSkipEpisode = '';
  /** Master on/off (popup toggle). When false, the native site is left intact. */
  private enabled = true;

  start(): void {
    if (window.self !== window.top) {
      return;
    }
    injectPageScript(INJECTED_SCRIPT_PATH);
    // Proactively make a session token available (cookie grant) so the app
    // never queries before authentication is ready.
    void this.tokens.ensureToken();

    window.addEventListener(BCR_TOKEN_EVENT, (event) => {
      this.tokens.ingestDetail(event.detail);
      console.info(`${LOG_PREFIX} token received by content script`);
    });
    window.addEventListener('message', (event) => {
      this.onBridgeMessage(event);
    });
    window.addEventListener('popstate', () => this.syncOverlay());

    // React to the popup's enable/disable toggle live (no reload needed).
    try {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local') {
          return;
        }
        if (ENABLED_STORAGE_KEY in changes) {
          this.setEnabled(changes[ENABLED_STORAGE_KEY]?.newValue !== false);
        }
        if (ACCENT_STORAGE_KEY in changes) {
          const accent: unknown = changes[ACCENT_STORAGE_KEY]?.newValue;
          if (typeof accent === 'string') {
            this.watch.setAccent(accent);
          }
        }
      });
    } catch {
      /* storage unavailable — stay enabled */
    }

    void this.boot();
    window.setInterval(() => this.watchNavigation(), NAV_POLL_MS);
    console.info(`${LOG_PREFIX} content script ready`);
  }

  /** Reads stored settings (on/off + accent), then mounts only if enabled. */
  private async boot(): Promise<void> {
    const stored = await new Promise<Record<string, unknown>>((resolve) => {
      try {
        chrome.storage.local.get([ENABLED_STORAGE_KEY, ACCENT_STORAGE_KEY], (result) =>
          resolve(result),
        );
      } catch {
        resolve({});
      }
    });
    this.enabled = stored[ENABLED_STORAGE_KEY] !== false;
    const accent = stored[ACCENT_STORAGE_KEY];
    if (typeof accent === 'string') {
      this.watch.setAccent(accent);
    }
    if (this.enabled) {
      this.syncOverlay();
    }
    document.addEventListener('DOMContentLoaded', () => this.syncOverlay(), { once: true });
  }

  /** Applies a live enable/disable from the popup toggle. */
  private setEnabled(on: boolean): void {
    if (on === this.enabled) {
      return;
    }
    this.enabled = on;
    if (on) {
      this.syncOverlay();
    } else {
      this.overlay.unmount();
      this.watch.disable();
      this.lastSkipEpisode = '';
      this.lastHref = '';
    }
  }

  /**
   * Mounts the overlay everywhere. On `/watch` the overlay shows the BetterCR
   * watch page and the native player is relocated on top of it (watch skin);
   * elsewhere the watch skin is disabled.
   */
  private syncOverlay(): void {
    if (!this.enabled) {
      return;
    }
    const watch = isWatchPath(window.location.pathname);
    this.overlay.mount(mapCrPathToRoute(window.location.pathname));
    if (watch) {
      this.watch.enable();
      void this.refreshSkipEvents();
    } else {
      this.watch.disable();
      this.lastSkipEpisode = '';
    }
    this.lastHref = window.location.href;
  }

  /** Fetches the current episode's skip markers and hands them to the skin. */
  private async refreshSkipEvents(): Promise<void> {
    const episodeId = watchEpisodeId(window.location.pathname);
    if (!episodeId || episodeId === this.lastSkipEpisode) {
      return;
    }
    this.lastSkipEpisode = episodeId;
    this.watch.setSkipEvents([]);
    const token = await this.tokens.ensureToken();
    if (!token) {
      return;
    }
    try {
      const data = await performCrRequest(
        { method: 'GET', path: `${SKIP_EVENTS_BASE}/${episodeId}.json`, absolute: true },
        token,
      );
      this.watch.setSkipEvents(parseSkipEvents(data));
    } catch {
      // No markers for this episode (404) or transient error — show nothing.
      this.watch.setSkipEvents([]);
    }
  }

  private watchNavigation(): void {
    if (!this.enabled) {
      return;
    }
    if (window.location.href !== this.lastHref) {
      this.syncOverlay();
    } else if (!this.overlay.isMounted()) {
      this.overlay.mount(mapCrPathToRoute(window.location.pathname));
    }
  }

  private onBridgeMessage(event: MessageEvent): void {
    if (event.origin !== this.overlay.appOrigin || !isAppEnvelope(event.data)) {
      return;
    }
    void this.dispatch(event.data, event.source);
  }

  private reply(source: MessageEventSource | null, message: ContentReply): void {
    if (source) {
      (source as Window).postMessage({ channel: BCR_CHANNEL, ...message }, this.overlay.appOrigin);
    }
  }

  private async dispatch(envelope: AppEnvelope, source: MessageEventSource | null): Promise<void> {
    switch (envelope.kind) {
      case 'API_REQUEST': {
        const token = await this.tokens.ensureToken();
        if (!token) {
          this.reply(source, {
            kind: 'API_RESPONSE',
            id: envelope.id,
            result: err('Aucun jeton de session disponible. Rafraîchissez la page.'),
          });
          return;
        }
        try {
          const data = await performCrRequest(envelope.payload, token);
          this.reply(source, { kind: 'API_RESPONSE', id: envelope.id, result: ok(data) });
        } catch (error) {
          this.reply(source, {
            kind: 'API_RESPONSE',
            id: envelope.id,
            result: err(toMessage(error)),
          });
        }
        return;
      }
      case 'CHECK_TOKEN':
        // Ensure a token (cookie grant) before reporting, so the auth gate
        // reliably detects an existing session instead of showing the login.
        await this.tokens.ensureToken();
        this.reply(source, {
          kind: 'TOKEN_STATUS',
          id: envelope.id,
          status: this.tokens.getStatus(),
        });
        return;
      case 'AUTH_REQUEST':
        try {
          const data = await passwordLogin(envelope.username, envelope.password);
          this.tokens.ingestAuth(data);
          this.reply(source, { kind: 'AUTH_RESPONSE', id: envelope.id, result: ok(data) });
        } catch (error) {
          this.reply(source, {
            kind: 'AUTH_RESPONSE',
            id: envelope.id,
            result: err(toMessage(error)),
          });
        }
        return;
      case 'NAVIGATE':
        this.reflectNavigation(envelope.path);
        return;
      case 'OPEN_EXTERNAL':
        this.openExternal(envelope.url);
        return;
      case 'WATCH_SLOT':
        this.watch.setRect(envelope.rect);
        return;
      case 'LOGOUT':
        this.handleLogout();
        return;
    }
  }

  /** Opens an http(s) URL in a new browser tab from the page context. */
  private openExternal(url: string): void {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        return;
      }
      window.open(parsed.href, '_blank', 'noopener,noreferrer');
    } catch {
      // Malformed URL — ignore.
    }
  }

  /** Asks the background worker to clear the Crunchyroll session, then reloads. */
  private handleLogout(): void {
    const reload = (): void => {
      window.location.href = `${localePrefix()}/`;
    };
    try {
      chrome.runtime.sendMessage({ type: 'BCR_LOGOUT' }, reload);
    } catch {
      reload();
    }
  }

  /**
   * Mirrors SPA navigation into the address bar. Watch links trigger a real
   * top-level load so Crunchyroll's native (DRM-capable) player takes over.
   */
  private reflectNavigation(path: string): void {
    const target = `${localePrefix()}${path}`;
    if (isWatchPath(path)) {
      window.location.href = target;
      return;
    }
    if (target !== window.location.pathname) {
      window.history.pushState({}, '', target);
      this.lastHref = window.location.href;
    }
  }
}

new ContentApp().start();

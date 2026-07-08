/**
 * SPA-side bridge to the content script.
 *
 * The redesigned app runs inside the overlay iframe and cannot reach the
 * Crunchyroll API directly (cross-origin). It forwards typed requests to the
 * parent content script via `postMessage` and resolves replies by id.
 */
import { CR_API_BASE } from '@shared/config';
import {
  BCR_CHANNEL,
  isContentEnvelope,
  type ApiRequestPayload,
  type AppRequest,
  type AuthData,
  type ContentEnvelope,
  type PlayerRect,
  type TokenStatus,
} from '@shared/messages';
import type { Result } from '@shared/result';
import { ApiError } from './errors';

const REQUEST_TIMEOUT_MS = 20_000;
const PARENT_ORIGIN = CR_API_BASE;

type IdentifiedRequest = Extract<AppRequest, { id: string }>;

interface Pending {
  readonly resolve: (envelope: ContentEnvelope) => void;
  readonly reject: (error: Error) => void;
  readonly timer: number;
}

class Bridge {
  private readonly pending = new Map<string, Pending>();
  private sequence = 0;
  private listening = false;

  /** True when the app is embedded by the content script (normal runtime). */
  isEmbedded(): boolean {
    return window.parent !== window.self;
  }

  private ensureListener(): void {
    if (this.listening) {
      return;
    }
    this.listening = true;
    window.addEventListener('message', (event: MessageEvent) => {
      if (event.source !== window.parent || event.origin !== PARENT_ORIGIN) {
        return;
      }
      if (isContentEnvelope(event.data)) {
        this.settle(event.data);
      }
    });
  }

  private settle(envelope: ContentEnvelope): void {
    const entry = this.pending.get(envelope.id);
    if (!entry) {
      return;
    }
    clearTimeout(entry.timer);
    this.pending.delete(envelope.id);
    entry.resolve(envelope);
  }

  private nextId(): string {
    this.sequence += 1;
    return `bcr-${String(this.sequence)}-${String(performance.now())}`;
  }

  private dispatch(request: IdentifiedRequest): Promise<ContentEnvelope> {
    this.ensureListener();
    if (!this.isEmbedded()) {
      return Promise.reject(new ApiError("L'application n'est pas intégrée à Crunchyroll."));
    }
    return new Promise<ContentEnvelope>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        this.pending.delete(request.id);
        reject(new ApiError('Délai dépassé en attendant Crunchyroll.'));
      }, REQUEST_TIMEOUT_MS);
      this.pending.set(request.id, { resolve, reject, timer });
      window.parent.postMessage({ channel: BCR_CHANNEL, ...request }, PARENT_ORIGIN);
    });
  }

  async apiRequest(payload: ApiRequestPayload): Promise<Result<unknown>> {
    const envelope = await this.dispatch({ kind: 'API_REQUEST', id: this.nextId(), payload });
    return envelope.kind === 'API_RESPONSE'
      ? envelope.result
      : { ok: false, error: 'Réponse inattendue du pont.' };
  }

  async checkToken(): Promise<TokenStatus> {
    const envelope = await this.dispatch({ kind: 'CHECK_TOKEN', id: this.nextId() });
    return envelope.kind === 'TOKEN_STATUS' ? envelope.status : { hasToken: false };
  }

  async login(username: string, password: string): Promise<Result<AuthData>> {
    const envelope = await this.dispatch({
      kind: 'AUTH_REQUEST',
      id: this.nextId(),
      username,
      password,
    });
    return envelope.kind === 'AUTH_RESPONSE'
      ? envelope.result
      : { ok: false, error: 'Réponse inattendue du pont.' };
  }

  /** Switches the session token to another Crunchyroll profile. */
  async switchProfile(profileId: string): Promise<boolean> {
    const envelope = await this.dispatch({
      kind: 'SWITCH_PROFILE',
      id: this.nextId(),
      profileId,
    });
    return envelope.kind === 'PROFILE_SWITCHED' && envelope.result.ok;
  }

  /** Fire-and-forget: asks the content script to reflect navigation/play. */
  navigate(path: string): void {
    if (!this.isEmbedded()) {
      return;
    }
    window.parent.postMessage({ channel: BCR_CHANNEL, kind: 'NAVIGATE', path }, PARENT_ORIGIN);
  }

  /**
   * Opens an external URL in a new top-level browser tab. Links inside the
   * `chrome-extension://` overlay iframe can't reliably open new tabs, so the
   * open is delegated to the content script (which runs in the page context).
   */
  openExternal(url: string): void {
    if (!this.isEmbedded()) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    window.parent.postMessage({ channel: BCR_CHANNEL, kind: 'OPEN_EXTERNAL', url }, PARENT_ORIGIN);
  }

  /**
   * Fire-and-forget: tells the content script where (in viewport CSS px) to lay
   * the native Crunchyroll player over the iframe — the WatchPage's player slot.
   * Pass `null` to release the player (e.g. on leaving the watch page).
   */
  watchSlot(rect: PlayerRect | null): void {
    if (!this.isEmbedded()) {
      return;
    }
    window.parent.postMessage({ channel: BCR_CHANNEL, kind: 'WATCH_SLOT', rect }, PARENT_ORIGIN);
  }

  /** Fire-and-forget: real logout — clears the CR session, then reloads. */
  logout(): void {
    if (!this.isEmbedded()) {
      return;
    }
    window.parent.postMessage({ channel: BCR_CHANNEL, kind: 'LOGOUT' }, PARENT_ORIGIN);
  }
}

export const bridge = new Bridge();

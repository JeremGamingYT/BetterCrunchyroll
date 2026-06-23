/**
 * Typed message contract between the redesigned SPA (running inside the overlay
 * iframe, `chrome-extension://` origin) and the content script (page origin,
 * holder of the Crunchyroll Bearer token).
 *
 * The iframe cannot call the Crunchyroll API directly (CORS / different origin),
 * so every API call, token check, and login is proxied through these messages.
 */
import type { Result } from './result';

/** Discriminates BetterCR traffic from any other `postMessage` on the page. */
export const BCR_CHANNEL = 'bettercr' as const;

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export type QueryValue = string | number | boolean | undefined;

/** A Crunchyroll API call described relative to the API base URL. */
export interface ApiRequestPayload {
  readonly method: HttpMethod;
  /** Path relative to the API base, e.g. `/content/v2/discover/{id}/home_feed`. */
  readonly path: string;
  readonly query?: Readonly<Record<string, QueryValue>>;
  readonly body?: unknown;
  /** When true, `path` is a full absolute URL (e.g. the play service host). */
  readonly absolute?: boolean;
}

export interface TokenStatus {
  readonly hasToken: boolean;
  readonly accountId?: string;
  readonly profileId?: string;
}

export interface AuthData {
  readonly accessToken: string;
  readonly expiresIn: number;
  readonly accountId?: string;
}

/** Messages sent from the SPA to the content script. */
export type AppRequest =
  | { readonly kind: 'API_REQUEST'; readonly id: string; readonly payload: ApiRequestPayload }
  | { readonly kind: 'CHECK_TOKEN'; readonly id: string }
  | {
      readonly kind: 'AUTH_REQUEST';
      readonly id: string;
      readonly username: string;
      readonly password: string;
    }
  | { readonly kind: 'NAVIGATE'; readonly path: string }
  | { readonly kind: 'OPEN_EXTERNAL'; readonly url: string }
  | { readonly kind: 'LOGOUT' };

/** Messages sent from the content script back to the SPA. */
export type ContentReply =
  | { readonly kind: 'API_RESPONSE'; readonly id: string; readonly result: Result<unknown> }
  | { readonly kind: 'TOKEN_STATUS'; readonly id: string; readonly status: TokenStatus }
  | { readonly kind: 'AUTH_RESPONSE'; readonly id: string; readonly result: Result<AuthData> };

export type AppEnvelope = { readonly channel: typeof BCR_CHANNEL } & AppRequest;
export type ContentEnvelope = { readonly channel: typeof BCR_CHANNEL } & ContentReply;

function isChanneled(data: unknown): data is { channel: string; kind: string } {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as { channel?: unknown }).channel === BCR_CHANNEL &&
    typeof (data as { kind?: unknown }).kind === 'string'
  );
}

export function isAppEnvelope(data: unknown): data is AppEnvelope {
  return isChanneled(data);
}

export function isContentEnvelope(data: unknown): data is ContentEnvelope {
  return isChanneled(data);
}

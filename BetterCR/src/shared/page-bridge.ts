/**
 * Contract between the page-context injected script and the content script.
 *
 * The injected script runs in Crunchyroll's own JavaScript realm, intercepts
 * the OAuth token response, and forwards it to the content script via a typed
 * `CustomEvent` (cross-realm structured data) plus `window` globals (synchronous
 * fallback).
 */

/** Name of the event the injected script dispatches when it captures a token. */
export const BCR_TOKEN_EVENT = 'bcr-token' as const;

/** Payload carried by {@link BCR_TOKEN_EVENT}. */
export interface BcrTokenDetail {
  readonly token: string;
  readonly expiresIn: number;
  readonly accountId?: string;
  readonly profileId?: string;
}

declare global {
  interface Window {
    __BCR_TOKEN__?: string;
    __BCR_TOKEN_EXPIRY__?: number;
    __BCR_ACCOUNT_ID__?: string;
    __BCR_PROFILE_ID__?: string;
  }

  interface WindowEventMap {
    'bcr-token': CustomEvent<BcrTokenDetail>;
  }
}

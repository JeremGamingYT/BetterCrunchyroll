/**
 * Proactive token acquisition from the Crunchyroll session cookie.
 *
 * Instead of only waiting to intercept Crunchyroll's own `/auth/v1/token` call,
 * we can request a token ourselves using the `etp_rt_cookie` grant — exactly
 * how the Crunchyroll web app bootstraps. Because the content script runs at the
 * page origin with `credentials: 'include'`, the `etp_rt` session cookie is sent
 * automatically. This makes the token reliably available on every load/SPA
 * navigation, eliminating the "not signed in" / empty-data races.
 */
import { CR_API_BASE } from '@shared/config';
import type { AuthData } from '@shared/messages';

/** base64("noaihdevm_6iyg0a8l0q:") — the Crunchyroll web (PKCE) client. */
const WEB_CLIENT_BASIC = 'bm9haWhkZXZtXzZpeWcwYThsMHE6';

interface RawTokenResponse {
  readonly access_token?: string;
  readonly account_id?: string;
  readonly expires_in?: number;
}

/** Requests an access token from the session cookie; null if not signed in. */
export async function acquireTokenFromCookie(): Promise<AuthData | null> {
  try {
    const response = await fetch(`${CR_API_BASE}/auth/v1/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${WEB_CLIENT_BASIC}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'ETP-Anonymous-ID': crypto.randomUUID(),
        Accept: 'application/json',
      },
      credentials: 'include',
      body: 'grant_type=etp_rt_cookie',
    });
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as RawTokenResponse;
    if (!data.access_token) {
      return null;
    }
    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in ?? 300,
      ...(data.account_id !== undefined ? { accountId: data.account_id } : {}),
    };
  } catch {
    return null;
  }
}

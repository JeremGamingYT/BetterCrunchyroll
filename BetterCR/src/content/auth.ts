/**
 * Password-grant login fallback.
 *
 * Primary auth is transparent token interception (the user is already logged
 * into Crunchyroll). This proxy exists only for the optional in-app login form
 * and runs from the page origin so it inherits the browser's cookies.
 */
import { CR_API_BASE } from '@shared/config';
import type { AuthData } from '@shared/messages';

/**
 * ETP client credentials — the only Crunchyroll client that accepts
 * `grant_type=password` (the web PKCE client rejects it).
 */
const ETP_BASIC_AUTH = 'eHVuaWh2ZWRidDNtYmlzdWhldnQ6MWtJUzVkeVR2akUwX3JxYUEzWWVBaDBiVVhVbXhXMTE=';

interface RawTokenResponse {
  readonly access_token?: string;
  readonly account_id?: string;
  readonly expires_in?: number;
  readonly error_description?: string;
}

export async function passwordLogin(username: string, password: string): Promise<AuthData> {
  const form = new URLSearchParams({
    username,
    password,
    grant_type: 'password',
    scope: 'offline_access',
    device_id: crypto.randomUUID(),
    device_name: 'BetterCR',
    device_type: 'com.crunchyroll.windows.desktop',
  });

  const response = await fetch(`${CR_API_BASE}/auth/v1/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${ETP_BASIC_AUTH}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'ETP-Anonymous-ID': crypto.randomUUID(),
      Accept: 'application/json',
    },
    credentials: 'include',
    body: form.toString(),
  });

  const data = (await response.json().catch(() => ({}))) as RawTokenResponse;

  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description ?? `Identifiants incorrects (${response.status})`);
  }

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in ?? 300,
    ...(data.account_id !== undefined ? { accountId: data.account_id } : {}),
  };
}

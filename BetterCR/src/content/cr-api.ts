/**
 * Executes a single Crunchyroll API request from the page origin, using the
 * intercepted Bearer token and the user's session cookies.
 */
import { CR_API_BASE, CR_LOCALE } from '@shared/config';
import type { ApiRequestPayload } from '@shared/messages';

/** Builds the absolute request URL, injecting the default locale when relevant. */
function buildUrl(payload: ApiRequestPayload): string {
  const url = new URL(payload.absolute ? payload.path : `${CR_API_BASE}${payload.path}`);

  if (!payload.absolute && !url.searchParams.has('locale')) {
    url.searchParams.set('locale', CR_LOCALE);
  }

  for (const [key, value] of Object.entries(payload.query ?? {})) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

/**
 * Performs the request and returns parsed JSON (or `null` for empty bodies).
 * Throws on non-2xx responses with a descriptive message.
 */
export async function performCrRequest(
  payload: ApiRequestPayload,
  token: string,
): Promise<unknown> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  };
  if (payload.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(buildUrl(payload), {
    method: payload.method,
    headers,
    credentials: 'include',
    body: payload.body !== undefined ? JSON.stringify(payload.body) : undefined,
  });

  if (!response.ok) {
    // Surface Crunchyroll's own error body (truncated) — it names the exact
    // reason (bad content id, wrong method, …), which is invaluable for
    // diagnosing a feature break without guessing.
    let detail = '';
    try {
      detail = (await response.text()).slice(0, 300).replace(/\s+/g, ' ').trim();
    } catch {
      /* body unavailable */
    }
    const suffix = detail ? ` — ${detail}` : '';
    throw new Error(`Crunchyroll API ${response.status} for ${payload.path}${suffix}`);
  }
  // Some mutations (watchlist add/remove) reply 200/204 with an empty or
  // non-JSON body — treat that as success rather than a parse failure.
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

/**
 * Client for the free BetterCR comments API (see `server/`). Called directly
 * from the SPA (the API sends permissive CORS). No-ops gracefully when
 * `COMMENTS_API` is unset, so the UI simply hides the comments section.
 */
import { COMMENTS_API } from '@shared/config';

export interface Comment {
  readonly id: string;
  readonly name: string;
  readonly text: string;
  readonly ts: number;
}

/** Whether a comments backend has been configured. */
export function commentsEnabled(): boolean {
  return COMMENTS_API.length > 0;
}

/** Newest comments for an anime (empty on any failure). */
export async function getComments(seriesId: string): Promise<Comment[]> {
  if (!COMMENTS_API || !seriesId) {
    return [];
  }
  try {
    const response = await fetch(`${COMMENTS_API}?series=${encodeURIComponent(seriesId)}`, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      return [];
    }
    const data = (await response.json()) as { comments?: Comment[] };
    return Array.isArray(data.comments) ? data.comments : [];
  } catch {
    return [];
  }
}

/** Posts a comment; returns the created comment or null on failure. */
export async function postComment(
  seriesId: string,
  name: string,
  text: string,
): Promise<Comment | null> {
  if (!COMMENTS_API || !seriesId || !text.trim()) {
    return null;
  }
  try {
    const response = await fetch(COMMENTS_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ series: seriesId, name, text }),
    });
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as { comment?: Comment };
    return data.comment ?? null;
  } catch {
    return null;
  }
}

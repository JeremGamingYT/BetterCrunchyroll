/**
 * Client for the free BetterCR comments API (see `server/`). Called directly
 * from the SPA (the API sends permissive CORS). No-ops gracefully when
 * `COMMENTS_API` is unset, so the UI simply hides the comments section.
 *
 * There are no accounts: ownership (edit/delete) is proven by a per-browser
 * secret `uid` stored in localStorage and attached to each comment.
 */
import { COMMENTS_API } from '@shared/config';

export interface Comment {
  readonly id: string;
  readonly uid?: string;
  readonly name: string;
  readonly avatar?: string;
  readonly text: string;
  readonly ts: number;
  readonly parentId?: string | null;
  readonly edited?: boolean;
  readonly deleted?: boolean;
}

export interface NewComment {
  readonly name: string;
  readonly avatar?: string;
  readonly text: string;
  readonly parentId?: string | null;
}

const UID_KEY = 'bcr_uid';

/** Stable per-browser id used to prove comment ownership (edit/delete). */
export function clientId(): string {
  try {
    let id = localStorage.getItem(UID_KEY);
    if (!id) {
      id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `u${String(Date.now())}${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(UID_KEY, id);
    }
    return id;
  } catch {
    return 'anon';
  }
}

export function commentsEnabled(): boolean {
  return COMMENTS_API.length > 0;
}

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

export async function postComment(seriesId: string, input: NewComment): Promise<Comment | null> {
  if (!COMMENTS_API || !seriesId || !input.text.trim()) {
    return null;
  }
  try {
    const response = await fetch(COMMENTS_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        series: seriesId,
        uid: clientId(),
        name: input.name,
        avatar: input.avatar ?? '',
        text: input.text,
        parentId: input.parentId ?? null,
      }),
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

export async function editComment(
  seriesId: string,
  id: string,
  text: string,
): Promise<Comment | null> {
  if (!COMMENTS_API || !text.trim()) {
    return null;
  }
  try {
    const response = await fetch(COMMENTS_API, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ series: seriesId, id, uid: clientId(), text }),
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

export async function deleteComment(seriesId: string, id: string): Promise<boolean> {
  if (!COMMENTS_API) {
    return false;
  }
  try {
    const response = await fetch(COMMENTS_API, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ series: seriesId, id, uid: clientId() }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Client for the free BetterCR comments API (see `server/`). Called directly
 * from the SPA (the API sends permissive CORS). No-ops gracefully when
 * `COMMENTS_API` is unset, so the UI simply hides the comments section.
 *
 * Comments are scoped to an EPISODE. There are no accounts: ownership
 * (edit/delete) is proven by a per-browser secret `uid` stored in localStorage.
 * The uid is sent to the server but never returned to other clients — the
 * server resolves a `mine` flag instead, so it can't be lifted to impersonate.
 */
import { COMMENTS_API } from '@shared/config';

export interface Comment {
  readonly id: string;
  readonly name: string;
  readonly avatar?: string;
  readonly text: string;
  readonly ts: number;
  readonly parentId?: string | null;
  readonly edited?: boolean;
  /** True when this browser's uid authored it (resolved server-side). */
  readonly mine?: boolean;
  /** Client-only: a just-deleted comment lingering as a tombstone. */
  readonly deleted?: boolean;
}

export interface NewComment {
  readonly name: string;
  readonly avatar?: string;
  readonly text: string;
  readonly parentId?: string | null;
  /** Context attached to reply notifications (so the recipient can jump back). */
  readonly seriesId?: string;
  readonly seriesTitle?: string;
  readonly watchPath?: string;
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

export async function getComments(
  episodeId: string,
  opts: { readonly view?: boolean } = {},
): Promise<Comment[]> {
  if (!COMMENTS_API || !episodeId) {
    return [];
  }
  try {
    const params = new URLSearchParams({ episode: episodeId, me: clientId() });
    if (opts.view) {
      params.set('view', '1');
    }
    const response = await fetch(`${COMMENTS_API}?${params.toString()}`, {
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

export async function postComment(episodeId: string, input: NewComment): Promise<Comment | null> {
  if (!COMMENTS_API || !episodeId || !input.text.trim()) {
    return null;
  }
  try {
    const response = await fetch(COMMENTS_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        episode: episodeId,
        uid: clientId(),
        name: input.name,
        avatar: input.avatar ?? '',
        text: input.text,
        parentId: input.parentId ?? null,
        series: input.seriesId ?? '',
        seriesTitle: input.seriesTitle ?? '',
        watchPath: input.watchPath ?? '',
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

/** Flag a comment for moderation. Resolves true once the report is recorded. */
export async function reportComment(episodeId: string, id: string): Promise<boolean> {
  if (!COMMENTS_API || !episodeId || !id) {
    return false;
  }
  try {
    const response = await fetch(COMMENTS_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'report', episode: episodeId, id, uid: clientId() }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function editComment(
  episodeId: string,
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
      body: JSON.stringify({ episode: episodeId, id, uid: clientId(), text }),
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

export async function deleteComment(episodeId: string, id: string): Promise<boolean> {
  if (!COMMENTS_API) {
    return false;
  }
  try {
    const response = await fetch(COMMENTS_API, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ episode: episodeId, id, uid: clientId() }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

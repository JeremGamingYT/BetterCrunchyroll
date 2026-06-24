/**
 * Reply notifications client (backed by the comments server's notifications
 * endpoint). "New episodes today" notifications are computed separately from
 * Crunchyroll; this module only covers the reply notifications stored per-uid.
 */
import { COMMENTS_API } from '@shared/config';
import { clientId } from './comments';

const NOTIFICATIONS_API = COMMENTS_API.replace(/\/comments\/?$/, '/notifications');

export interface ReplyNotif {
  readonly id: string;
  readonly type: 'reply';
  readonly series: string;
  readonly seriesTitle?: string;
  readonly watchPath?: string;
  readonly parentId: string;
  readonly fromName: string;
  readonly fromAvatar?: string;
  readonly text: string;
  readonly ts: number;
}

export async function getReplyNotifications(): Promise<ReplyNotif[]> {
  if (!COMMENTS_API) {
    return [];
  }
  try {
    const response = await fetch(`${NOTIFICATIONS_API}?uid=${encodeURIComponent(clientId())}`, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      return [];
    }
    const data = (await response.json()) as { notifications?: ReplyNotif[] };
    return Array.isArray(data.notifications) ? data.notifications : [];
  } catch {
    return [];
  }
}

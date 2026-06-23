/**
 * BetterCR — notifications API (reply notifications).
 *
 * GET    /api/notifications?uid=<uid> → { notifications: [{type,series,parentId,fromName,text,ts,...}] }
 * DELETE /api/notifications  { uid }  → { ok }   (clear all for that uid)
 *
 * Reply notifications are written by the comments endpoint into
 * `bcr:notif:<uid>`. "New episodes today" notifications are computed client-side
 * from Crunchyroll (no storage needed).
 */
import { Redis } from '@upstash/redis';

const url =
  process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_REST_API_URL || '';
const token =
  process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_REST_API_TOKEN || '';
const redis = url && token ? new Redis({ url, token }) : null;

const cleanId = (value) => String(value ?? '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 80);
const notifKey = (uid) => `bcr:notif:${cleanId(uid)}`;
const parseEntry = (entry) => {
  try {
    return typeof entry === 'string' ? JSON.parse(entry) : entry;
  } catch {
    return null;
  }
};

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (!redis) {
    res.status(200).json({ notifications: [] });
    return;
  }
  try {
    if (req.method === 'GET') {
      const uid = cleanId(req.query.uid);
      if (!uid) {
        res.status(400).json({ error: 'missing uid' });
        return;
      }
      const raw = await redis.lrange(notifKey(uid), 0, 49);
      res.status(200).json({ notifications: raw.map(parseEntry).filter(Boolean) });
      return;
    }
    if (req.method === 'DELETE') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
      const uid = cleanId(body.uid);
      if (uid) await redis.del(notifKey(uid));
      res.status(200).json({ ok: true });
      return;
    }
    res.status(405).json({ error: 'method not allowed' });
  } catch (error) {
    res.status(500).json({ error: 'server_error', detail: String(error?.message || error).slice(0, 200) });
  }
}

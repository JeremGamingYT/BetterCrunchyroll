/**
 * BetterCR — free serverless comments API (Vercel + Upstash Redis).
 *
 * GET    /api/comments?series=<id>                  → { comments: [...] }
 * GET    /api/comments?series=__diag                → { ok, env }
 * POST   /api/comments  { series, uid, name, avatar, text, parentId? } → { comment }
 * PATCH  /api/comments  { series, id, uid, text }   → { comment }   (author only)
 * DELETE /api/comments  { series, id, uid }         → { ok }        (author only, hard)
 *
 * One capped Redis list per series (`bcr:cmt:<id>`). No accounts: ownership is
 * proven by a client-generated `uid` (a local secret). Replies push a
 * notification to the parent author's list (`bcr:notif:<uid>`). Profanity is
 * masked server-side; light per-IP rate limiting curbs spam.
 */
import { Redis } from '@upstash/redis';
import { maskProfanity } from '../lib/filter.js';

function resolveCreds() {
  const url =
    process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_REST_API_URL || '';
  const token =
    process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_REST_API_TOKEN || '';
  return { url, token };
}

const { url, token } = resolveCreds();
const redis = url && token ? new Redis({ url, token }) : null;

const MAX_TEXT = 1000;
const MAX_NAME = 40;
const READ_LIMIT = 120;
const KEEP = 400;
const RATE_MAX = 8;
const NOTIF_KEEP = 50;

const clean = (value, max) => {
  let out = '';
  for (const ch of String(value ?? '')) {
    const code = ch.charCodeAt(0);
    if (code >= 32 && code !== 127) out += ch;
  }
  return out.trim().slice(0, max);
};
const cleanId = (value) => String(value ?? '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 80);
const cleanAvatar = (value) => {
  const s = String(value ?? '').slice(0, 300);
  return s.startsWith('https://') ? s : '';
};
const keyFor = (id) => `bcr:cmt:${cleanId(id).slice(0, 64)}`;
const notifKey = (uid) => `bcr:notif:${cleanId(uid)}`;

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

const parseEntry = (entry) => {
  try {
    return typeof entry === 'string' ? JSON.parse(entry) : entry;
  } catch {
    return null;
  }
};
const readBody = (req) =>
  typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};

async function findComment(series, id) {
  const raw = await redis.lrange(keyFor(series), 0, KEEP - 1);
  for (let i = 0; i < raw.length; i += 1) {
    const parsed = parseEntry(raw[i]);
    if (parsed && parsed.id === id) {
      return { index: i, comment: parsed };
    }
  }
  return null;
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method === 'GET' && clean(req.query.series, 64) === '__diag') {
    res.status(200).json({
      ok: Boolean(redis),
      env: {
        KV_REST_API_URL: Boolean(process.env.KV_REST_API_URL),
        KV_REST_API_TOKEN: Boolean(process.env.KV_REST_API_TOKEN),
        UPSTASH_REDIS_REST_URL: Boolean(process.env.UPSTASH_REDIS_REST_URL),
        UPSTASH_REDIS_REST_TOKEN: Boolean(process.env.UPSTASH_REDIS_REST_TOKEN),
      },
    });
    return;
  }

  if (!redis) {
    res.status(503).json({ error: 'storage_not_configured' });
    return;
  }

  try {
    if (req.method === 'GET') {
      const series = cleanId(req.query.series);
      if (!series) {
        res.status(400).json({ error: 'missing series' });
        return;
      }
      const raw = await redis.lrange(keyFor(series), 0, READ_LIMIT - 1);
      res.status(200).json({ comments: raw.map(parseEntry).filter(Boolean) });
      return;
    }

    if (req.method === 'POST') {
      const body = readBody(req);
      const series = cleanId(body.series);
      const text = maskProfanity(clean(body.text, MAX_TEXT));
      const name = clean(body.name, MAX_NAME) || 'Invité';
      const uid = cleanId(body.uid);
      const avatar = cleanAvatar(body.avatar);
      const parentId = String(body.parentId ?? '').slice(0, 40) || null;
      const seriesTitle = clean(body.seriesTitle, MAX_NAME);
      const watchPath = clean(body.watchPath, 120);
      if (!series || !text) {
        res.status(400).json({ error: 'missing series or text' });
        return;
      }

      const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
      const rlKey = `bcr:rl:${ip || 'anon'}`;
      const count = await redis.incr(rlKey);
      if (count === 1) await redis.expire(rlKey, 60);
      if (count > RATE_MAX) {
        res.status(429).json({ error: 'too many comments, slow down' });
        return;
      }

      const comment = {
        id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        uid,
        name,
        avatar,
        text,
        ts: Date.now(),
        parentId,
      };
      const key = keyFor(series);
      await redis.lpush(key, JSON.stringify(comment));
      await redis.ltrim(key, 0, KEEP - 1);

      // Notify the parent comment's author of the reply.
      if (parentId) {
        const parent = await findComment(series, parentId);
        if (parent && parent.comment.uid && parent.comment.uid !== uid) {
          const notif = {
            id: comment.id,
            type: 'reply',
            series,
            seriesTitle,
            watchPath,
            parentId,
            fromName: name,
            fromAvatar: avatar,
            text,
            ts: comment.ts,
          };
          const nk = notifKey(parent.comment.uid);
          await redis.lpush(nk, JSON.stringify(notif));
          await redis.ltrim(nk, 0, NOTIF_KEEP - 1);
        }
      }
      res.status(200).json({ comment });
      return;
    }

    if (req.method === 'PATCH' || req.method === 'DELETE') {
      const body = readBody(req);
      const series = cleanId(body.series);
      const id = String(body.id ?? '').slice(0, 40);
      const uid = cleanId(body.uid);
      if (!series || !id || !uid) {
        res.status(400).json({ error: 'missing series, id or uid' });
        return;
      }
      const found = await findComment(series, id);
      if (!found) {
        res.status(404).json({ error: 'not found' });
        return;
      }
      if (!found.comment.uid || found.comment.uid !== uid) {
        res.status(403).json({ error: 'not your comment' });
        return;
      }
      const key = keyFor(series);

      if (req.method === 'DELETE') {
        // Hard delete: rebuild the list without this comment (replies remain).
        const all = await redis.lrange(key, 0, KEEP - 1);
        const kept = all.map(parseEntry).filter((c) => c && c.id !== id);
        await redis.del(key);
        if (kept.length) {
          await redis.rpush(key, ...kept.map((c) => JSON.stringify(c)));
        }
        res.status(200).json({ ok: true });
        return;
      }

      const text = maskProfanity(clean(body.text, MAX_TEXT));
      if (!text) {
        res.status(400).json({ error: 'empty text' });
        return;
      }
      const updated = { ...found.comment, text, edited: true };
      await redis.lset(key, found.index, JSON.stringify(updated));
      res.status(200).json({ comment: updated });
      return;
    }

    res.status(405).json({ error: 'method not allowed' });
  } catch (error) {
    res.status(500).json({ error: 'server_error', detail: String(error?.message || error).slice(0, 200) });
  }
}

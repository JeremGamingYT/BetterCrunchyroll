/**
 * BetterCR — free serverless comments API (Vercel + Upstash Redis).
 *
 * Comments are keyed by EPISODE (`bcr:cmt:<episodeId>`). No accounts: ownership
 * (edit/delete) is proven by a client-generated `uid` (a local secret). The uid
 * is NEVER echoed back to other clients — GET returns a `mine` flag instead, so
 * a uid can't be lifted from the wire to impersonate someone.
 *
 * GET    /api/comments?episode=<id>&me=<uid>   → { comments: [...] }   (?view=1 counts a view)
 * GET    /api/comments?diag=1                  → { ok, env }
 * POST   /api/comments  { episode, uid, name, avatar, text, parentId?, series?, seriesTitle?, watchPath? }
 * POST   /api/comments  { action:'report', episode, id, uid }          → { ok }
 * PATCH  /api/comments  { episode, id, uid, text }                     → { comment }  (author only)
 * DELETE /api/comments  { episode, id, uid }                           → { ok }       (author only, hard)
 *
 * Space is bounded three ways: each list is capped (KEEP) and given a 30-day
 * TTL, comments older than 30 days are pruned on read, and when the database
 * grows past a soft cap the least-recently-active / least-viewed lists are
 * evicted first. Moderation is automatic and serverless-friendly: reports raise
 * a hidden trust score, enough reports auto-hide a comment (sooner for
 * low-trust authors), and a collapsed trust score shadow-bans the author
 * (their comments stay visible to themselves but vanish for everyone else —
 * which is why it can't be undone from the client devtools).
 */
import { Redis } from '@upstash/redis';
import { maskProfanity } from '../lib/filter.js';

function resolveCreds() {
  const url =
    process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.REDIS_REST_API_URL ||
    '';
  const token =
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.REDIS_REST_API_TOKEN ||
    '';
  return { url, token };
}

const { url, token } = resolveCreds();
const redis = url && token ? new Redis({ url, token }) : null;

const MAX_TEXT = 1000;
const MAX_NAME = 40;
const READ_LIMIT = 200;
const KEEP = 400;
const RATE_MAX = 8; // comments per 60s per IP
const COOLDOWN_S = 12; // min seconds between two comments from the same uid
const NOTIF_KEEP = 50;

const DAY_MS = 86_400_000;
const TTL_MS = 30 * DAY_MS;
const TTL_S = 30 * 86_400;

// Moderation tuning.
const TRUST_START = 100;
const TRUST_PENALTY = 25; // trust lost each time one of your comments is auto-hidden
const SHADOW_AT = 30; // trust <= this → shadow-banned
const REPORT_HIDE = 4; // reports needed to auto-hide (normal trust)
const REPORT_HIDE_LOWTRUST = 2; // … for an author whose trust already dropped below 50

// Eviction (only triggered when the DB grows large).
const SOFT_CAP_KEYS = 4000;
const EVICT_BATCH = 250;
const HIT_BONUS_MS = 12 * 3_600_000; // each view ≈ being 12h "more recent" for eviction ranking
const HIT_CAP = 200;

const clean = (value, max) => {
  let out = '';
  for (const ch of String(value ?? '')) {
    const code = ch.charCodeAt(0);
    if (code >= 32 && code !== 127) out += ch;
  }
  return out.trim().slice(0, max);
};
const cleanId = (value) =>
  String(value ?? '')
    .replace(/[^A-Za-z0-9_-]/g, '')
    .slice(0, 80);
const cleanAvatar = (value) => {
  const s = String(value ?? '').slice(0, 300);
  return s.startsWith('https://') ? s : '';
};
const keyFor = (id) => `bcr:cmt:${cleanId(id).slice(0, 64)}`;
const notifKey = (uid) => `bcr:notif:${cleanId(uid)}`;
const trustKey = (uid) => `bcr:trust:${cleanId(uid)}`;
const hitsKey = (id) => `bcr:hits:${cleanId(id).slice(0, 64)}`;
const repKey = (id) => `bcr:rep:${cleanId(id).slice(0, 64)}`;

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

/** Public shape sent to clients — no uid, no moderation internals. */
const publicShape = (c, me) => ({
  id: c.id,
  name: c.name,
  avatar: c.avatar || '',
  text: c.text,
  ts: c.ts,
  parentId: c.parentId ?? null,
  edited: Boolean(c.edited),
  mine: Boolean(me) && c.uid === me,
});

// Shadow-ban set is read often (every poll); cache it in warm-instance memory.
let shadowCache = { at: 0, set: new Set() };
async function getShadow() {
  if (Date.now() - shadowCache.at < 60_000) return shadowCache.set;
  const arr = (await redis.smembers('bcr:shadow')) || [];
  shadowCache = { at: Date.now(), set: new Set(arr) };
  return shadowCache.set;
}

async function findComment(episode, id) {
  const raw = await redis.lrange(keyFor(episode), 0, KEEP - 1);
  for (let i = 0; i < raw.length; i += 1) {
    const parsed = parseEntry(raw[i]);
    if (parsed && parsed.id === id) return { index: i, comment: parsed };
  }
  return null;
}

/** Mark a list active (recency + views) for eviction ranking. */
async function touch(episode, viewed) {
  try {
    let hits = 0;
    if (viewed) {
      hits = Math.min(await redis.incr(hitsKey(episode)), HIT_CAP);
      await redis.expire(hitsKey(episode), TTL_S);
    }
    await redis.zadd('bcr:idx', {
      score: Date.now() + hits * HIT_BONUS_MS,
      member: cleanId(episode),
    });
  } catch {
    /* best-effort */
  }
}

/** When the DB is large, drop the lowest-ranked (old + rarely viewed) lists. */
async function evictIfNeeded() {
  try {
    const size = await redis.dbsize();
    if (size <= SOFT_CAP_KEYS) return;
    const victims = (await redis.zrange('bcr:idx', 0, EVICT_BATCH - 1)) || [];
    if (!victims.length) return;
    const keys = victims.flatMap((ep) => [keyFor(ep), hitsKey(ep)]);
    await redis.del(...keys);
    await redis.zrem('bcr:idx', ...victims);
  } catch {
    /* best-effort */
  }
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const diag =
    req.method === 'GET' && (req.query.diag || clean(req.query.episode, 64) === '__diag');
  if (diag) {
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

  const ip = String(req.headers['x-forwarded-for'] || '')
    .split(',')[0]
    .trim();

  try {
    if (req.method === 'GET') {
      const episode = cleanId(req.query.episode || req.query.series);
      const me = cleanId(req.query.me);
      if (!episode) {
        res.status(400).json({ error: 'missing episode' });
        return;
      }
      const key = keyFor(episode);
      let parsed = (await redis.lrange(key, 0, READ_LIMIT - 1)).map(parseEntry).filter(Boolean);

      // Prune comments older than the 30-day window (rewrite only if needed).
      const cutoff = Date.now() - TTL_MS;
      const fresh = parsed.filter((c) => (c.ts ?? 0) >= cutoff);
      if (fresh.length !== parsed.length) {
        await redis.del(key);
        if (fresh.length) await redis.rpush(key, ...fresh.map((c) => JSON.stringify(c)));
        parsed = fresh;
      }

      const shadow = await getShadow();
      const visible = parsed.filter(
        (c) => !c.hidden && (!shadow.has(c.uid) || (me && c.uid === me)),
      );
      void touch(episode, req.query.view ? true : false);
      res.status(200).json({ comments: visible.map((c) => publicShape(c, me)) });
      return;
    }

    if (req.method === 'POST') {
      const body = readBody(req);
      const uid = cleanId(body.uid);

      // ── Report a comment ──
      if (body.action === 'report') {
        const episode = cleanId(body.episode || body.series);
        const id = String(body.id ?? '').slice(0, 40);
        if (!episode || !id) {
          res.status(400).json({ error: 'missing episode or id' });
          return;
        }
        const found = await findComment(episode, id);
        if (!found) {
          res.status(404).json({ error: 'not found' });
          return;
        }
        // One report per reporter (uid, or IP for anon). No double-count.
        const added = await redis.sadd(repKey(id), uid || ip || 'anon');
        await redis.expire(repKey(id), TTL_S);
        if (!added) {
          res.status(200).json({ ok: true, already: true });
          return;
        }
        const reports = (found.comment.reports ?? 0) + 1;
        const authorUid = found.comment.uid;
        const trust = authorUid
          ? Number((await redis.get(trustKey(authorUid))) ?? TRUST_START)
          : TRUST_START;
        const threshold = trust < 50 ? REPORT_HIDE_LOWTRUST : REPORT_HIDE;
        const updated = { ...found.comment, reports };
        if (reports >= threshold && !found.comment.hidden) {
          updated.hidden = true;
          if (authorUid) {
            const newTrust = trust - TRUST_PENALTY;
            await redis.set(trustKey(authorUid), newTrust);
            await redis.expire(trustKey(authorUid), TTL_S * 6);
            if (newTrust <= SHADOW_AT) {
              await redis.sadd('bcr:shadow', authorUid);
              shadowCache.at = 0;
            }
          }
        }
        await redis.lset(keyFor(episode), found.index, JSON.stringify(updated));
        res.status(200).json({ ok: true });
        return;
      }

      // ── New comment ──
      const episode = cleanId(body.episode || body.series);
      const text = maskProfanity(clean(body.text, MAX_TEXT));
      const name = clean(body.name, MAX_NAME) || 'Invité';
      const avatar = cleanAvatar(body.avatar);
      const parentId = String(body.parentId ?? '').slice(0, 40) || null;
      const series = cleanId(body.series);
      const seriesTitle = clean(body.seriesTitle, MAX_NAME);
      const watchPath = clean(body.watchPath, 120);
      if (!episode || !text) {
        res.status(400).json({ error: 'missing episode or text' });
        return;
      }

      // Per-IP burst limit …
      const rlKey = `bcr:rl:${ip || 'anon'}`;
      const count = await redis.incr(rlKey);
      if (count === 1) await redis.expire(rlKey, 60);
      if (count > RATE_MAX) {
        res.status(429).json({ error: 'too many comments, slow down' });
        return;
      }
      // … and a per-user cooldown between posts.
      const cd = await redis.set(`bcr:cd:${uid || ip || 'anon'}`, 1, { nx: true, ex: COOLDOWN_S });
      if (cd !== 'OK') {
        res.status(429).json({ error: 'cooldown' });
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
      const key = keyFor(episode);
      await redis.lpush(key, JSON.stringify(comment));
      await redis.ltrim(key, 0, KEEP - 1);
      await redis.expire(key, TTL_S);
      void touch(episode, false);
      void evictIfNeeded();

      // Notify the parent comment's author of the reply.
      if (parentId) {
        const parent = await findComment(episode, parentId);
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
          await redis.expire(nk, TTL_S);
        }
      }
      res.status(200).json({ comment: publicShape(comment, uid) });
      return;
    }

    if (req.method === 'PATCH' || req.method === 'DELETE') {
      const body = readBody(req);
      const episode = cleanId(body.episode || body.series);
      const id = String(body.id ?? '').slice(0, 40);
      const uid = cleanId(body.uid);
      if (!episode || !id || !uid) {
        res.status(400).json({ error: 'missing episode, id or uid' });
        return;
      }
      const found = await findComment(episode, id);
      if (!found) {
        res.status(404).json({ error: 'not found' });
        return;
      }
      if (!found.comment.uid || found.comment.uid !== uid) {
        res.status(403).json({ error: 'not your comment' });
        return;
      }
      const key = keyFor(episode);

      if (req.method === 'DELETE') {
        const all = await redis.lrange(key, 0, KEEP - 1);
        const kept = all.map(parseEntry).filter((c) => c && c.id !== id);
        await redis.del(key);
        if (kept.length) {
          await redis.rpush(key, ...kept.map((c) => JSON.stringify(c)));
          await redis.expire(key, TTL_S);
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
      res.status(200).json({ comment: publicShape(updated, uid) });
      return;
    }

    res.status(405).json({ error: 'method not allowed' });
  } catch (error) {
    res
      .status(500)
      .json({ error: 'server_error', detail: String(error?.message || error).slice(0, 200) });
  }
}

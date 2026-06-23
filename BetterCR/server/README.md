# BetterCR — Comments API (free, serverless)

A tiny Vercel serverless function that stores the watch-page comments in a free
Upstash Redis (one capped list per anime). No accounts, no cost.

## Deploy (one-time, ~5 min, free)

1. **Push this `server/` folder** to a GitHub repo (or use the Vercel CLI from
   inside it: `npx vercel`).
2. On **vercel.com → Add New… → Project**, import that repo.
   - If `server/` is a subfolder, set **Root Directory = `server`**.
3. Add a **free Redis** store: project **Storage → Create → Upstash (Redis)**
   (or the **KV** option). Connect it to the project — Vercel injects the env
   vars automatically (`KV_REST_API_URL` / `KV_REST_API_TOKEN`, or
   `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`).
4. **Deploy.** You get a URL like `https://bettercr-comments.vercel.app`.
5. Test it: open `https://<your-url>/api/comments?series=test` → should return
   `{"comments":[]}`.
6. Paste the base URL into the extension: `src/shared/config.ts` →
   `COMMENTS_API = 'https://<your-url>/api/comments'`, then `npm run build` and
   reload the extension.

## API

- `GET  /api/comments?series=<id>` → `{ comments: [{ id, name, text, ts }] }`
- `POST /api/comments` with JSON `{ series, name, text }` → `{ comment }`

Limits: text ≤ 1000 chars, name ≤ 40, 300 newest kept per anime, 8 posts/min/IP.
CORS is open (`*`) so the extension can call it directly.

## Local dev (optional)

```bash
cd server && npm install && npx vercel dev
```

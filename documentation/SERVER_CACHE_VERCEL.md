# Backend Vercel and shared cache

BetterCrunchyroll can run its Next.js API routes on Vercel. For multi-user scale,
the backend needs a shared cache. Local memory is only a development fallback and
does not survive serverless instance rotation.

## Required cache provider

Configure a Redis-compatible REST cache such as Vercel KV or Upstash Redis with
these environment variables:

```txt
KV_REST_API_URL=...
KV_REST_API_TOKEN=...
```

The code also accepts the equivalent Upstash names:

```txt
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

No npm Redis dependency is required. The backend uses the REST API directly from
`lib/server-cache.ts`.

## What is shared

Shared cached data:

- AniList GraphQL responses from `app/api/anilist/route.ts`
- Public Crunchyroll catalog/search/browse responses from
  `app/api/crunchyroll/route.ts`

Not shared:

- Account data
- Profiles
- Watchlist
- History
- Subscriptions
- User ratings

Those endpoints are deliberately bypassed because they are user-specific.

## Behavior

When a response is already cached, the API returns:

```txt
X-BetterCrunchyroll-Cache: HIT
```

When the response was fetched from the upstream API and stored:

```txt
X-BetterCrunchyroll-Cache: MISS
```

When the route is private or not safe to share:

```txt
X-BetterCrunchyroll-Cache: BYPASS
```

## TTL defaults

- AniList: 7 days
- Public Crunchyroll: 6 hours

This gives all users the same enriched anime/movie metadata once the first user
has loaded it, instead of repeatedly calling Crunchyroll/AniList for identical
content.


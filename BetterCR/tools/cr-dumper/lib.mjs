/*
 * BetterCR — cr-dumper shared core.
 *
 * Pure helpers used by both `structure.mjs` (offline: capture-json / HAR) and
 * `crawl.mjs` (live Playwright crawl): URL filtering, endpoint templating, JSON
 * shape reduction, and the structured `api-dump/` writer. No I/O beyond
 * writeDump's own fs calls.
 */
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

export const SHAPE_DEPTH = 4;
export const SHAPE_KEYS = 40;
export const MAX_SAMPLE = 600;

/** True only for Crunchyroll *API* URLs (analytics/ads/static excluded). */
export function isApiUrl(url) {
  let u;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  const h = u.hostname;
  if (!(h === 'www.crunchyroll.com' || h.endsWith('.crunchyrollsvc.com'))) return false;
  if (/^\/(?:assets|static|images|fonts|_next)\//.test(u.pathname)) return false;
  return (
    /\/(?:content|accounts|auth|subs|cms|music|index)\//.test(u.pathname) || /\/v\d+\//.test(u.pathname)
  );
}

const looksLikeId = (s) =>
  s.includes(',') ||
  /^G[A-Z0-9]{5,}$/i.test(s) ||
  /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(s) ||
  /^\d+$/.test(s) ||
  (s.length >= 9 && /\d/.test(s) && /^[A-Za-z0-9_-]+$/.test(s));

/** Collapse id-like path segments → a stable endpoint template. */
export const templatize = (pathname) =>
  pathname
    .split('/')
    .map((seg) => (looksLikeId(seg) ? '{id}' : seg))
    .join('/');

/** Reduce an arbitrary JSON value to a compact key/type shape. */
export function shapeOf(value, depth = 0) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return value.length ? [shapeOf(value[0], depth + 1)] : [];
  const t = typeof value;
  if (t !== 'object') return t;
  if (depth >= SHAPE_DEPTH) return 'object';
  const out = {};
  for (const k of Object.keys(value).slice(0, SHAPE_KEYS)) out[k] = shapeOf(value[k], depth + 1);
  return out;
}

export const parseJson = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

const service = (template) => template.split('/').filter(Boolean)[0] || 'misc';
const slug = (method, template) =>
  `${method}__${template.replace(/[/{}]+/g, '_').replace(/^_+|_+$/g, '')}`.slice(0, 120);

/** Merge one observed call into the endpoint map (keyed by method + template). */
export function addCall(map, { method, url, reqShape, status, resShape, resSample, queryKeys }) {
  let u;
  try {
    u = new URL(url);
  } catch {
    return;
  }
  const template = templatize(u.pathname);
  const key = `${method} ${template}`;
  const e = map.get(key) || {
    method,
    template,
    host: u.hostname,
    count: 0,
    queryKeys: new Set(),
    example: u.pathname + u.search,
    requestShape: undefined,
    responseStatus: undefined,
    responseShape: undefined,
    responseSample: undefined,
  };
  e.count += 1;
  u.searchParams.forEach((_v, k) => e.queryKeys.add(k));
  if (Array.isArray(queryKeys)) for (const k of queryKeys) e.queryKeys.add(k);
  if (e.requestShape === undefined && reqShape !== undefined) e.requestShape = reqShape;
  if (typeof status === 'number') e.responseStatus = status;
  if (e.responseShape === undefined && resShape !== undefined) {
    e.responseShape = resShape;
    e.responseSample = resSample;
  }
  map.set(key, e);
}

const jsonBlock = (value) => '```json\n' + JSON.stringify(value, null, 2) + '\n```';

function endpointDoc(e) {
  const lines = [
    `# ${e.method} ${e.template}`,
    '',
    `- **Host**: \`${e.host}\``,
    `- **Hits**: ${e.count}`,
    `- **Response status**: ${e.responseStatus ?? '—'}`,
    `- **Query params**: ${e.queryKeys.length ? e.queryKeys.map((k) => `\`${k}\``).join(', ') : '—'}`,
    `- **Example**: \`${e.example}\``,
    '',
  ];
  if (e.requestShape !== undefined) lines.push('## Request body shape', jsonBlock(e.requestShape), '');
  if (e.responseShape !== undefined) lines.push('## Response shape', jsonBlock(e.responseShape), '');
  if (e.responseSample) lines.push('## Response sample (truncated)', '```\n' + e.responseSample + '\n```', '');
  return lines.join('\n');
}

/** Write the structured api-dump/ folder. Returns counts. */
export function writeDump(map, outDir) {
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  const endpoints = [...map.values()]
    .map((e) => ({ ...e, queryKeys: [...e.queryKeys].sort() }))
    .sort((a, b) => (a.template + a.method).localeCompare(b.template + b.method));

  const byService = new Map();
  for (const e of endpoints) {
    const svc = service(e.template);
    if (!byService.has(svc)) byService.set(svc, []);
    byService.get(svc).push(e);
    const dir = resolve(outDir, svc);
    mkdirSync(dir, { recursive: true });
    writeFileSync(resolve(dir, `${slug(e.method, e.template)}.md`), endpointDoc(e));
  }

  const index = [
    '# Crunchyroll API dump',
    '',
    `${endpoints.length} endpoints across ${byService.size} services.`,
    '',
  ];
  for (const svc of [...byService.keys()].sort()) {
    index.push(`## ${svc}`, '', '| Method | Endpoint | Status | Query params |', '| --- | --- | --- | --- |');
    for (const e of byService.get(svc)) {
      const file = `${svc}/${slug(e.method, e.template)}.md`;
      index.push(
        `| \`${e.method}\` | [\`${e.template}\`](${file}) | ${e.responseStatus ?? '—'} | ${e.queryKeys.join(', ') || '—'} |`,
      );
    }
    index.push('');
  }
  writeFileSync(resolve(outDir, 'README.md'), index.join('\n'));
  writeFileSync(resolve(outDir, '_raw.json'), JSON.stringify(endpoints, null, 2));
  return { endpoints: endpoints.length, services: byService.size };
}

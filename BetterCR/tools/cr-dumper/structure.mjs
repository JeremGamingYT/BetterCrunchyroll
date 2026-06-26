#!/usr/bin/env node
/*
 * BetterCR — Crunchyroll API dump structurer.
 *
 * Turns a capture into a clean, diff-friendly folder of per-endpoint docs.
 * Accepts either:
 *   - cr-api-capture.json  (from capture.js — includes request/response shapes)
 *   - a .har file          (DevTools › Network › Export HAR — zero in-page script)
 *
 * Usage:
 *   node structure.mjs cr-api-capture.json
 *   node structure.mjs session.har --out api-dump
 *
 * Output (default ./api-dump):
 *   api-dump/README.md                     index table grouped by service
 *   api-dump/_raw.json                     merged endpoint list (machine-readable)
 *   api-dump/<service>/<METHOD>__<path>.md one file per endpoint
 *
 * Re-running overwrites the files, so committing api-dump/ and re-dumping later
 * gives a clean `git diff` of exactly what Crunchyroll changed.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const SHAPE_DEPTH = 4;
const SHAPE_KEYS = 40;
const MAX_SAMPLE = 600;

function isApiUrl(url) {
  let u;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  const h = u.hostname;
  if (!(h === 'www.crunchyroll.com' || h.endsWith('.crunchyrollsvc.com'))) return false;
  if (/^\/(?:assets|static|images|fonts|_next)\//.test(u.pathname)) return false;
  return /\/(?:content|accounts|auth|subs|cms|music|index)\//.test(u.pathname) || /\/v\d+\//.test(u.pathname);
}

const looksLikeId = (s) =>
  s.includes(',') ||
  /^G[A-Z0-9]{5,}$/i.test(s) ||
  /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(s) ||
  /^\d+$/.test(s) ||
  (s.length >= 9 && /\d/.test(s) && /^[A-Za-z0-9_-]+$/.test(s));

const templatize = (pathname) =>
  pathname
    .split('/')
    .map((seg) => (looksLikeId(seg) ? '{id}' : seg))
    .join('/');

function shapeOf(value, depth = 0) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return value.length ? [shapeOf(value[0], depth + 1)] : [];
  const t = typeof value;
  if (t !== 'object') return t;
  if (depth >= SHAPE_DEPTH) return 'object';
  const out = {};
  for (const k of Object.keys(value).slice(0, SHAPE_KEYS)) out[k] = shapeOf(value[k], depth + 1);
  return out;
}

const parseJson = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

const service = (template) => template.split('/').filter(Boolean)[0] || 'misc';
const slug = (method, template) =>
  `${method}__${template.replace(/[/{}]+/g, '_').replace(/^_+|_+$/g, '')}`.slice(0, 120);

/** Merge a single observed call into the endpoint map. */
function add(map, { method, url, reqShape, status, resShape, resSample, queryKeys }) {
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

function fromCapture(json, map) {
  for (const e of json.endpoints || []) {
    add(map, {
      method: e.method,
      url: `https://${e.host}${e.example}`,
      reqShape: e.requestShape,
      status: e.responseStatus,
      resShape: e.responseShape,
      resSample: e.responseSample,
      queryKeys: e.queryKeys,
    });
  }
}

function fromHar(har, map) {
  for (const entry of har.log?.entries || []) {
    const { request, response } = entry;
    if (!request || !isApiUrl(request.url)) continue;
    const reqBody = parseJson(request.postData?.text || '');
    let resText = response?.content?.text || '';
    if (response?.content?.encoding === 'base64' && resText) {
      try {
        resText = Buffer.from(resText, 'base64').toString('utf8');
      } catch {
        resText = '';
      }
    }
    const resBody = parseJson(resText);
    add(map, {
      method: (request.method || 'GET').toUpperCase(),
      url: request.url,
      reqShape: reqBody !== undefined ? shapeOf(reqBody) : undefined,
      status: response?.status,
      resShape: resBody !== undefined ? shapeOf(resBody) : undefined,
      resSample: resBody !== undefined ? resText.slice(0, MAX_SAMPLE) : undefined,
    });
  }
}

function jsonBlock(value) {
  return '```json\n' + JSON.stringify(value, null, 2) + '\n```';
}

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

function write(map, outDir) {
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

  const index = ['# Crunchyroll API dump', '', `${endpoints.length} endpoints across ${byService.size} services.`, ''];
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

// ── main ──────────────────────────────────────────────────────
const args = process.argv.slice(2);
const input = args.find((a) => !a.startsWith('--'));
const outArg = args.indexOf('--out');
const outDir = resolve(outArg !== -1 ? args[outArg + 1] : 'api-dump');
if (!input) {
  console.error('usage: node structure.mjs <cr-api-capture.json | session.har> [--out api-dump]');
  process.exit(1);
}

const raw = readFileSync(resolve(input), 'utf8');
const json = parseJson(raw);
if (!json) {
  console.error(`error: ${input} is not valid JSON (HAR files are JSON too — re-export if needed).`);
  process.exit(1);
}

const map = new Map();
if (json.log?.entries) fromHar(json, map);
else if (json.endpoints) fromCapture(json, map);
else {
  console.error('error: unrecognized input (expected capture.js JSON with .endpoints, or a .har with .log.entries).');
  process.exit(1);
}

if (map.size === 0) {
  console.error('error: no Crunchyroll API calls found in the input.');
  process.exit(1);
}

const { endpoints, services } = write(map, outDir);
console.log(`✓ ${endpoints} endpoints · ${services} services → ${dirname(outDir)}/${outDir.split('/').pop()}/`);
console.log(`  open ${outDir}/README.md`);

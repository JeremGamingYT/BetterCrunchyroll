#!/usr/bin/env node
/*
 * BetterCR — offline API dump structurer.
 *
 * Turns an existing capture into a clean, diff-friendly api-dump/ folder.
 * Accepts either:
 *   - cr-api-capture.json  (from capture.js — includes request/response shapes)
 *   - a .har file          (DevTools › Network › Export HAR — zero in-page script)
 *
 * For a FULLY AUTOMATIC capture (no manual browsing), use `crawl.mjs` instead.
 *
 * Usage:
 *   node structure.mjs cr-api-capture.json
 *   node structure.mjs session.har --out api-dump
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { isApiUrl, shapeOf, parseJson, addCall, writeDump } from './lib.mjs';

const MAX_SAMPLE = 600;

function fromCapture(json, map) {
  for (const e of json.endpoints || []) {
    addCall(map, {
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
    addCall(map, {
      method: (request.method || 'GET').toUpperCase(),
      url: request.url,
      reqShape: reqBody !== undefined ? shapeOf(reqBody) : undefined,
      status: response?.status,
      resShape: resBody !== undefined ? shapeOf(resBody) : undefined,
      resSample: resBody !== undefined ? resText.slice(0, MAX_SAMPLE) : undefined,
    });
  }
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

const json = parseJson(readFileSync(resolve(input), 'utf8'));
if (!json) {
  console.error(`error: ${input} is not valid JSON.`);
  process.exit(1);
}

const map = new Map();
if (json.log?.entries) fromHar(json, map);
else if (json.endpoints) fromCapture(json, map);
else {
  console.error('error: unrecognized input (expected capture.js JSON .endpoints, or a .har .log.entries).');
  process.exit(1);
}

if (map.size === 0) {
  console.error('error: no Crunchyroll API calls found in the input.');
  process.exit(1);
}

const { endpoints, services } = writeDump(map, outDir);
console.log(`✓ ${endpoints} endpoints · ${services} services → ${outDir}/`);
console.log(`  open ${outDir}/README.md`);

#!/usr/bin/env node
/*
 * BetterCR — offline API dump structurer.
 *
 * Turns an existing capture into a clean, diff-friendly api-dump/ folder.
 * Accepts (auto-detected):
 *   - "Copy all as fetch" text  (DevTools › Network › right-click › Copy all as fetch)
 *   - a .har file               (DevTools › Network › Save all as HAR with content)
 *   - cr-api-capture.json        (from capture.js)
 *
 * Reads a file path, or stdin when none is given — so the easiest flow is:
 *   (Network tab → Copy all as fetch, then:)
 *   pbpaste | node structure.mjs            # macOS clipboard, no file needed
 *   node structure.mjs session.har
 *   node structure.mjs cr-api-capture.json --out api-dump
 *
 * For a FULLY AUTOMATIC capture, use `crawl.mjs` instead.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { isApiUrl, shapeOf, parseJson, addCall, writeDump } from './lib.mjs';

const MAX_SAMPLE = 600;

/** Parse Chrome DevTools "Copy all as fetch" output (request side only). */
function fromFetchDump(text, map) {
  for (const block of text.split(/\bfetch\(/).slice(1)) {
    const urlM = /^\s*["']([^"']+)["']/.exec(block);
    if (!urlM || !isApiUrl(urlM[1])) continue;
    const methodM = /["']method["']\s*:\s*["']([^"']+)["']/.exec(block);
    const bodyM = /["']body["']\s*:\s*"((?:\\.|[^"\\])*)"/.exec(block);
    let reqShape;
    if (bodyM) {
      try {
        const obj = parseJson(JSON.parse(`"${bodyM[1]}"`));
        if (obj !== undefined) reqShape = shapeOf(obj);
      } catch {
        /* non-JSON body */
      }
    }
    addCall(map, { method: (methodM?.[1] || 'GET').toUpperCase(), url: urlM[1], reqShape });
  }
}

/** Reads all of stdin to a string. */
async function readStdin() {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(c);
  return Buffer.concat(chunks).toString('utf8');
}

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
const outArg = args.indexOf('--out');
const outDir = resolve(outArg !== -1 ? args[outArg + 1] : 'api-dump');
const input = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--out' && a !== '-');

const raw = input ? readFileSync(resolve(input), 'utf8') : await readStdin();
if (!raw.trim()) {
  console.error(
    'usage: node structure.mjs <file> [--out api-dump]\n' +
      '   or: pbpaste | node structure.mjs        (after "Copy all as fetch" in the Network tab)',
  );
  process.exit(1);
}

const map = new Map();
const json = parseJson(raw);
if (json?.log?.entries) fromHar(json, map);
else if (json?.endpoints) fromCapture(json, map);
else if (/\bfetch\(\s*["']https?:\/\//.test(raw)) fromFetchDump(raw, map);
else {
  console.error('error: unrecognized input — expected a .har, capture.js JSON, or "Copy all as fetch" text.');
  process.exit(1);
}

if (map.size === 0) {
  console.error('error: no Crunchyroll API calls found in the input.');
  process.exit(1);
}

const { endpoints, services } = writeDump(map, outDir);
console.log(`✓ ${endpoints} endpoints · ${services} services → ${outDir}/`);
console.log(`  open ${outDir}/README.md`);

#!/usr/bin/env node
/*
 * BetterCR — fully-automatic Crunchyroll API crawler (Playwright).
 *
 * Drives a real Chrome, visits every Crunchyroll page it can, and captures ALL
 * API traffic at the browser network layer (so it sees everything — no isolated
 * world / fetch-wrapper blind spots), then writes the structured api-dump/.
 *
 * Login is needed once: the browser uses a PERSISTENT profile in ./.cr-profile,
 * so after you sign in the first time, every later run is fully automatic.
 *
 *   npm install                 # installs Playwright (once)
 *   node crawl.mjs              # first run: sign in when the window opens, Enter
 *   node crawl.mjs              # subsequent runs: 100% automatic
 *
 * Flags: --headless · --out <dir> · --locale fr · --mutate (also capture
 * watchlist add/remove, safely: it picks a title NOT in your list, adds then
 * removes it, leaving your account unchanged).
 */
import { chromium } from 'playwright';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { isApiUrl, shapeOf, addCall, writeDump } from './lib.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 ? args[i + 1] : def;
};
const LOCALE = opt('locale', 'fr');
const OUT = resolve(opt('out', resolve(HERE, 'api-dump')));
const HEADLESS = flag('headless');
const MUTATE = flag('mutate');
const BASE = 'https://www.crunchyroll.com';
const MAX_SAMPLE = 600;

const ask = (q) =>
  new Promise((res) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(q, (a) => {
      rl.close();
      res(a);
    });
  });

/** Read account id out of a CR access-token JWT. */
function accountFromToken(token) {
  try {
    const seg = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const p = JSON.parse(Buffer.from(seg, 'base64').toString('utf8'));
    return p.scopes?.cr?.acc_id || p.account_id || p.sub;
  } catch {
    return undefined;
  }
}

async function main() {
  const map = new Map();
  let token; // latest Bearer seen, for the optional mutation replay

  let context;
  try {
    context = await chromium.launchPersistentContext(resolve(HERE, '.cr-profile'), {
      headless: HEADLESS,
      channel: 'chrome',
      viewport: { width: 1440, height: 900 },
      locale: LOCALE === 'fr' ? 'fr-FR' : 'en-US',
    });
  } catch {
    // Fall back to the bundled Chromium if the system Chrome channel isn't found.
    context = await chromium.launchPersistentContext(resolve(HERE, '.cr-profile'), {
      headless: HEADLESS,
      viewport: { width: 1440, height: 900 },
      locale: LOCALE === 'fr' ? 'fr-FR' : 'en-US',
    });
  }

  const page = context.pages()[0] || (await context.newPage());

  page.on('response', (res) => {
    void (async () => {
      try {
        const req = res.request();
        const url = req.url();
        if (!isApiUrl(url)) return;
        const auth = req.headers()['authorization'];
        if (auth?.startsWith('Bearer ')) token = auth.slice(7);
        const reqBody = (() => {
          try {
            return JSON.parse(req.postData() || '');
          } catch {
            return undefined;
          }
        })();
        let resBody;
        let resText;
        try {
          resText = await res.text();
          resBody = JSON.parse(resText);
        } catch {
          /* non-JSON */
        }
        addCall(map, {
          method: req.method(),
          url,
          reqShape: reqBody !== undefined ? shapeOf(reqBody) : undefined,
          status: res.status(),
          resShape: resBody !== undefined ? shapeOf(resBody) : undefined,
          resSample: resBody !== undefined ? resText.slice(0, MAX_SAMPLE) : undefined,
        });
      } catch {
        /* never let capture break the crawl */
      }
    })();
  });

  // ── ensure logged in (one-time, persistent profile) ──
  await page.goto(`${BASE}/${LOCALE}`, { waitUntil: 'domcontentloaded' }).catch(() => {});
  const loggedIn = async () =>
    (await context.cookies(BASE)).some((c) => c.name === 'etp_rt' && c.value);
  if (!(await loggedIn())) {
    console.log('\n[crawl] Please sign in to Crunchyroll in the opened window.');
    await ask('[crawl] Press Enter here once you are logged in… ');
    if (!(await loggedIn())) {
      console.error('[crawl] Still not logged in (no etp_rt cookie). Aborting.');
      await context.close();
      process.exit(1);
    }
  }
  console.log('[crawl] logged in — crawling…');

  // ── visit pages ──
  const routes = [
    '',
    '/videos/popular',
    '/videos/new',
    '/videos/alphabetical',
    '/simulcasts',
    '/watchlist',
    '/history',
    '/account/profiles',
    '/account/preferences',
    '/search?q=one%20piece',
    '/news',
  ];
  const visit = async (path) => {
    const url = path.startsWith('http') ? path : `${BASE}/${LOCALE}${path}`;
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      for (let i = 0; i < 3; i += 1) {
        await page.mouse.wheel(0, 3000).catch(() => {});
        await page.waitForTimeout(700);
      }
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
      console.log(`  · ${path || '/'}`);
    } catch {
      console.log(`  · ${path || '/'} (skipped)`);
    }
  };
  for (const r of routes) await visit(r);

  // ── dynamic: a real series page + a watch page ──
  let seriesId;
  try {
    await visit('/videos/popular');
    const href = await page.locator('a[href*="/series/"]').first().getAttribute('href', { timeout: 5000 });
    const m = href && /\/series\/([A-Z0-9]+)/i.exec(href);
    if (m) {
      seriesId = m[1];
      await visit(`/series/${seriesId}`);
      const watch = await page
        .locator('a[href*="/watch/"]')
        .first()
        .getAttribute('href', { timeout: 5000 })
        .catch(() => null);
      if (watch) await visit(watch);
    }
  } catch {
    /* dynamic discovery best-effort */
  }

  // ── optional: capture watchlist mutations safely (add a not-in-list title, remove it) ──
  if (MUTATE && token) {
    const acc = accountFromToken(token);
    if (acc) {
      try {
        const H = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
        const q = `?locale=${LOCALE}-${LOCALE.toUpperCase()}`;
        const listRes = await context.request.get(`${BASE}/content/v2/discover/${acc}/watchlist?n=100`, { headers: H });
        const inList = new Set(
          (await listRes.json().catch(() => ({})))?.data?.map((d) => d.id || d.panel?.id).filter(Boolean) ?? [],
        );
        const browseRes = await context.request.get(`${BASE}/content/v2/discover/browse?n=30&type=series`, { headers: H });
        const candidate = ((await browseRes.json().catch(() => ({})))?.data ?? []).find((d) => d.id && !inList.has(d.id));
        if (candidate) {
          const addUrl = `${BASE}/content/v2/${acc}/watchlist${q}`;
          const addRes = await context.request.post(addUrl, { headers: H, data: { content_id: candidate.id } });
          addCall(map, {
            method: 'POST',
            url: addUrl,
            reqShape: { content_id: 'string' },
            status: addRes.status(),
            resShape: shapeOf(await addRes.json().catch(() => ({}))),
          });
          const delUrl = `${BASE}/content/v2/${acc}/watchlist/${candidate.id}${q}`;
          const delRes = await context.request.delete(delUrl, { headers: H });
          addCall(map, { method: 'DELETE', url: delUrl, status: delRes.status() });
          console.log(`  · watchlist add/remove (${candidate.id}) — captured + cleaned up`);
        }
      } catch {
        console.log('  · watchlist mutation capture skipped (error)');
      }
    }
  }

  await context.close();
  const { endpoints, services } = writeDump(map, OUT);
  console.log(`\n✓ ${endpoints} endpoints · ${services} services → ${OUT}/`);
  console.log(`  open ${OUT}/README.md`);
}

main().catch((e) => {
  console.error('[crawl] fatal:', e?.message || e);
  process.exit(1);
});

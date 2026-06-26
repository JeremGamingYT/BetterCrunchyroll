/*
 * BetterCR — Crunchyroll API capturer.
 *
 * Paste this whole file into the DevTools Console on https://www.crunchyroll.com
 * (logged in), then browse the site normally: home, a series page, a /watch page,
 * search, add/remove a watchlist item, open settings, etc. It hooks fetch + XHR,
 * records every Crunchyroll API call (collapsing ids so calls dedupe into stable
 * endpoint templates), and keeps a sample request/response *shape* for each.
 *
 * It persists to localStorage, so it survives full page reloads. When you've
 * exercised everything, run:
 *     __crDump.save()      // downloads cr-api-capture.json
 * then feed that file to `node structure.mjs cr-api-capture.json`.
 *
 * Other commands: __crDump.stats() · __crDump.json() · __crDump.clear()
 *
 * Captures ONLY Crunchyroll API hosts; analytics/ads/static are ignored. Request
 * and response bodies are reduced to a key/type *shape* (+ one small truncated
 * sample), so nothing sensitive beyond endpoint structure is stored. It still
 * contains your account UUID in example URLs — don't share the file blindly.
 */
(() => {
  const STORE_KEY = '__cr_dump_v1';
  const MAX_SAMPLE = 600; // chars of raw body kept per endpoint
  const SHAPE_DEPTH = 4;
  const SHAPE_KEYS = 40;

  /** Hosts whose traffic is the actual API (everything else is ignored). */
  const isApiUrl = (url) => {
    let u;
    try {
      u = new URL(url, location.origin);
    } catch {
      return false;
    }
    const h = u.hostname;
    const crHost = h === 'www.crunchyroll.com' || h.endsWith('.crunchyrollsvc.com');
    if (!crHost) return false;
    // Skip analytics/telemetry + non-API document/asset paths.
    if (/^\/(?:assets|static|images|fonts|_next)\//.test(u.pathname)) return false;
    return /\/(?:content|accounts|auth|subs|cms|music|index)\//.test(u.pathname) || /\/v\d+\//.test(u.pathname);
  };

  const looksLikeId = (s) =>
    s.includes(',') ||
    /^G[A-Z0-9]{5,}$/i.test(s) ||
    /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(s) ||
    /^\d+$/.test(s) ||
    (s.length >= 9 && /\d/.test(s) && /^[A-Za-z0-9_-]+$/.test(s));

  /** Collapse id-like path segments so calls group into one endpoint template. */
  const templatize = (pathname) =>
    pathname
      .split('/')
      .map((seg) => (looksLikeId(seg) ? '{id}' : seg))
      .join('/');

  /** Reduce an arbitrary JSON value to a compact key/type shape. */
  const shapeOf = (value, depth = 0) => {
    if (value === null) return 'null';
    if (Array.isArray(value)) return value.length ? [shapeOf(value[0], depth + 1)] : [];
    const t = typeof value;
    if (t !== 'object') return t;
    if (depth >= SHAPE_DEPTH) return 'object';
    const out = {};
    for (const k of Object.keys(value).slice(0, SHAPE_KEYS)) out[k] = shapeOf(value[k], depth + 1);
    return out;
  };

  const parseJson = (text) => {
    if (!text) return undefined;
    try {
      return JSON.parse(text);
    } catch {
      return undefined;
    }
  };

  const load = () => {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
    } catch {
      return {};
    }
  };
  let store = load();
  const persist = () => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(store));
    } catch {
      /* quota — keep in memory */
    }
  };

  const record = (method, url, reqBodyText, status, resBodyText) => {
    let u;
    try {
      u = new URL(url, location.origin);
    } catch {
      return;
    }
    const template = templatize(u.pathname);
    const key = `${method} ${template}`;
    const entry = store[key] || {
      method,
      template,
      host: u.hostname,
      count: 0,
      queryKeys: [],
      example: u.pathname + u.search,
      requestShape: undefined,
      responseStatus: undefined,
      responseShape: undefined,
      responseSample: undefined,
    };
    entry.count += 1;
    const qk = new Set(entry.queryKeys);
    u.searchParams.forEach((_v, k) => qk.add(k));
    entry.queryKeys = [...qk].sort();
    if (entry.requestShape === undefined) {
      const body = parseJson(reqBodyText);
      if (body !== undefined) entry.requestShape = shapeOf(body);
    }
    if (typeof status === 'number') entry.responseStatus = status;
    if (entry.responseShape === undefined && resBodyText) {
      const body = parseJson(resBodyText);
      if (body !== undefined) {
        entry.responseShape = shapeOf(body);
        entry.responseSample = resBodyText.slice(0, MAX_SAMPLE);
      }
    }
    store[key] = entry;
    persist();
  };

  const bodyToText = (body) => {
    if (typeof body === 'string') return body;
    return undefined; // skip FormData/Blob/etc.
  };

  // ── hook fetch ────────────────────────────────────────────────
  const origFetch = window.fetch;
  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : input && input.url;
    const method = ((init && init.method) || (input && input.method) || 'GET').toUpperCase();
    const reqBody = bodyToText(init && init.body);
    const p = origFetch.apply(this, arguments);
    if (url && isApiUrl(url)) {
      p.then((res) => {
        const status = res.status;
        res
          .clone()
          .text()
          .then((txt) => record(method, url, reqBody, status, txt))
          .catch(() => record(method, url, reqBody, status, undefined));
      }).catch(() => {});
    }
    return p;
  };

  // ── hook XMLHttpRequest ───────────────────────────────────────
  const OrigXHR = window.XMLHttpRequest;
  const origOpen = OrigXHR.prototype.open;
  const origSend = OrigXHR.prototype.send;
  OrigXHR.prototype.open = function (method, url) {
    this.__cr = { method: (method || 'GET').toUpperCase(), url };
    return origOpen.apply(this, arguments);
  };
  OrigXHR.prototype.send = function (body) {
    const meta = this.__cr;
    if (meta && isApiUrl(meta.url)) {
      this.addEventListener('loadend', () => {
        let txt;
        try {
          txt = typeof this.responseText === 'string' ? this.responseText : undefined;
        } catch {
          txt = undefined;
        }
        record(meta.method, meta.url, bodyToText(body), this.status, txt);
      });
    }
    return origSend.apply(this, arguments);
  };

  // ── public API ────────────────────────────────────────────────
  const toArray = () =>
    Object.values(store).sort((a, b) => (a.template + a.method).localeCompare(b.template + b.method));
  window.__crDump = {
    stats() {
      const arr = toArray();
      console.table(arr.map((e) => ({ endpoint: `${e.method} ${e.template}`, hits: e.count, status: e.responseStatus })));
      console.log(`%c[cr-dump] ${arr.length} endpoints captured`, 'color:#ff8133;font-weight:700');
      return arr.length;
    },
    json() {
      return { version: 1, capturedOn: location.hostname, count: toArray().length, endpoints: toArray() };
    },
    save() {
      const blob = new Blob([JSON.stringify(this.json(), null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'cr-api-capture.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      console.log('%c[cr-dump] saved cr-api-capture.json', 'color:#3fc08a;font-weight:700');
    },
    clear() {
      store = {};
      persist();
      console.log('[cr-dump] cleared');
    },
  };

  console.log(
    `%c[cr-dump] capturing Crunchyroll API… browse the site, then run __crDump.save()`,
    'color:#ff8133;font-weight:700',
  );
  console.log(`[cr-dump] restored ${toArray().length} endpoints from a previous session`);
})();

// BetterCrunchyroll - Content Script
// Injects into page context to intercept Crunchyroll's token
// Watch pages: Direct DOM injection (DISABLED)
// Other pages: iframe overlay

(function () {
    'use strict';

    // Guard: Don't run in iframes or if already initialized
    if (window.self !== window.top) {
        console.log('[BetterCrunchyroll] Skipping - running in iframe');
        return;
    }

    if (window.__BCR_INITIALIZED__) {
        console.log('[BetterCrunchyroll] Skipping - already initialized');
        return;
    }
    window.__BCR_INITIALIZED__ = true;

    console.log('[BetterCrunchyroll] Content script starting...');

    const CONFIG = {
        appUrl: 'http://localhost:3000',
    };

    if (window.location.origin === CONFIG.appUrl) {
        console.log('[BetterCrunchyroll] Local dev page detected - skipping extension injection');
        return;
    }

    // ===============================
    // Inject script via external file (bypasses CSP)
    // ===============================

    function injectInterceptor() {
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('injected-script.js');
        script.onload = function () {
            console.log('[BetterCrunchyroll] Interceptor script loaded successfully');
            this.remove();
        };
        script.onerror = function () {
            console.error('[BetterCrunchyroll] Failed to load interceptor script');
        };
        (document.head || document.documentElement).appendChild(script);
        console.log('[BetterCrunchyroll] Interceptor script injection initiated');
    }

    function injectDataSyncScript() {
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('data-sync.js');
        script.onload = function () {
            console.log('[BetterCrunchyroll] Data Sync script loaded successfully');
            this.remove();
        };
        script.onerror = function () {
            console.error('[BetterCrunchyroll] Failed to load Data Sync script');
        };
        (document.head || document.documentElement).appendChild(script);
        console.log('[BetterCrunchyroll] Data Sync script injection initiated');
    }

    // Inject IMMEDIATELY
    injectInterceptor();
    injectDataSyncScript();

    // ===============================
    // Token Storage
    // ===============================

    let accessToken = null;
    let tokenExpiry = 0;
    let accountId = null;
    let profileId = null;

    window.addEventListener('bcr-token', (event) => {
        const { token, expiresIn, accountId: accId, profileId: profId } = event.detail;
        accessToken = token;
        tokenExpiry = Date.now() + (expiresIn * 1000) - 30000;
        accountId = accId;
        profileId = profId;

        console.log('[BetterCrunchyroll] ✅ Token received!');

        const tokenData = { token: accessToken, expiry: tokenExpiry, accountId, profileId };

        try {
            localStorage.setItem('bcr_token', JSON.stringify(tokenData));
        } catch (e) {
            console.warn('[BetterCrunchyroll] localStorage save failed:', e);
        }

        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.set({ bcr_token: tokenData });
        }
    });

    async function loadStoredToken() {
        try {
            const cached = localStorage.getItem('bcr_token');
            if (cached) {
                const data = JSON.parse(cached);
                if (Date.now() < data.expiry) {
                    accessToken = data.token;
                    tokenExpiry = data.expiry;
                    accountId = data.accountId;
                    profileId = data.profileId;
                    console.log('[BetterCrunchyroll] Loaded token from localStorage');
                    return true;
                }
            }

            if (typeof chrome !== 'undefined' && chrome.storage) {
                const result = await new Promise(resolve => {
                    chrome.storage.local.get('bcr_token', resolve);
                });

                if (result.bcr_token && Date.now() < result.bcr_token.expiry) {
                    accessToken = result.bcr_token.token;
                    tokenExpiry = result.bcr_token.expiry;
                    accountId = result.bcr_token.accountId;
                    profileId = result.bcr_token.profileId;
                    console.log('[BetterCrunchyroll] Loaded token from chrome.storage');
                    return true;
                }
            }
        } catch (e) {
            console.warn('[BetterCrunchyroll] Error loading stored token:', e);
        }
        return false;
    }

    // ===============================
    // API Functions
    // ===============================

    async function makeApiRequest(endpoint, params = {}, options = {}) {
        // Retry logic for token availability
        if (!accessToken || Date.now() >= tokenExpiry) {
            await loadStoredToken();
        }

        // If still no token, wait up to 5 seconds
        if (!accessToken || Date.now() >= tokenExpiry) {
            console.log('[BetterCrunchyroll] Waiting for token before API request...');
            let attempts = 0;
            while ((!accessToken || Date.now() >= tokenExpiry) && attempts < 50) {
                await new Promise(r => setTimeout(r, 100));
                attempts++;
                // Try reloading from storage periodically (in case another tab refreshed it)
                if (attempts % 10 === 0) await loadStoredToken();
            }
        }

        if (!accessToken || Date.now() >= tokenExpiry) {
            throw new Error('No valid token available. Please refresh the page.');
        }

        const url = new URL(`https://www.crunchyroll.com${endpoint}`);
        if (!params.locale) params.locale = 'fr-FR';
        if (!params.preferred_audio_language) params.preferred_audio_language = 'fr-FR';

        Object.entries(params).forEach(([key, value]) => {
            url.searchParams.append(key, value);
        });

        console.log('[BetterCrunchyroll] Making API request:', endpoint);

        const response = await fetch(url.toString(), {
            method: options.method || 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json',
                ...(options.body ? { 'Content-Type': 'application/json' } : {}),
            },
            credentials: 'include',
            body: options.body ? JSON.stringify(options.body) : undefined,
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        return await response.json();
    }

    // ===============================
    // Watch Page: Player Enhancements
    // ===============================

    function isWatchPage() {
        return /\/watch\//.test(window.location.pathname);
    }

    function injectPlayerEnhancements() {
        if (
            window.__BCR_PLAYER_ENHANCEMENTS_LOADED__ ||
            window.__BCR_PLAYER_ENHANCEMENTS_LOADING__ ||
            document.getElementById('bcr-player-controls')
        ) {
            return;
        }
        window.__BCR_PLAYER_ENHANCEMENTS_LOADING__ = true;

        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('player-enhancements.js');
        script.onload = function () {
            window.__BCR_PLAYER_ENHANCEMENTS_LOADING__ = false;
            window.__BCR_PLAYER_ENHANCEMENTS_LOADED__ = true;
            console.log('[BetterCrunchyroll] Player enhancements loaded');
            this.remove();
        };
        script.onerror = function () {
            window.__BCR_PLAYER_ENHANCEMENTS_LOADING__ = false;
            console.error('[BetterCrunchyroll] Failed to load player enhancements');
        };
        (document.head || document.documentElement).appendChild(script);
        console.log('[BetterCrunchyroll] Player enhancements injection initiated');
    }

    async function injectWatchPageUI() {
        if (isWatchPage()) {
            injectPlayerEnhancements();
        }
    }

    // ===============================
    // Other Pages: Iframe Injection
    // ===============================

    function mapToAppUrl(path) {
        const hashMatch = window.location.hash.match(/^#bcr=(.+)$/);
        if (hashMatch) {
            try {
                const appPath = decodeURIComponent(hashMatch[1]);
                return appPath.startsWith('/') ? appPath : `/${appPath}`;
            } catch {
                return '/';
            }
        }

        const clean = path.replace(/^\/[a-z]{2}(?=\/|$)/, '');

        if (/^\/?$/.test(clean) || /^\/discover/.test(clean)) return '/';

        const seriesMatch = clean.match(/^\/series\/([A-Z0-9]+)/);
        if (seriesMatch) return `/anime/${seriesMatch[1]}`;

        const watchMatch = clean.match(/^\/watch\/([A-Za-z0-9\-_]+)/);
        if (watchMatch) return `/watch/${watchMatch[1]}`;

        if (/^\/search/.test(clean)) return `/search${window.location.search || ''}`;
        if (/^\/simulcast|\/seasonal/.test(clean)) return '/simulcast';
        if (/^\/watchlist/.test(clean)) return '/watchlist';
        if (/^\/videos\/movies|^\/movies|^\/films/.test(clean)) return '/films';

        return '/';
    }

    function isBetterCrunchyrollAppPath(path) {
        return [
            '/parametres',
            '/populaire',
            '/films',
            '/nouveau',
            '/simulcast',
            '/watchlist',
            '/search',
        ].some((prefix) => path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`));
    }

    function removeIframeUI() {
        const existing = document.getElementById('bettercrunchyroll-root');
        if (existing) existing.remove();
    }

    function injectIframeUI(appPath, options = {}) {
        if (!document.body) return false;

        const targetSrc = CONFIG.appUrl + appPath;
        let root = document.getElementById('bettercrunchyroll-root');
        let iframe = document.getElementById('bcr-frame');

        if (root && iframe && iframe.src === targetSrc && !options.force) {
            return true;
        }

        if (!root || root.parentNode !== document.body) {
            if (root) root.remove();
            root = document.createElement('div');
            root.id = 'bettercrunchyroll-root';
            document.body.appendChild(root);
        }

        root.style.cssText = [
            'position: fixed',
            'inset: 0',
            'z-index: 2147483647',
            'width: 100vw',
            'height: 100vh',
            'pointer-events: none',
            'background: #0a0a0a',
        ].join(';');

        if (!iframe || iframe.parentNode !== root) {
            if (iframe) iframe.remove();
            iframe = document.createElement('iframe');
            iframe.id = 'bcr-frame';
            iframe.allow = 'fullscreen; autoplay; encrypted-media; picture-in-picture';
            iframe.onload = () => console.log('[BetterCrunchyroll] App loaded');
            iframe.onerror = () => {
                root.style.pointerEvents = 'auto';
                root.innerHTML = `
                    <div style="background:#050505;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#fff;font-family:system-ui,sans-serif;text-align:center;">
                        <h1>BetterCrunchyroll Error</h1>
                        <p>Check console / npm run dev</p>
                    </div>
                `;
            };
            root.appendChild(iframe);
        }

        iframe.src = targetSrc;
        iframe.style.cssText = 'width:100%;height:100%;border:0;background:#0a0a0a;pointer-events:auto;display:block;';
        console.log('[BetterCrunchyroll] Iframe UI ready:', appPath);
        return true;
    }

    function ensureCurrentPageUI(options = {}) {
        if (isWatchPage()) {
            removeIframeUI();
            injectPlayerEnhancements();
            return;
        }

        injectIframeUI(mapToAppUrl(window.location.pathname), options);
    }

    // ===============================
    // Message Handler (from iframe)
    // ===============================

    window.addEventListener('message', async (event) => {
        if (!event.origin.includes('localhost')) return;

        const { type, id, endpoint, params, path, method, body } = event.data || {};

        if (type === 'BCR_NAVIGATE') {
            console.log('[BetterCrunchyroll] Navigation request to:', path);

            const localeMatch = window.location.pathname.match(/^\/([a-z]{2})\//);
            const locale = localeMatch ? localeMatch[1] : 'fr';

            let crunchyrollPath = `/${locale}`;
            let keepAppRouteInHash = false;

            const animeMatch = path.match(/^\/anime\/([A-Z0-9]+)/);
            if (animeMatch) crunchyrollPath = `/${locale}/series/${animeMatch[1]}`;

            const watchMatch = path.match(/^\/watch\/([A-Za-z0-9\-_]+)/);
            if (watchMatch) {
                crunchyrollPath = `/${locale}/watch/${watchMatch[1]}`;
                // CRITICAL FIX: Force full page load for watch page to ensure official player loads
                console.log('[BetterCrunchyroll] Navigating to Watch Page (Full Redirect):', crunchyrollPath);
                window.location.href = crunchyrollPath;
                return;
            }

            if (isBetterCrunchyrollAppPath(path)) {
                keepAppRouteInHash = true;
                crunchyrollPath = window.location.pathname;
            }

            // CRITICAL FIX: Only navigate if URL actually changed to prevent infinite loop
            const nextUrl = keepAppRouteInHash
                ? `${crunchyrollPath}#bcr=${encodeURIComponent(path)}`
                : crunchyrollPath;

            if (nextUrl === `${window.location.pathname}${window.location.hash || ''}`) {
                console.log('[BetterCrunchyroll] URL unchanged, skipping navigation');
                return;
            }

            // Use pushState to update URL without reload (prevents infinite loop)
            console.log('[BetterCrunchyroll] Updating URL via pushState:', nextUrl);
            window.history.pushState({}, '', nextUrl);
            lastUrl = window.location.href; // Sync navigation watcher
            return;
        }

        if (type === 'CRUNCHYROLL_API_REQUEST') {
            try {
                const data = await makeApiRequest(endpoint, params || {}, { method, body });
                event.source.postMessage({
                    type: 'CRUNCHYROLL_API_RESPONSE',
                    id,
                    success: true,
                    data,
                }, event.origin);
            } catch (error) {
                event.source.postMessage({
                    type: 'CRUNCHYROLL_API_RESPONSE',
                    id,
                    success: false,
                    error: error.message,
                }, event.origin);
            }
        }

        if (type === 'CRUNCHYROLL_CHECK_TOKEN') {
            event.source.postMessage({
                type: 'CRUNCHYROLL_TOKEN_STATUS',
                hasToken: !!(accessToken && Date.now() < tokenExpiry),
                accountId: accountId,
                profileId: profileId,
            }, event.origin);
        }

        // Auth proxy: lets the iframe log in using real browser cookies (bypasses Cloudflare)
        if (type === 'CRUNCHYROLL_AUTH_REQUEST') {
            const { username, password } = event.data || {};
            console.log('[BetterCrunchyroll] 🔑 Auth request received for:', username);
            // xunihvedbt3mbisuhevt: ETP client – the only CR client that supports grant_type=password.
            // noaihdevm_6iyg0a8l0q is the web PKCE client and rejects password grant (400 unsupported_grant_type).
            const BASIC = 'eHVuaWh2ZWRidDNtYmlzdWhldnQ6MWtJUzVkeVR2akUwX3JxYUEzWWVBaDBiVVhVbXhXMTE=';
            const etpId = crypto.randomUUID();
            const deviceId = crypto.randomUUID();

            const body = new URLSearchParams();
            body.append('username', username || '');
            body.append('password', password || '');
            body.append('grant_type', 'password');
            body.append('scope', 'offline_access');
            body.append('device_id', deviceId);
            body.append('device_name', 'BetterCrunchyroll');
            body.append('device_type', 'com.crunchyroll.windows.desktop');

            try {
                console.log('[BetterCrunchyroll] 🔊 Sending auth fetch to Crunchyroll...');
                const resp = await fetch('https://www.crunchyroll.com/auth/v1/token', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Basic ${BASIC}`,
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'ETP-Anonymous-ID': etpId,
                        'Accept': 'application/json, text/plain, */*',
                        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8',
                        'Origin': 'https://www.crunchyroll.com',
                        'Referer': 'https://www.crunchyroll.com/login',
                    },
                    credentials: 'include',
                    body: body.toString(),
                });

                console.log('[BetterCrunchyroll] Auth response status:', resp.status);

                if (!resp.ok) {
                    const errData = await resp.json().catch(() => ({}));
                    console.error('[BetterCrunchyroll] Auth failed:', errData);
                    event.source.postMessage({
                        type: 'CRUNCHYROLL_AUTH_RESPONSE',
                        id,
                        success: false,
                        error: errData.error_description || errData.message || 'Identifiants incorrects',
                    }, event.origin);
                    return;
                }

                const data = await resp.json();
                console.log('[BetterCrunchyroll] ✅ Auth success, token received');

                // Store in content-script state so subsequent API calls work immediately
                if (data.access_token) {
                    accessToken = data.access_token;
                    tokenExpiry = Date.now() + ((data.expires_in || 300) * 1000) - 30000;
                    window.__BCR_TOKEN__ = data.access_token;
                    window.__BCR_TOKEN_EXPIRY__ = tokenExpiry;
                    window.__BCR_ACCOUNT_ID__ = data.account_id;
                    window.__BCR_PROFILE_ID__ = data.profile_id;
                    try {
                        localStorage.setItem('bcr_token', JSON.stringify({
                            token: accessToken, expiry: tokenExpiry,
                            accountId: data.account_id, profileId: data.profile_id
                        }));
                    } catch (e) {}
                    if (typeof chrome !== 'undefined' && chrome.storage) {
                        chrome.storage.local.set({ bcr_token: {
                            token: accessToken, expiry: tokenExpiry,
                            accountId: data.account_id, profileId: data.profile_id
                        }});
                    }
                }

                event.source.postMessage({
                    type: 'CRUNCHYROLL_AUTH_RESPONSE',
                    id,
                    success: true,
                    data: {
                        access_token: data.access_token,
                        refresh_token: data.refresh_token,
                        expires_in: data.expires_in,
                        account_id: data.account_id,
                    },
                }, event.origin);
            } catch (err) {
                console.error('[BetterCrunchyroll] Auth fetch error:', err);
                event.source.postMessage({
                    type: 'CRUNCHYROLL_AUTH_RESPONSE',
                    id,
                    success: false,
                    error: 'Impossible de contacter Crunchyroll',
                }, event.origin);
            }
        }
    });

    // ===============================
    // Initialization
    // ===============================

    async function init() {
        console.log('[BetterCrunchyroll] Waiting for page to load and token...');

        await loadStoredToken();

        if (document.readyState === 'loading') {
            await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
        }

        // Wait for token
        let waited = 0;
        while (!accessToken && waited < 5000) {
            await new Promise(r => setTimeout(r, 100));
            waited += 100;
        }

        if (accessToken) {
            console.log('[BetterCrunchyroll] ✅ Token ready');
        } else {
            console.log('[BetterCrunchyroll] ⚠️ No token yet, proceeding anyway');
        }

        // Check server once before showing the local app.
        if (!isWatchPage()) {
            try {
                await fetch(CONFIG.appUrl, { method: 'HEAD', mode: 'no-cors' });
            } catch (e) {
                console.error('[BetterCrunchyroll] Dev server not available');
                return;
            }
        }

        ensureCurrentPageUI({ force: true });
        setTimeout(() => ensureCurrentPageUI(), 500);
        setTimeout(() => ensureCurrentPageUI(), 1500);
        window.addEventListener('load', () => ensureCurrentPageUI(), { once: true });
        window.addEventListener('pageshow', () => ensureCurrentPageUI());
    }

    // Start initialization
    if (document.readyState !== 'loading') {
        init();
    } else {
        document.addEventListener('DOMContentLoaded', init);
    }

    // Handle SPA navigation (URL changes without page reload)
    let lastUrl = location.href;
    let navigationCheckInterval = null;

    // Use interval instead of MutationObserver to avoid infinite loops
    function startNavigationWatcher() {
        if (navigationCheckInterval) return;

        navigationCheckInterval = setInterval(() => {
            if (location.href !== lastUrl) {
                const previousUrl = lastUrl;
                lastUrl = location.href;
                console.log('[BetterCrunchyroll] URL changed:', previousUrl, '->', lastUrl);

                // Only handle if page type changed
                const wasWatchPage = /\/watch\//.test(previousUrl);
                const isNowWatchPage = isWatchPage();

                if (isNowWatchPage && !wasWatchPage) {
                    // Navigated TO watch page, reload to ensure official player loads clean
                    console.log('[BetterCrunchyroll] Navigated to Watch Page - Reloading...');
                    window.location.reload();
                } else if (!isNowWatchPage && wasWatchPage) {
                    // Navigated AWAY from watch page
                    document.body.classList.remove('bcr-watch-page');
                    ensureCurrentPageUI({ force: true });
                } else if (isNowWatchPage && wasWatchPage) {
                    // Watch page internal navigation
                    console.log('[BetterCrunchyroll] Watch Page internal nav - Reloading...');
                    window.location.reload();
                } else {
                    ensureCurrentPageUI({ force: true });
                }
            }
            if (!isWatchPage() && !document.getElementById('bcr-frame')) {
                ensureCurrentPageUI();
            }
        }, 500);
    }

    startNavigationWatcher();

    // Handle popstate (back/forward navigation)
    window.addEventListener('popstate', () => {
        console.log('[BetterCrunchyroll] Popstate event');
        lastUrl = location.href; // Sync to prevent double handling

        if (isWatchPage()) {
            // Reload to clear iframe overlay if present and load official player
            window.location.reload();
        } else {
            ensureCurrentPageUI({ force: true });
        }
    });

})();

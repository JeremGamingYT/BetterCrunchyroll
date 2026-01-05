// BetterCrunchyroll - Content Script
// Injects into page context to intercept Crunchyroll's token
// Watch pages: Direct DOM injection
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

    // Inject IMMEDIATELY
    injectInterceptor();

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

    async function makeApiRequest(endpoint, params = {}) {
        if (!accessToken || Date.now() >= tokenExpiry) {
            await loadStoredToken();
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
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json',
            },
            credentials: 'include',
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        return await response.json();
    }

    // ===============================
    // Watch Page: Direct DOM Injection
    // ===============================

    function isWatchPage() {
        return /\/watch\//.test(window.location.pathname);
    }

    function getEpisodeIdFromUrl() {
        const match = window.location.pathname.match(/\/watch\/([A-Z0-9]+)/i);
        return match ? match[1] : null;
    }

    // Wait for player container to exist in DOM
    function waitForPlayerContainer(timeout = 10000) {
        return new Promise((resolve) => {
            const selectors = [
                '#vilos',
                '#vilosRoot',
                '#velocity-player-package',
                '[data-testid="vilos-player"]',
                '.video-player-wrapper',
                '.erc-video-container',
                '[class*="player"]',
                'video'
            ];

            const check = () => {
                for (const selector of selectors) {
                    const el = document.querySelector(selector);
                    if (el) {
                        console.log('[BetterCrunchyroll] Found player container:', selector);
                        return el;
                    }
                }
                return null;
            };

            // Check immediately
            const found = check();
            if (found) {
                resolve(found);
                return;
            }

            // Set up observer
            const startTime = Date.now();
            const observer = new MutationObserver(() => {
                const found = check();
                if (found) {
                    observer.disconnect();
                    resolve(found);
                } else if (Date.now() - startTime > timeout) {
                    observer.disconnect();
                    console.warn('[BetterCrunchyroll] Timeout waiting for player container');
                    resolve(null);
                }
            });

            observer.observe(document.body || document.documentElement, {
                childList: true,
                subtree: true
            });

            // Also set a timeout fallback
            setTimeout(() => {
                observer.disconnect();
                resolve(check());
            }, timeout);
        });
    }

    // Track injection state
    let isInjecting = false;
    let lastInjectionTime = 0;

    async function fetchEpisodeData(episodeId) {
        try {
            // Fetch episode info
            const episodeResponse = await makeApiRequest(`/content/v2/cms/objects/${episodeId}`, {
                ratings: 'true'
            });
            const episode = episodeResponse.data?.[0];

            if (!episode) {
                throw new Error('Episode not found');
            }

            // Fetch series info
            const seriesId = episode.episode_metadata?.series_id || episode.series_id;
            let series = { id: seriesId, title: episode.episode_metadata?.series_title || 'Série' };
            let episodes = [episode];

            if (seriesId) {
                try {
                    const seriesResponse = await makeApiRequest(`/content/v2/cms/series/${seriesId}`, {});
                    if (seriesResponse.data?.[0]) {
                        series = seriesResponse.data[0];
                    }

                    // Fetch all episodes of the season
                    const seasonId = episode.episode_metadata?.season_id;
                    if (seasonId) {
                        const episodesResponse = await makeApiRequest(`/content/v2/cms/seasons/${seasonId}/episodes`, {});
                        if (episodesResponse.data) {
                            episodes = episodesResponse.data;
                        }
                    }
                } catch (e) {
                    console.warn('[BetterCrunchyroll] Failed to fetch series/episodes:', e);
                }
            }

            return { episode, series, episodes };
        } catch (error) {
            console.error('[BetterCrunchyroll] Error fetching episode data:', error);
            return null;
        }
    }

    function cleanWatchPageForDOMInjection() {
        // Add marker class - CSS will handle hiding elements
        // CRITICAL: We do NOT remove any elements to preserve player functionality
        document.body.classList.add('bcr-watch-page');
        console.log('[BetterCrunchyroll] Watch page marked for BCR mode (CSS will hide elements)');
    }

    async function injectWatchPageUI() {
        // Prevent concurrent injections
        if (isInjecting) {
            console.log('[BetterCrunchyroll] Injection already in progress, skipping');
            return;
        }

        // Debounce rapid calls
        const now = Date.now();
        if (now - lastInjectionTime < 500) {
            console.log('[BetterCrunchyroll] Debouncing injection');
            return;
        }
        lastInjectionTime = now;
        isInjecting = true;

        console.log('[BetterCrunchyroll] Injecting Watch Page UI via DOM...');

        try {
            // Load the UI module
            if (!window.WatchPageUI) {
                await new Promise((resolve, reject) => {
                    const existingScript = document.querySelector('script[src*="watch-ui.js"]');
                    if (existingScript) {
                        // Wait a bit for it to load
                        setTimeout(resolve, 200);
                        return;
                    }
                    const script = document.createElement('script');
                    script.src = chrome.runtime.getURL('watch-ui.js');
                    script.onload = () => {
                        console.log('[BetterCrunchyroll] Watch UI module loaded');
                        setTimeout(resolve, 100); // Small delay for script execution
                    };
                    script.onerror = reject;
                    document.head.appendChild(script);
                });
            }

            // Clean up existing injected UI
            const existingUI = document.getElementById('bcr-ui');
            if (existingUI) existingUI.remove();

            // Clean Crunchyroll UI
            cleanWatchPageForDOMInjection();

            // Get episode ID
            const episodeId = getEpisodeIdFromUrl();
            if (!episodeId) {
                console.error('[BetterCrunchyroll] Could not get episode ID from URL');
                return;
            }

            // Wait for player container
            const playerContainer = await waitForPlayerContainer(8000);

            // Show loading state
            const loadingDiv = document.createElement('div');
            loadingDiv.id = 'bcr-ui';
            loadingDiv.innerHTML = `
                <div style="background:#0a0a0a;padding:40px;text-align:center;">
                    <div style="width:40px;height:40px;border:3px solid rgba(249,115,22,0.3);border-top-color:#f97316;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto;"></div>
                    <p style="color:#a1a1a1;margin-top:16px;">Chargement des informations...</p>
                </div>
            `;

            if (playerContainer) {
                // Insert after player
                playerContainer.after(loadingDiv);
            } else {
                // Fallback: append to body
                document.body.appendChild(loadingDiv);
            }

            // Fetch data
            const data = await fetchEpisodeData(episodeId);

            if (!data) {
                loadingDiv.innerHTML = `
                    <div style="background:#0a0a0a;padding:40px;text-align:center;">
                        <p style="color:#f97316;font-size:18px;font-weight:bold;">Erreur de chargement</p>
                        <p style="color:#a1a1a1;margin-top:8px;">Impossible de charger les informations de l'épisode.</p>
                    </div>
                `;
                return;
            }

            const { episode, series, episodes } = data;

            // Render UI
            if (window.WatchPageUI) {
                loadingDiv.outerHTML = window.WatchPageUI.render(episode, series, episodes, episodeId);

                // Setup event listeners
                const uiContainer = document.getElementById('bcr-ui');
                if (uiContainer) {
                    window.WatchPageUI.setupEventListeners(uiContainer);
                    window.WatchPageUI.updateDetails(episode);
                }

                console.log('[BetterCrunchyroll] Watch page UI injected successfully');
            }
        } catch (error) {
            console.error('[BetterCrunchyroll] Error injecting UI:', error);
        } finally {
            isInjecting = false;
        }
    }

    // ===============================
    // Other Pages: Iframe Injection
    // ===============================

    function mapToAppUrl(path) {
        const clean = path.replace(/^\/[a-z]{2}(?=\/|$)/, '');

        if (/^\/?$/.test(clean) || /^\/discover/.test(clean)) return '/';

        const seriesMatch = clean.match(/^\/series\/([A-Z0-9]+)/);
        if (seriesMatch) return `/anime/${seriesMatch[1]}`;

        const watchMatch = clean.match(/^\/watch\/([A-Za-z0-9\-_]+)/);
        if (watchMatch) return `/watch/${watchMatch[1]}`;

        if (/^\/search/.test(clean)) return '/search';
        if (/^\/simulcast|\/seasonal/.test(clean)) return '/simulcast';
        if (/^\/watchlist/.test(clean)) return '/watchlist';

        return '/';
    }

    function injectIframeUI(appPath) {
        console.log('[BetterCrunchyroll] Injecting iframe UI for path:', appPath);

        // Remove any existing injection
        const existing = document.getElementById('bettercrunchyroll-root');
        if (existing) existing.remove();

        // Container
        const root = document.createElement('div');
        root.id = 'bettercrunchyroll-root';
        root.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 2147483647; pointer-events: none;';
        document.body.appendChild(root);

        // Iframe
        const iframe = document.createElement('iframe');
        iframe.id = 'bcr-frame';
        iframe.src = CONFIG.appUrl + appPath;
        iframe.style.cssText = 'width:100%;height:100%;border:none;background:#0a0a0a;pointer-events: auto;';
        iframe.allow = 'fullscreen; autoplay; encrypted-media; picture-in-picture';

        iframe.onload = () => console.log('[BetterCrunchyroll] ✅ App loaded');
        iframe.onerror = () => {
            root.style.pointerEvents = 'auto';
            root.innerHTML = `
                <div style="background:black;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#fff;font-family:sans-serif;text-align:center;">
                    <h1>BetterCrunchyroll Error</h1>
                    <p>Check console / npm run dev</p>
                </div>
            `;
        };

        root.appendChild(iframe);
        console.log('[BetterCrunchyroll] Iframe UI injected');
    }

    // ===============================
    // Message Handler (from iframe)
    // ===============================

    window.addEventListener('message', async (event) => {
        if (!event.origin.includes('localhost')) return;

        const { type, id, endpoint, params, path } = event.data || {};

        if (type === 'BCR_NAVIGATE') {
            console.log('[BetterCrunchyroll] Navigation request to:', path);

            const localeMatch = window.location.pathname.match(/^\/([a-z]{2})\//);
            const locale = localeMatch ? localeMatch[1] : 'fr';

            let crunchyrollPath = `/${locale}`;

            const animeMatch = path.match(/^\/anime\/([A-Z0-9]+)/);
            if (animeMatch) crunchyrollPath = `/${locale}/series/${animeMatch[1]}`;

            const watchMatch = path.match(/^\/watch\/([A-Za-z0-9\-_]+)/);
            if (watchMatch) crunchyrollPath = `/${locale}/watch/${watchMatch[1]}`;

            // CRITICAL FIX: Only navigate if URL actually changed to prevent infinite loop
            if (crunchyrollPath === window.location.pathname) {
                console.log('[BetterCrunchyroll] URL unchanged, skipping navigation');
                return;
            }

            // Use pushState to update URL without reload (prevents infinite loop)
            console.log('[BetterCrunchyroll] Updating URL via pushState:', crunchyrollPath);
            window.history.pushState({}, '', crunchyrollPath);
            lastUrl = crunchyrollPath; // Sync navigation watcher
            return;
        }

        if (type === 'CRUNCHYROLL_API_REQUEST') {
            try {
                const data = await makeApiRequest(endpoint, params || {});
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

        // Check if watch page
        if (isWatchPage()) {
            console.log('[BetterCrunchyroll] Watch page detected - using DOM injection');

            // Wait for DOM to be stable and player to initialize
            await new Promise(r => setTimeout(r, 500));

            // Wait for body to exist
            while (!document.body) {
                await new Promise(r => setTimeout(r, 100));
            }

            await injectWatchPageUI();

            // Note: Removed re-injection observer - it caused infinite loops
            // UI is injected once and stays until navigation
        } else {
            // Check server
            try {
                await fetch(CONFIG.appUrl, { method: 'HEAD', mode: 'no-cors' });
            } catch (e) {
                console.error('[BetterCrunchyroll] Dev server not available');
                return;
            }

            const appPath = mapToAppUrl(window.location.pathname);
            injectIframeUI(appPath);
        }
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
                    // Navigated TO watch page
                    setTimeout(() => injectWatchPageUI(), 500);
                } else if (!isNowWatchPage && wasWatchPage) {
                    // Navigated AWAY from watch page
                    const bcrUI = document.getElementById('bcr-ui');
                    if (bcrUI) bcrUI.remove();
                    document.body.classList.remove('bcr-watch-page');

                    const appPath = mapToAppUrl(location.pathname);
                    injectIframeUI(appPath);
                } else if (isNowWatchPage && wasWatchPage) {
                    // Different watch page - re-inject
                    setTimeout(() => injectWatchPageUI(), 500);
                }
            }
        }, 500);
    }

    startNavigationWatcher();

    // Handle popstate (back/forward navigation)
    window.addEventListener('popstate', () => {
        console.log('[BetterCrunchyroll] Popstate event');
        lastUrl = location.href; // Sync to prevent double handling

        if (isWatchPage()) {
            setTimeout(() => injectWatchPageUI(), 300);
        } else {
            const iframe = document.getElementById('bcr-frame');
            if (iframe) {
                const newAppPath = mapToAppUrl(location.pathname);
                iframe.src = CONFIG.appUrl + newAppPath;
            }
        }
    });

})();


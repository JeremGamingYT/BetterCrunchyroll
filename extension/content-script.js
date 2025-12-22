// BetterCrunchyroll - Content Script
// Injects into page context to intercept Crunchyroll's token

(function () {
    'use strict';

    console.log('[BetterCrunchyroll] Content script starting...');

    const CONFIG = {
        appUrl: 'http://localhost:3000',
    };

    // ===============================
    // Inject script via external file (bypasses CSP)
    // ===============================

    function injectInterceptor() {
        // Use web_accessible_resources to inject a real script file
        // This bypasses CSP because the script is loaded from our extension
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('injected-script.js');
        script.onload = function () {
            console.log('[BetterCrunchyroll] Interceptor script loaded successfully');
            this.remove(); // Clean up after load
        };
        script.onerror = function () {
            console.error('[BetterCrunchyroll] Failed to load interceptor script');
        };

        // Inject at the very beginning of the page
        (document.head || document.documentElement).appendChild(script);

        console.log('[BetterCrunchyroll] Interceptor script injection initiated');
    }

    // Inject IMMEDIATELY (before any Crunchyroll code runs)
    injectInterceptor();

    // ===============================
    // Token Storage (in content script context)
    // ===============================

    let accessToken = null;
    let tokenExpiry = 0;
    let accountId = null;
    let profileId = null;

    // Listen for token events from injected script
    window.addEventListener('bcr-token', (event) => {
        const { token, expiresIn, accountId: accId, profileId: profId } = event.detail;
        accessToken = token;
        tokenExpiry = Date.now() + (expiresIn * 1000) - 30000;
        accountId = accId;
        profileId = profId;

        console.log('[BetterCrunchyroll] ✅ Token received in content script!');
        console.log('[BetterCrunchyroll] Account ID:', accountId);
        console.log('[BetterCrunchyroll] Profile ID:', profileId);

        // Save to storage
        const tokenData = {
            token: accessToken,
            expiry: tokenExpiry,
            accountId: accountId,
            profileId: profileId
        };

        try {
            localStorage.setItem('bcr_token', JSON.stringify(tokenData));
        } catch (e) {
            console.warn('[BetterCrunchyroll] localStorage save failed:', e);
        }

        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.set({ bcr_token: tokenData });
            console.log('[BetterCrunchyroll] Token saved to chrome.storage');
        }

        // Notify iframe if it exists
        const iframe = document.getElementById('bcr-frame');
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({
                type: 'CRUNCHYROLL_TOKEN_READY',
                hasToken: true,
            }, CONFIG.appUrl);
        }
    });

    // Load from storage on startup
    async function loadStoredToken() {
        try {
            // Try localStorage first
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

            // Try chrome.storage
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
    // API Proxy (uses intercepted token)
    // ===============================

    async function makeApiRequest(endpoint, params = {}) {
        // Try to get token from page context if not available
        if (!accessToken || Date.now() >= tokenExpiry) {
            // Inject a quick check script
            const checkScript = document.createElement('script');
            checkScript.src = chrome.runtime.getURL('injected-script.js');
            checkScript.dataset.action = 'check';

            // Dispatch an event to get current token status
            window.dispatchEvent(new CustomEvent('bcr-check-token'));

            // Wait a tick for the event
            await new Promise(r => setTimeout(r, 50));
        }

        // If still no token, try to reload from storage
        if (!accessToken || Date.now() >= tokenExpiry) {
            await loadStoredToken();
        }

        if (!accessToken || Date.now() >= tokenExpiry) {
            throw new Error('No valid token available. Please refresh the page.');
        }

        const url = new URL(`https://www.crunchyroll.com${endpoint}`);

        // Add locale params
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

    // Listen for token check responses from page context
    window.addEventListener('bcr-token-check', (event) => {
        const { token, expiry, accountId: accId, profileId: profId } = event.detail || {};
        if (token && expiry > Date.now()) {
            accessToken = token;
            tokenExpiry = expiry;
            accountId = accId;
            profileId = profId;
        }
    });

    // ===============================
    // Message Handler (from iframe)
    // ===============================

    // ===============================
    // Message Handler (from iframe)
    // ===============================

    window.addEventListener('message', async (event) => {
        // Accept messages from localhost
        if (!event.origin.includes('localhost')) return;

        const { type, id, endpoint, params, scrollY } = event.data || {};

        if (type === 'BCR_SCROLL_SYNC') {
            // Move the native player containers to mimic scrolling
            const offset = -(scrollY || 0);
            const contentTop = 64; // Header height
            const visualTop = contentTop + offset;

            ['vilos', 'vilosRoot', 'velocity-player-package'].forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.style.transform = `translateY(${visualTop}px)`;
                    // Ensure it stays fixed/absolute at 0 initially so transform works from top
                    if (el.style.position !== 'fixed') { // changing to fixed for better performance
                        el.style.position = 'fixed';
                        el.style.top = '0';
                        el.style.left = '0';
                        el.style.width = '100%';
                        el.style.height = 'auto';
                        el.style.aspectRatio = '16/9';
                    }
                }
            });
            return;
        }

        if (type === 'CRUNCHYROLL_API_REQUEST') {
            console.log('[BetterCrunchyroll] API request from iframe:', endpoint);

            try {
                const data = await makeApiRequest(endpoint, params || {});
                event.source.postMessage({
                    type: 'CRUNCHYROLL_API_RESPONSE',
                    id,
                    success: true,
                    data,
                }, event.origin);
            } catch (error) {
                console.error('[BetterCrunchyroll] API error:', error);
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
    // URL Mapping
    // ===============================

    function mapToAppUrl(path) {
        const clean = path.replace(/^\/[a-z]{2}(?=\/|$)/, '');

        if (/^\/?$/.test(clean) || /^\/discover/.test(clean)) return '/';

        const seriesMatch = clean.match(/^\/series\/([A-Z0-9]+)/);
        if (seriesMatch) return `/anime/${seriesMatch[1]}`;

        // Allow alphanumeric, dashes, underscores. Be more permissive.
        const watchMatch = clean.match(/^\/watch\/([A-Za-z0-9\-_]+)/);
        if (watchMatch) return `/watch/${watchMatch[1]}`;

        if (/^\/search/.test(clean)) return '/search';
        if (/^\/simulcast|\/seasonal/.test(clean)) return '/simulcast';

        return '/';
    }

    // ===============================
    // Cleanup Logic
    // ===============================

    function cleanWatchPage() {
        // Only run on watch pages
        if (!/\/watch\//.test(window.location.pathname)) return;

        // Target the specific header element described
        const header = document.querySelector('.app-layout__header--ywueY');
        if (header) {
            header.remove();
        }

        // Fallback: generic class
        const genericHeader = document.querySelector('.erc-large-header');
        if (genericHeader && document.body.contains(genericHeader)) {
            genericHeader.remove();
        }

        // Target the content wrapper (title, description, comments, etc.)
        const contentWrapper = document.querySelector('.content-wrapper--MF5LS');
        if (contentWrapper) {
            contentWrapper.remove();
        }

        // FORCE Z-INDEX on Player Containers to be LOWER than our iframe
        // And setup layout for Scroll Sync
        ['vilos', 'vilosRoot', 'velocity-player-package'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.style.zIndex = '1';
                el.style.position = 'fixed'; // Important for smooth scrolling/transform
                el.style.top = '0';
                el.style.left = '0';
                el.style.width = '100%';
                el.style.height = 'auto'; // Let aspect-ratio handle it
                el.style.aspectRatio = '16/9';
                // Initial transform to account for header
                if (!el.style.transform) {
                    el.style.transform = 'translateY(64px)';
                }
            }
        });

        // Fallback for content wrapper
        const genericContentWrapper = document.querySelector('.content-wrapper'); // generic guess based on pattern
        if (genericContentWrapper && document.body.contains(genericContentWrapper)) {
            // Verify it's not the main app wrapper if that shares the name
            if (genericContentWrapper.querySelector('.body-wrapper')) {
                genericContentWrapper.remove();
            }
        }

        // Target the specific footer element described
        const footer = document.querySelector('.app-layout__footer--jgOfu');
        if (footer) {
            footer.remove();
        }

        // Fallback: generic footer
        const genericFooter = document.querySelector('.footer--NNXrc') || document.querySelector('footer');
        if (genericFooter && document.body.contains(genericFooter)) {
            genericFooter.remove();
        }
    }

    // ===============================
    // UI Injection
    // ===============================

    function injectUI() {
        const currentPath = window.location.pathname;
        const isWatchPage = /\/watch\//.test(currentPath);

        // Check if watch page for specific transparency handling logic later
        if (isWatchPage) {
            console.log('[BetterCrunchyroll] Watch page detected - Injecting UI with transparency');
            cleanWatchPage();
        }


        // Remove any existing injection
        const existing = document.getElementById('bettercrunchyroll-root');
        if (existing) existing.remove();

        // For other pages: use the full iframe approach
        const appPath = mapToAppUrl(currentPath);
        injectIframeUI(appPath);
    }

    function injectIframeUI(appPath) {
        console.log('[BetterCrunchyroll] Injecting iframe UI for path:', appPath);

        // Container
        const root = document.createElement('div');
        root.id = 'bettercrunchyroll-root';
        root.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 2147483647; pointer-events: none;';
        document.body.appendChild(root);

        // Iframe
        const iframe = document.createElement('iframe');
        iframe.id = 'bcr-frame';
        iframe.src = CONFIG.appUrl + appPath;
        const isWatchPage = /\/watch\//.test(window.location.pathname);
        const bgColor = isWatchPage ? 'transparent' : '#0a0a0a';
        iframe.style.cssText = `width:100%;height:100%;border:none;background:${bgColor};transition:background 0.3s ease; pointer-events: auto;`;
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

    // Controls Proxy
    window.addEventListener('message', (event) => {
        const { type } = event.data || {};
        try {
            if (type === 'BCR_PLAY') {
                const video = document.querySelector('video');
                if (video) video.play();
            } else if (type === 'BCR_PAUSE') {
                const video = document.querySelector('video');
                if (video) video.pause();
            } else if (type === 'BCR_TOGGLE_PLAY') {
                const video = document.querySelector('video');
                if (video) {
                    if (video.paused) video.play();
                    else video.pause();
                }
            } else if (type === 'BCR_SEEK') {
                const video = document.querySelector('video');
                if (video && typeof event.data.time === 'number') {
                    video.currentTime = event.data.time;
                }
            }
        } catch (e) {
            console.error('[BetterCrunchyroll] Control error', e);
        }
    });

    // ===============================
    // Initialization
    // ===============================

    async function init() {
        console.log('[BetterCrunchyroll] Waiting for page to load and token...');

        // Load any stored token first
        await loadStoredToken();

        // Wait for DOM
        if (document.readyState === 'loading') {
            await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
        }

        // Wait for token (max 5 seconds)
        let waited = 0;
        while (!accessToken && waited < 5000) {
            await new Promise(r => setTimeout(r, 100));
            waited += 100;
        }

        if (accessToken) {
            console.log('[BetterCrunchyroll] ✅ Token ready, injecting UI');
        } else {
            console.log('[BetterCrunchyroll] ⚠️ No token yet, but proceeding with UI injection');
            console.log('[BetterCrunchyroll] Token will be captured on next API call');
        }

        // Check server
        try {
            await fetch(CONFIG.appUrl, { method: 'HEAD', mode: 'no-cors' });
        } catch (e) {
            console.error('[BetterCrunchyroll] Dev server not available');
            return;
        }

        injectUI();
    }

    // Start initialization when DOM is ready enough
    if (document.readyState !== 'loading') {
        init();
    } else {
        document.addEventListener('DOMContentLoaded', init);
    }

    // Handle navigation
    let lastUrl = location.href;
    new MutationObserver(() => {
        // Always attempt cleanup on mutations (in case header is re-injected by React)
        cleanWatchPage();

        if (location.href !== lastUrl) {
            lastUrl = location.href;
            console.log('[BetterCrunchyroll] Native URL changed:', lastUrl);

            // Update transparency based on new route - simply toggle the style
            const iframe = document.getElementById('bcr-frame');
            if (iframe) {
                const isWatchPage = /\/watch\//.test(location.pathname);
                iframe.style.background = isWatchPage ? 'transparent' : '#0a0a0a';

                // If we moved to a watch page, ensure cleanup runs immediately
                if (isWatchPage) cleanWatchPage();
            }
        }
    }).observe(document.body || document.documentElement, { childList: true, subtree: true });

})();

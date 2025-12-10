/**
 * BetterCrunchyroll - Main Content Script
 * 1. Injects API interceptor to capture Crunchyroll data
 * 2. Listens for intercepted data and stores it
 * 3. Injects our React redesign
 */

(function () {
    'use strict';

    console.log('[BetterCrunchyroll] Extension loaded');

    // Flags to prevent multiple injections
    let isInjecting = false;
    let injectionComplete = false;

    // ==================== PART 1: API INTERCEPTION ====================

    // Inject the API interceptor script into the page context
    function injectApiInterceptor() {
        // Prevent multiple injections
        if (document.getElementById('bettercrunchyroll-interceptor')) return;

        const script = document.createElement('script');
        script.id = 'bettercrunchyroll-interceptor';
        script.src = chrome.runtime.getURL('crunchyroll-api-interceptor.js');
        (document.head || document.documentElement).appendChild(script);
        console.log('[BetterCrunchyroll] API Interceptor injected');
    }

    // Parse endpoint from URL to create cache key
    function getEndpointKey(url) {
        try {
            const urlObj = new URL(url);
            const path = urlObj.pathname;

            // Extract meaningful parts
            if (path.includes('/accounts/v1/me/multiprofile')) {
                return 'multiprofile';
            }
            if (path.includes('/discover/') && path.includes('/watchlist')) {
                return 'watchlist';
            }
            if (path.includes('/discover/up_next/')) {
                return 'up_next';
            }
            if (path.includes('/cms/series/')) {
                if (path.includes('/seasons')) {
                    return 'seasons';
                }
                const seriesId = path.match(/\/cms\/series\/([^\/]+)/)?.[1];
                return seriesId ? `series_${seriesId}` : 'series';
            }
            if (path.includes('/cms/seasons/') && path.includes('/episodes')) {
                const seasonId = path.match(/\/cms\/seasons\/([^\/]+)/)?.[1];
                return seasonId ? `episodes_${seasonId}` : 'episodes';
            }
            if (path.includes('/cms/episodes/')) {
                const episodeId = path.match(/\/cms\/episodes\/([^\/]+)/)?.[1];
                return episodeId ? `episode_${episodeId}` : 'episode';
            }
            if (path.includes('/cms/objects/')) {
                return 'objects';
            }
            if (path.includes('/discover/')) {
                return 'discover';
            }

            // Fallback
            return path.replace(/[^a-z0-9_]/gi, '_');
        } catch (e) {
            console.warn('[BetterCrunchyroll] Failed to parse URL:', e);
            return 'unknown';
        }
    }

    // ==================== DATA ENRICHMENT ====================

    // Extract series IDs from API response data
    function extractSeriesIds(data) {
        const ids = new Set();

        if (!data) return ids;

        // Handle different response structures
        if (data.data && Array.isArray(data.data)) {
            data.data.forEach(item => {
                // Check if it's a series
                if (item.id && (item.type === 'series' || item.series_metadata)) {
                    ids.add(item.id);
                }
                // Check for panel/episode with series info
                if (item.panel && item.panel.episode_metadata && item.panel.episode_metadata.series_id) {
                    ids.add(item.panel.episode_metadata.series_id);
                }
            });
        }

        return Array.from(ids);
    }

    // Fetch detailed series information
    async function enrichDataWithDetails(data, headers) {
        // Disabled for now to prevent issues
        return;
    }



    // Make API request to get detailed series info
    async function fetchSeriesDetails(seriesIds, headers) {
        return;
    }



    // Listen for messages from the injected interceptor script
    window.addEventListener('message', function (event) {
        // Only accept messages from same origin
        if (event.origin !== window.location.origin) return;

        const message = event.data;

        // Check if this is from our interceptor or API
        if (!message || (message.source !== 'crunchyroll-interceptor' && message.source !== 'crunchyroll-api')) return;

        // Handle credentials request from the API
        if (message.type === 'REQUEST_CRUNCHYROLL_CREDENTIALS') {
            console.log('[BetterCrunchyroll] Credentials requested by API');

            // Get credentials from chrome.storage.local and send back
            chrome.storage.local.get(['crunchyroll_token', 'crunchyroll_profile'], function (result) {
                const credentials = {
                    tokenData: result.crunchyroll_token || null,
                    profileData: result.crunchyroll_profile || null
                };

                console.log('[BetterCrunchyroll] Sending credentials to API:', {
                    hasToken: !!credentials.tokenData,
                    hasProfile: !!credentials.profileData
                });

                window.postMessage({
                    type: 'CRUNCHYROLL_CREDENTIALS_RESPONSE',
                    credentials: credentials
                }, '*');
            });
            return;
        }

        // Handle token data (NEW!)
        if (message.type === 'CRUNCHYROLL_TOKEN') {
            console.log('[BetterCrunchyroll] Received token data');

            const tokenData = {
                ...message.tokenData,
                timestamp: Date.now()
            };

            // Store token in chrome.storage.local with the correct key
            chrome.storage.local.set({
                crunchyroll_token: tokenData
            }, function () {
                if (chrome.runtime.lastError) {
                    console.error('[BetterCrunchyroll] Failed to store token:', chrome.runtime.lastError);
                } else {
                    console.log('[BetterCrunchyroll] ✅ Token stored in chrome.storage.local');
                }
            });
        }

        // Handle API headers
        if (message.type === 'CRUNCHYROLL_API_HEADERS') {
            console.log('[BetterCrunchyroll] Received API headers');

            // Store headers in chrome.storage.local
            chrome.storage.local.set({
                crunchyroll_headers: message.headers,
                headers_timestamp: Date.now()
            }, function () {
                if (chrome.runtime.lastError) {
                    console.error('[BetterCrunchyroll] Failed to store headers:', chrome.runtime.lastError);
                } else {
                    console.log('[BetterCrunchyroll] ✅ Headers stored');
                }
            });
        }

        // Handle API responses
        if (message.type === 'CRUNCHYROLL_API_RESPONSE') {
            const endpointKey = getEndpointKey(message.url);
            console.log('[BetterCrunchyroll] Received API response:', endpointKey);

            // Special handling for multiprofile - store as crunchyroll_profile
            if (message.url.includes('/accounts/v1/me/multiprofile')) {
                chrome.storage.local.set({
                    crunchyroll_profile: message.data
                }, function () {
                    if (chrome.runtime.lastError) {
                        console.error('[BetterCrunchyroll] Failed to store profile:', chrome.runtime.lastError);
                    } else {
                        console.log('[BetterCrunchyroll] ✅ Profile stored in chrome.storage.local');
                    }
                });
            }

            // Store in a structured way
            chrome.storage.local.get(['crunchyrollData', 'crunchyroll_headers'], function (result) {
                const existingData = result.crunchyrollData || {};
                const headers = result.crunchyroll_headers || {};

                // Update the specific endpoint data
                existingData[endpointKey] = {
                    data: message.data,
                    timestamp: Date.now(),
                    url: message.url
                };

                // Store updated data
                chrome.storage.local.set({
                    crunchyrollData: existingData
                }, function () {
                    if (chrome.runtime.lastError) {
                        console.error('[BetterCrunchyroll] Failed to store data:', chrome.runtime.lastError);
                    } else {
                        console.log('[BetterCrunchyroll] ✅ Data stored:', endpointKey);

                        // ENRICHMENT: Extract series IDs and fetch detailed info
                        enrichDataWithDetails(message.data, headers);
                    }
                });
            });
        }

        // NEW: Handle SAVE_FILE request
        if (message.type === 'SAVE_FILE_REQUEST') {
            console.log('[BetterCrunchyroll] Forwarding save request for:', message.path);
            chrome.runtime.sendMessage({
                type: 'SAVE_FILE',
                path: message.path,
                data: message.data
            });
        }
    });

    // Inject API interceptor IMMEDIATELY (we're at document_start now!)
    injectApiInterceptor();

    // ==================== PART 2: REACT REDESIGN INJECTION ====================

    let rootElement = null;

    // Check if we're on a watch page
    function isWatchPage() {
        return window.location.pathname.includes('/watch/');
    }

    // Function to inject enhanced overlay on watch pages (use native player)
    function injectWatchOverlay() {
        // If already injected, skip
        if (document.getElementById('bettercrunchyroll-root')) {
            return;
        }

        console.log('[BetterCrunchyroll] Watch page detected - injecting custom UI with native player...');

        // Add styles to hide Crunchyroll UI but keep video player
        const style = document.createElement('style');
        style.id = 'bettercrunchyroll-watch-style';
        style.textContent = `
            /* Hide ALL Crunchyroll UI */
            .app-layout__header--ywueY,
            .erc-large-header,
            header,
            nav,
            .erc-header,
            .erc-footer,
            footer,
            .erc-watch-menu,
            [data-testid="vilos-sidebar"],
            .app-layout-footer,
            .app-layout-header,
            .erc-watch-sidebar,
            .erc-current-media-info,
            .content-header,
            [class*="header"],
            [class*="footer"],
            [class*="sidebar"]:not(.video-player-wrapper),
            .breadcrumb-wrapper,
            .erc-playback-info,
            .erc-watch-info,
            .erc-watch-actions,
            .erc-watch-comments,
            .content-wrapper > *:not([class*="player"]):not([class*="vilos"]):not(iframe):not(#bettercrunchyroll-root) {
                display: none !important;
                visibility: hidden !important;
            }
            
            /* Our React root - takes full screen but allows video player through */
            #bettercrunchyroll-root {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                z-index: 10 !important;
                pointer-events: auto;
            }
            
            /* Video player container - positioned by our React component */
            .video-player-wrapper,
            [class*="video-player"],
            [class*="vilos"],
            .erc-video-player,
            #vilos-player,
            .player-container,
            [class*="erc-watch-player"] {
                position: fixed !important;
                z-index: 5 !important;
                background: #000 !important;
            }
            
            /* Ensure iframes are visible */
            iframe[src*="player"],
            iframe[src*="vilos"],
            .video-player-wrapper iframe,
            [class*="player"] iframe {
                width: 100% !important;
                height: 100% !important;
            }
            
            /* Video element */
            video {
                object-fit: contain !important;
            }
            
            /* Dark background */
            html, body {
                background: #0a0a0a !important;
                overflow: hidden !important;
                margin: 0 !important;
                padding: 0 !important;
            }
            
            /* Remove any layout constraints */
            .content-wrapper, .app-layout, main, #content {
                margin: 0 !important;
                padding: 0 !important;
                transform: none !important;
                position: static !important;
            }
        `;
        document.head.appendChild(style);

        // Create root element for our React app
        const rootElement = document.createElement('div');
        rootElement.id = 'bettercrunchyroll-root';
        document.body.appendChild(rootElement);

        // Inject our React app
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('assets/main.js');
        script.type = 'module';
        (document.head || document.documentElement).appendChild(script);

        // Inject our CSS
        const css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = chrome.runtime.getURL('assets/main.css');
        (document.head || document.documentElement).appendChild(css);

        // Also load the watch controller for additional features
        const watchController = document.createElement('script');
        watchController.id = 'bc-watch-controller';
        watchController.src = chrome.runtime.getURL('watch-controller.js');
        (document.head || document.documentElement).appendChild(watchController);

        console.log('[BetterCrunchyroll] ✅ Watch page with custom UI injected');
    }

    // Function to inject our React app (for non-watch pages)
    function injectReactRedesign() {
        // Prevent multiple concurrent injections
        if (isInjecting || injectionComplete) return;

        // If we already injected, don't do it again
        if (document.getElementById('bettercrunchyroll-root')) {
            injectionComplete = true;
            return;
        }

        // Don't inject on watch pages
        if (isWatchPage()) {
            console.log('[BetterCrunchyroll] Watch page detected, skipping React injection');
            injectWatchOverlay();
            return;
        }

        // Wait for body to exist
        if (!document.body) {
            console.log('[BetterCrunchyroll] Waiting for body...');
            return;
        }

        isInjecting = true;
        console.log('[BetterCrunchyroll] Injecting custom design...');

        try {
            // Create root element for React
            rootElement = document.createElement('div');
            rootElement.id = 'bettercrunchyroll-root';
            document.body.appendChild(rootElement);

            // Inject our built app
            const script = document.createElement('script');
            script.src = chrome.runtime.getURL('assets/main.js');
            script.type = 'module';
            (document.head || document.documentElement).appendChild(script);

            // Inject our CSS
            const css = document.createElement('link');
            css.rel = 'stylesheet';
            css.href = chrome.runtime.getURL('assets/main.css');
            (document.head || document.documentElement).appendChild(css);

            // Hide original Crunchyroll content
            const style = document.createElement('style');
            style.id = 'bettercrunchyroll-hide-style';
            style.textContent = `
                body > *:not(#bettercrunchyroll-root) {
                    display: none !important;
                }
                html, body {
                    background: #0a0a0a !important;
                    overflow: auto !important;
                }
            `;
            (document.head || document.documentElement).appendChild(style);

            injectionComplete = true;
            console.log('[BetterCrunchyroll] ✅ Custom design injected');
        } catch (error) {
            console.error('[BetterCrunchyroll] Injection error:', error);
        } finally {
            isInjecting = false;
        }
    }

    // Debounced observer callback
    let observerTimeout = null;

    // Observer to handle dynamic content loading (SPA)
    const observer = new MutationObserver((mutations) => {
        // Debounce to prevent excessive calls
        if (observerTimeout) return;

        observerTimeout = setTimeout(() => {
            observerTimeout = null;

            if (isWatchPage()) {
                // On watch pages, ensure our overlay exists
                if (document.body && !document.getElementById('bettercrunchyroll-watch-overlay')) {
                    injectWatchOverlay();
                }
            } else {
                // On other pages, ensure React app exists
                if (document.body && !document.getElementById('bettercrunchyroll-root') && !injectionComplete) {
                    injectReactRedesign();
                }
            }
        }, 10);
    });

    // Start observing
    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });

    // Initial injection - wait for DOMContentLoaded or run immediately if ready
    function tryInitialInjection() {
        if (isWatchPage()) {
            if (document.body) {
                injectWatchOverlay();
            }
        } else {
            if (document.body) {
                injectReactRedesign();
            }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', tryInitialInjection);
    } else {
        tryInitialInjection();
    }

    console.log('[BetterCrunchyroll] 🚀 Fully initialized');
})();

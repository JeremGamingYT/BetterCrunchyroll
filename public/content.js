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

    // Function to inject our custom watch page overlay
    function injectWatchOverlay() {
        if (document.getElementById('bettercrunchyroll-watch-overlay')) return;

        console.log('[BetterCrunchyroll] Adding watch overlay...');

        // Create overlay with back button
        const overlay = document.createElement('div');
        overlay.id = 'bettercrunchyroll-watch-overlay';
        overlay.innerHTML = `
            <button id="bc-back-btn" title="Retour à BetterCrunchyroll">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="m12 19-7-7 7-7"/>
                    <path d="M19 12H5"/>
                </svg>
            </button>
        `;
        document.body.appendChild(overlay);

        // Add styles for the overlay AND hide all Crunchyroll UI except video player
        const style = document.createElement('style');
        style.id = 'bettercrunchyroll-watch-style';
        style.textContent = `
            /* Hide EVERYTHING on the page */
            body > *:not(.video-player-wrapper):not(#bettercrunchyroll-watch-overlay):not(script):not(style):not(link) {
                display: none !important;
            }
            
            /* Make sure video player wrapper is visible and fullscreen */
            .video-player-wrapper {
                display: block !important;
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                z-index: 1 !important;
                background: #000 !important;
            }
            
            .video-player-wrapper .video-player-spacer {
                display: none !important;
            }
            
            .video-player-wrapper .video-player {
                width: 100vw !important;
                height: 100vh !important;
                border: none !important;
            }
            
            /* Dark background */
            html, body {
                background: #000 !important;
                overflow: hidden !important;
                margin: 0 !important;
                padding: 0 !important;
            }
            
            /* Our overlay styling */
            #bettercrunchyroll-watch-overlay {
                position: fixed;
                top: 20px;
                left: 20px;
                z-index: 999999;
                pointer-events: auto;
            }
            
            #bc-back-btn {
                background: rgba(0, 0, 0, 0.7);
                border: none;
                color: white;
                width: 50px;
                height: 50px;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease;
                backdrop-filter: blur(10px);
                opacity: 0.7;
            }
            
            #bc-back-btn:hover {
                background: rgba(244, 117, 33, 0.9);
                transform: scale(1.1);
                opacity: 1;
            }
        `;
        document.head.appendChild(style);

        // Back button click handler
        document.getElementById('bc-back-btn').addEventListener('click', () => {
            // Navigate back to our app's home
            window.location.href = 'https://www.crunchyroll.com/';
        });

        console.log('[BetterCrunchyroll] ✅ Watch overlay injected - only video player visible');
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
                // On watch pages, just ensure overlay exists
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

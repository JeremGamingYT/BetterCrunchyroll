/**
 * Crunchyroll Content Script Bridge
 * Receives messages from the injected interceptor script
 * Stores headers and API responses in chrome.storage.local
 */

(function () {
    'use strict';

    console.log('[BetterCrunchy Bridge] Content script bridge loaded');

    // Inject the interceptor script into the page context
    function injectInterceptor() {
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('crunchyroll-api-interceptor.js');
        script.onload = function () {
            console.log('[BetterCrunchy Bridge] Interceptor script injected');
            this.remove();
        };
        (document.head || document.documentElement).appendChild(script);
    }

    // Parse endpoint from URL to create cache key
    function getEndpointKey(url) {
        try {
            const urlObj = new URL(url);
            const path = urlObj.pathname;

            // Extract meaningful parts
            if (path.includes('/discover/') && path.includes('/watchlist')) {
                return 'watchlist';
            }
            if (path.includes('/discover/up_next/')) {
                return 'discover_up_next';
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
                return 'cms_objects';
            }

            // Fallback
            return path.replace(/[^a-z0-9_]/gi, '_');
        } catch (e) {
            console.warn('[BetterCrunchy Bridge] Failed to parse URL:', e);
            return 'unknown';
        }
    }

    // Listen for messages from the injected script
    window.addEventListener('message', function (event) {
        // Only accept messages from same origin
        if (event.origin !== window.location.origin) return;

        const message = event.data;

        // Check if this is from our interceptor
        if (!message || message.source !== 'crunchyroll-interceptor') return;

        // Handle API headers
        if (message.type === 'CRUNCHYROLL_API_HEADERS') {
            console.log('[BetterCrunchy Bridge] Received API headers:', message.headers);

            // Store headers in chrome.storage.local
            chrome.storage.local.set({
                crunchyrollApiHeaders: message.headers,
                headersTimestamp: Date.now()
            }, function () {
                if (chrome.runtime.lastError) {
                    console.error('[BetterCrunchy Bridge] Failed to store headers:', chrome.runtime.lastError);
                } else {
                    console.log('[BetterCrunchy Bridge] Headers stored successfully');
                }
            });
        }

        // Handle API responses
        if (message.type === 'CRUNCHYROLL_API_RESPONSE') {
            const endpointKey = getEndpointKey(message.url);
            console.log('[BetterCrunchy Bridge] Received API response for:', endpointKey);

            // Store response in cache with TTL
            const cacheKey = `api_cache_${endpointKey}`;
            const cacheEntry = {
                data: message.data,
                timestamp: Date.now(),
                ttl: 300000, // 5 minutes default
                url: message.url
            };

            chrome.storage.local.set({
                [cacheKey]: cacheEntry
            }, function () {
                if (chrome.runtime.lastError) {
                    console.error('[BetterCrunchy Bridge] Failed to store API response:', chrome.runtime.lastError);
                } else {
                    console.log('[BetterCrunchy Bridge] API response cached:', cacheKey);
                }
            });
        }
    });

    // Inject the interceptor when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectInterceptor);
    } else {
        injectInterceptor();
    }

    console.log('[BetterCrunchy Bridge] Listening for intercepted API calls...');
})();

/**
 * Crunchyroll API Interceptor
 * Injected into the page to capture API requests and responses
 */
(function () {
    const originalFetch = window.fetch;
    const originalXHR = window.XMLHttpRequest;

    console.log('[BetterCrunchy Interceptor] Initialized');

    // ==================== FETCH INTERCEPTION ====================
    window.fetch = async function (...args) {
        const [resource, config] = args;
        const response = await originalFetch(resource, config);

        try {
            const url = typeof resource === 'string' ? resource : (resource instanceof Request ? resource.url : '');

            if (url && (url.includes('api.crunchyroll.com') || url.includes('crunchyroll.com/content') || url.includes('/accounts/') || url.includes('/auth/'))) {
                const clone = response.clone();
                clone.text().then(text => {
                    try {
                        if (!text || text.trim() === '') return;
                        const data = JSON.parse(text);

                        window.postMessage({
                            type: 'CRUNCHYROLL_API_RESPONSE',
                            url: url,
                            method: config?.method || 'GET',
                            body: data,
                            data: data, // Backwards combatibility
                            timestamp: Date.now(),
                            source: 'crunchyroll-interceptor'
                        }, '*');

                        // Capture Headers if possible (limited in fetch)
                        // Note: Authorization header in request config is what we typically want
                        if (config && config.headers && config.headers.Authorization) {
                            window.postMessage({
                                type: 'CRUNCHYROLL_API_HEADERS',
                                headers: { 'Authorization': config.headers.Authorization },
                                source: 'crunchyroll-interceptor'
                            }, '*');
                        }

                    } catch (e) {
                        // Not JSON, ignore
                    }
                }).catch(() => { });
            }
        } catch (e) {
            console.error('[BetterCrunchy Interceptor] Fetch error:', e);
        }

        return response;
    };

    // ==================== XHR INTERCEPTION ====================
    window.XMLHttpRequest = function () {
        const xhr = new originalXHR();
        let requestMethod = 'GET';
        let requestUrl = '';

        const originalOpen = xhr.open;
        xhr.open = function (method, url) {
            requestMethod = method;
            requestUrl = url;
            return originalOpen.apply(this, arguments);
        };

        xhr.addEventListener('load', function () {
            try {
                if (requestUrl && (requestUrl.includes('api.crunchyroll.com') || requestUrl.includes('crunchyroll.com/content') || requestUrl.includes('/accounts/') || requestUrl.includes('/auth/'))) {
                    if (xhr.responseText && xhr.responseText.trim() !== '') {
                        try {
                            const data = JSON.parse(xhr.responseText);
                            window.postMessage({
                                type: 'CRUNCHYROLL_API_RESPONSE',
                                url: requestUrl,
                                method: requestMethod,
                                body: data,
                                data: data,
                                timestamp: Date.now(),
                                source: 'crunchyroll-interceptor'
                            }, '*');

                            // Detect Token Response explicitly
                            if (data.access_token && data.token_type) {
                                window.postMessage({
                                    type: 'CRUNCHYROLL_TOKEN',
                                    tokenData: data,
                                    source: 'crunchyroll-interceptor'
                                }, '*');
                            }
                        } catch (e) { /* Ignore parsing errors */ }
                    }
                }
            } catch (e) {
                console.error('[BetterCrunchy Interceptor] XHR error:', e);
            }
        });

        return xhr;
    };

    // Copy static methods/properties
    Object.assign(window.XMLHttpRequest, originalXHR);

    // ==================== SAVE HELPER ====================
    window.saveCrunchyrollData = function (data, filename) {
        window.postMessage({
            type: 'SAVE_FILE_REQUEST',
            path: filename,
            data: data,
            source: 'crunchyroll-interceptor'
        }, '*');
    };

})();

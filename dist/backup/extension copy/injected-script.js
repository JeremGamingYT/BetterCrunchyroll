// BetterCrunchyroll - Injected Script
// This script runs in the page context to intercept Crunchyroll's token
// It is injected via web_accessible_resources to bypass CSP

(function () {
    'use strict';

    console.log('[BetterCrunchyroll] Injected interceptor into page context');

    // Store the original fetch
    const originalFetch = window.fetch;

    // Override fetch to intercept token responses
    window.fetch = async function (...args) {
        const response = await originalFetch.apply(this, args);

        try {
            const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;

            // Intercept token responses
            if (url && url.includes('/auth/v1/token')) {
                const clonedResponse = response.clone();
                const data = await clonedResponse.json();

                if (data.access_token) {
                    console.log('[BetterCrunchyroll] 🎉 TOKEN INTERCEPTED!');
                    console.log('[BetterCrunchyroll] Token expires in:', data.expires_in, 'seconds');

                    // Dispatch a custom event that the content script can catch
                    window.dispatchEvent(new CustomEvent('bcr-token', {
                        detail: {
                            token: data.access_token,
                            expiresIn: data.expires_in || 300,
                            accountId: data.account_id,
                            profileId: data.profile_id
                        }
                    }));

                    // Also store in a global for the content script
                    window.__BCR_TOKEN__ = data.access_token;
                    window.__BCR_TOKEN_EXPIRY__ = Date.now() + ((data.expires_in || 300) * 1000) - 30000;
                    window.__BCR_ACCOUNT_ID__ = data.account_id;
                    window.__BCR_PROFILE_ID__ = data.profile_id;
                }
            }
        } catch (e) {
            // Ignore errors in interception
        }

        return response;
    };

    // Also intercept XMLHttpRequest for older code paths
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method, url, ...rest) {
        this._url = url;
        return originalXHROpen.call(this, method, url, ...rest);
    };

    XMLHttpRequest.prototype.send = function (...args) {
        if (this._url && this._url.includes('/auth/v1/token')) {
            this.addEventListener('load', function () {
                try {
                    const data = JSON.parse(this.responseText);
                    if (data.access_token) {
                        console.log('[BetterCrunchyroll] 🎉 TOKEN INTERCEPTED (XHR)!');

                        window.dispatchEvent(new CustomEvent('bcr-token', {
                            detail: {
                                token: data.access_token,
                                expiresIn: data.expires_in || 300,
                                accountId: data.account_id,
                                profileId: data.profile_id
                            }
                        }));

                        window.__BCR_TOKEN__ = data.access_token;
                        window.__BCR_TOKEN_EXPIRY__ = Date.now() + ((data.expires_in || 300) * 1000) - 30000;
                        window.__BCR_ACCOUNT_ID__ = data.account_id;
                        window.__BCR_PROFILE_ID__ = data.profile_id;
                    }
                } catch (e) {
                    // Ignore
                }
            });
        }
        return originalXHRSend.apply(this, args);
    };

    console.log('[BetterCrunchyroll] Fetch & XHR interceptors installed');

    // Expose a function to check token status
    window.__BCR_CHECK_TOKEN__ = function () {
        return {
            hasToken: !!window.__BCR_TOKEN__,
            isValid: window.__BCR_TOKEN_EXPIRY__ > Date.now(),
            expiresAt: window.__BCR_TOKEN_EXPIRY__,
            accountId: window.__BCR_ACCOUNT_ID__,
            profileId: window.__BCR_PROFILE_ID__
        };
    };
})();

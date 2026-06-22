/*
 * BetterCR — page-context token interceptor (classic IIFE, no bundler/loader).
 *
 * Injected into Crunchyroll's MAIN world by the content script via a plain
 * <script src> tag. It must NOT depend on `chrome.*` (undefined in the page
 * world). It wraps fetch/XHR to capture the OAuth access token whenever
 * Crunchyroll requests /auth/v1/token, then forwards it to the content script
 * through a `bcr-token` CustomEvent (primitive detail crosses the world
 * boundary cleanly) plus window globals as a fallback.
 */
(function () {
  'use strict';

  var EVENT_NAME = 'bcr-token';
  var TOKEN_FRAGMENT = '/auth/v1/token';
  var EXPIRY_MARGIN_MS = 30000;
  var DEFAULT_EXPIRES_IN = 300;

  function publish(data) {
    if (!data || !data.access_token) {
      return;
    }
    var expiresIn = data.expires_in || DEFAULT_EXPIRES_IN;
    try {
      window.dispatchEvent(
        new CustomEvent(EVENT_NAME, {
          detail: {
            token: data.access_token,
            expiresIn: expiresIn,
            accountId: data.account_id,
            profileId: data.profile_id,
          },
        }),
      );
    } catch (e) {
      /* ignore */
    }
    window.__BCR_TOKEN__ = data.access_token;
    window.__BCR_TOKEN_EXPIRY__ = Date.now() + expiresIn * 1000 - EXPIRY_MARGIN_MS;
    window.__BCR_ACCOUNT_ID__ = data.account_id;
    window.__BCR_PROFILE_ID__ = data.profile_id;
    try {
      console.info('[BetterCR] 🎉 token intercepted (expires in ' + expiresIn + 's)');
    } catch (e) {
      /* ignore */
    }
  }

  function urlOf(input) {
    if (typeof input === 'string') {
      return input;
    }
    if (input && typeof input.url === 'string') {
      return input.url;
    }
    return String(input || '');
  }

  var originalFetch = window.fetch;
  if (typeof originalFetch === 'function') {
    window.fetch = function (input, init) {
      var promise = originalFetch.apply(this, arguments);
      try {
        if (urlOf(input).indexOf(TOKEN_FRAGMENT) > -1) {
          promise
            .then(function (response) {
              response
                .clone()
                .json()
                .then(publish)
                .catch(function () {});
              return response;
            })
            .catch(function () {});
        }
      } catch (e) {
        /* ignore */
      }
      return promise;
    };
  }

  var originalOpen = XMLHttpRequest.prototype.open;
  var originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url) {
    this.__bcrUrl = url;
    return originalOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function () {
    var xhr = this;
    if (xhr.__bcrUrl && String(xhr.__bcrUrl).indexOf(TOKEN_FRAGMENT) > -1) {
      xhr.addEventListener('load', function () {
        try {
          publish(JSON.parse(xhr.responseText));
        } catch (e) {
          /* ignore */
        }
      });
    }
    return originalSend.apply(this, arguments);
  };
})();

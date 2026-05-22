// BetterCrunchyroll - Extension Data Sync Script
// Exécuté dans le contexte du navigateur sur Crunchyroll
// Utilise le token intercepté pour récupérer les données
// 
// À injecter dans content-script.js ou dans une page d'administration

(function () {
    'use strict';

    // ===============================
    // Configuration
    // ===============================

    const CONFIG = {
        apiBase: 'http://localhost:3000/api/crunchyroll',
        dataEndpoints: {
            series: '/content/v2/cms/series/',
            rating: '/content-reviews/v3/user/',
            browse: '/content/v2/cms/browse',
        },
        waitForToken: 10000, // 10 secondes
        requestTimeout: 30000,
    };

    // ===============================
    // Logging
    // ===============================

    function log(type, message, data = null) {
        const timestamp = new Date().toISOString();
        const prefix = `[BetterCrunchyroll Data Sync] [${type}]`;
        console.log(`${prefix} ${timestamp} - ${message}`, data || '');
    }

    function logSuccess(msg, data) { log('✓', msg, data); }
    function logInfo(msg, data) { log('ℹ', msg, data); }
    function logError(msg, data) { log('✗', msg, data); }

    // ===============================
    // Token Management
    // ===============================

    async function waitForToken(maxWait = CONFIG.waitForToken) {
        log('ℹ', 'En attente du token Crunchyroll...');

        const startTime = Date.now();

        while (Date.now() - startTime < maxWait) {
            if (window.__BCR_TOKEN__) {
                logSuccess('Token intercepté!', {
                    accountId: window.__BCR_ACCOUNT_ID__,
                    profileId: window.__BCR_PROFILE_ID__,
                    expiresAt: new Date(window.__BCR_TOKEN_EXPIRY__),
                });
                return {
                    token: window.__BCR_TOKEN__,
                    accountId: window.__BCR_ACCOUNT_ID__,
                    profileId: window.__BCR_PROFILE_ID__,
                    expiresAt: window.__BCR_TOKEN_EXPIRY__,
                };
            }

            await new Promise(resolve => setTimeout(resolve, 100));
        }

        throw new Error('Token non reçu après ' + maxWait + 'ms');
    }

    // ===============================
    // API Requests
    // ===============================

    async function apiRequest(endpoint, options = {}) {
        const timeout = options.timeout || CONFIG.requestTimeout;

        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error('Request timeout'));
            }, timeout);

            fetch(endpoint, options)
                .then(response => {
                    clearTimeout(timer);
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}`);
                    }
                    return response.json();
                })
                .then(resolve)
                .catch(reject);
        });
    }

    async function getSeries(seriesId, token) {
        logInfo(`Récupération de la série: ${seriesId}`);

        try {
            const params = new URLSearchParams({
                endpoint: `/content/v2/cms/series/${seriesId}/`,
            });

            const response = await apiRequest(`${CONFIG.apiBase}?${params}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                },
            });

            logSuccess(`Série récupérée: ${seriesId}`, {
                title: response.data?.title || 'N/A',
                id: response.data?.id || 'N/A',
            });

            return response;
        } catch (error) {
            logError(`Erreur lors de la récupération de ${seriesId}: ${error.message}`);
            throw error;
        }
    }

    async function getRating(contentId, accountUuid, token, contentType = 'series') {
        logInfo(`Récupération du rating: ${contentId}`);

        try {
            const params = new URLSearchParams({
                endpoint: `/content-reviews/v3/user/${accountUuid}/rating/${contentType}/${contentId}`,
            });

            const response = await apiRequest(`${CONFIG.apiBase}?${params}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                },
            });

            logSuccess(`Rating récupéré: ${contentId}`, response);
            return response;
        } catch (error) {
            logInfo(`Rating non disponible pour ${contentId}: ${error.message}`);
            return null;
        }
    }

    async function getBrowseData(token, options = {}) {
        logInfo('Récupération de la page de navigation');

        try {
            const params = new URLSearchParams({
                endpoint: CONFIG.dataEndpoints.browse,
                sort_by: options.sortBy || 'popularity',
                limit: options.limit || 50,
                ...options,
            });

            const response = await apiRequest(`${CONFIG.apiBase}?${params}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                },
            });

            logSuccess('Page de navigation récupérée', {
                count: response.data?.length || 0,
            });

            return response;
        } catch (error) {
            logError(`Erreur lors de la récupération de la page: ${error.message}`);
            throw error;
        }
    }

    // ===============================
    // Data Sync
    // ===============================

    async function syncSeriesData(seriesIds, auth) {
        logInfo(`Synchronisation de ${seriesIds.length} séries...`);

        const results = {
            success: [],
            failed: [],
            startTime: new Date().toISOString(),
        };

        for (const seriesId of seriesIds) {
            try {
                const data = await getSeries(seriesId, auth.token);
                results.success.push({
                    id: seriesId,
                    title: data.data?.title,
                    timestamp: new Date().toISOString(),
                });

                // Délai pour respecter les limites de débit
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
                results.failed.push({
                    id: seriesId,
                    error: error.message,
                });
            }
        }

        results.endTime = new Date().toISOString();
        logSuccess(`Synchronisation terminée: ${results.success.length} succès, ${results.failed.length} échecs`);

        return results;
    }

    async function syncRatingData(seriesIds, accountUuid, auth) {
        logInfo(`Synchronisation des ratings pour ${seriesIds.length} contenus...`);

        const results = {
            success: [],
            failed: [],
            skipped: [],
            startTime: new Date().toISOString(),
        };

        for (const contentId of seriesIds) {
            try {
                const data = await getRating(contentId, accountUuid, auth.token);

                if (data) {
                    results.success.push({
                        id: contentId,
                        rating: data.rating || 'no-rating',
                        timestamp: new Date().toISOString(),
                    });
                } else {
                    results.skipped.push({ id: contentId });
                }

                // Délai
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
                results.failed.push({
                    id: contentId,
                    error: error.message,
                });
            }
        }

        results.endTime = new Date().toISOString();
        logSuccess(`Ratings synchronisés: ${results.success.length} succès, ${results.skipped.length} ignorés, ${results.failed.length} échecs`);

        return results;
    }

    // ===============================
    // Public API
    // ===============================

    window.__BCR_DataSync__ = {
        /**
         * Initialiser et synchroniser les données
         * @param {string[]} seriesIds - Liste des IDs de séries à récupérer
         * @param {object} options - Options additionnelles
         * @returns {Promise<object>} Résumé de la synchronisation
         */
        async initialize(seriesIds, options = {}) {
            try {
                logInfo('Initialisation de la synchronisation des données...');

                // 1. Attendre le token
                const auth = await waitForToken(options.waitForToken || CONFIG.waitForToken);

                // 2. Synchroniser les séries
                const seriesResults = await syncSeriesData(
                    seriesIds || [],
                    auth
                );

                // 3. Synchroniser les ratings (optionnel)
                let ratingResults = null;
                if (options.includeRatings && auth.accountId) {
                    ratingResults = await syncRatingData(
                        seriesIds || [],
                        auth.accountId,
                        auth
                    );
                }

                // 4. Récupérer la page de navigation (optionnel)
                let browseResults = null;
                if (options.includeBrowse) {
                    try {
                        browseResults = await getBrowseData(auth.token, options.browseOptions);
                    } catch (error) {
                        logError(`Erreur lors de la récupération de la page: ${error.message}`);
                    }
                }

                const summary = {
                    timestamp: new Date().toISOString(),
                    seriesSync: seriesResults,
                    ratingsSync: ratingResults,
                    browseSync: browseResults,
                    auth: {
                        accountId: auth.accountId,
                        profileId: auth.profileId,
                        tokenExpiry: new Date(auth.expiresAt),
                    },
                };

                logSuccess('Synchronisation complétée', summary);
                return summary;
            } catch (error) {
                logError(`Erreur fatale: ${error.message}`);
                throw error;
            }
        },

        /**
         * Récupérer les informations du token actuel
         */
        getTokenInfo() {
            return {
                hasToken: !!window.__BCR_TOKEN__,
                accountId: window.__BCR_ACCOUNT_ID__,
                profileId: window.__BCR_PROFILE_ID__,
                expiresAt: window.__BCR_TOKEN_EXPIRY__
                    ? new Date(window.__BCR_TOKEN_EXPIRY__)
                    : null,
                isValid: window.__BCR_TOKEN_EXPIRY__
                    ? window.__BCR_TOKEN_EXPIRY__ > Date.now()
                    : false,
            };
        },

        /**
         * Logger des informations de débogage
         */
        debug() {
            const tokenInfo = this.getTokenInfo();
            const output = {
                timestamp: new Date().toISOString(),
                token: tokenInfo,
                config: CONFIG,
            };
            logInfo('Informations de débogage', output);
            return output;
        },
    };

    logSuccess('Extension Data Sync initialisée');
    logInfo('Utiliser window.__BCR_DataSync__.initialize(seriesIds, options) pour commencer');
})();

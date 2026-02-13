#!/usr/bin/env node

/**
 * BetterCrunchyroll - Test Script
 * 
 * Teste les requêtes API Crunchyroll exactement comme les endpoints documentés:
 * - getSeries.md: GET /content/v2/cms/series/${series_id}/
 * - getRating.md: GET /content-reviews/v3/user/${account_uuid}/rating/${content_id}
 * 
 * Usage:
 *   node scripts/test-crunchyroll-api.js
 */

const https = require('https');

// ===============================
// Configuration
// ===============================

const CONFIG = {
    crunchyrollApi: 'https://beta-api.crunchyroll.com',
    basicAuth: 'eHVuaWh2ZWRidDNtYmlzdWhldnQ6MWtJUzVkeVR2akUwX3JxYUEzWWVBaDBiVVhVbXhXMTE=',
    timeout: 30000,
    testSeriesIds: ['G0XHWM1JP', 'G1XHJV0G7'],
};

const Colors = {
    Reset: '\x1b[0m',
    Bright: '\x1b[1m',
    Green: '\x1b[32m',
    Yellow: '\x1b[33m',
    Blue: '\x1b[34m',
    Red: '\x1b[31m',
    Cyan: '\x1b[36m',
};

// ===============================
// Utilities
// ===============================

function log(color, prefix, message, data = null) {
    const msg = `${color}[${prefix}]${Colors.Reset} ${message}`;
    if (data) {
        console.log(msg);
        console.log(JSON.stringify(data, null, 2));
    } else {
        console.log(msg);
    }
}

function logSuccess(message, data) { log(Colors.Green, '✓', message, data); }
function logInfo(message, data) { log(Colors.Blue, 'ℹ', message, data); }
function logWarn(message, data) { log(Colors.Yellow, '⚠', message, data); }
function logError(message, data) { log(Colors.Red, '✗', message, data); }
function logTest(message, data) { log(Colors.Cyan, 'TEST', message, data); }

function printBox(title) {
    const width = 60;
    const padding = Math.floor((width - title.length - 2) / 2);
    console.log(`\n${Colors.Bright}╔${'═'.repeat(width)}╗${Colors.Reset}`);
    console.log(`${Colors.Bright}║ ${' '.repeat(padding)}${title}${' '.repeat(width - title.length - padding - 2)} ║${Colors.Reset}`);
    console.log(`${Colors.Bright}╚${'═'.repeat(width)}╝${Colors.Reset}\n`);
}

// ===============================
// HTTPS Helper
// ===============================

function httpsPost(url, postData, headers = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const defaultHeaders = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData),
            ...headers,
        };

        const options = {
            hostname: urlObj.hostname,
            path: urlObj.pathname + urlObj.search,
            method: 'POST',
            headers: defaultHeaders,
            timeout: CONFIG.timeout,
        };

        const request = https.request(options, (response) => {
            let data = '';
            response.on('data', chunk => { data += chunk; });
            response.on('end', () => {
                if (response.statusCode >= 200 && response.statusCode < 300) {
                    try {
                        resolve({ status: response.statusCode, data: JSON.parse(data) });
                    } catch {
                        resolve({ status: response.statusCode, data });
                    }
                } else {
                    reject(new Error(`HTTP ${response.statusCode}: ${data}`));
                }
            });
        });

        request.on('error', reject);
        request.on('timeout', () => {
            request.destroy();
            reject(new Error('Request timeout'));
        });
        request.write(postData);
        request.end();
    });
}

function httpsGet(url, headers = {}) {
    return new Promise((resolve, reject) => {
        const request = https.get(
            url,
            { headers, timeout: CONFIG.timeout },
            (response) => {
                let data = '';
                response.on('data', chunk => { data += chunk; });
                response.on('end', () => {
                    if (response.statusCode >= 200 && response.statusCode < 300) {
                        try {
                            resolve({ status: response.statusCode, data: JSON.parse(data) });
                        } catch {
                            resolve({ status: response.statusCode, data });
                        }
                    } else {
                        reject(new Error(`HTTP ${response.statusCode}: ${data}`));
                    }
                });
            }
        );

        request.on('error', reject);
        request.setTimeout(CONFIG.timeout, () => {
            request.destroy();
            reject(new Error('Request timeout'));
        });
    });
}

// ===============================
// Token Generation
// ===============================

function generateEtpId() {
    const chars = 'abcdef0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
        result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
}

async function getToken() {
    logInfo('Récupération du token Crunchyroll...');

    const etpId = generateEtpId();
    const postData = 'grant_type=client_id';

    try {
        const response = await httpsPost(
            `${CONFIG.crunchyrollApi}/auth/v1/token`,
            postData,
            {
                'Authorization': `Basic ${CONFIG.basicAuth}`,
                'ETP-Anonymous-ID': etpId,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            }
        );

        const token = response.data.access_token;
        const accountUuid = response.data.account_id;

        logSuccess('Token généré avec succès', {
            expiresIn: response.data.expires_in,
            accountUuid: accountUuid?.substring(0, 8) + '...',
        });

        return { token, accountUuid };
    } catch (error) {
        logError('Erreur lors de la génération du token: ' + error.message);
        throw error;
    }
}

// ===============================
// API Tests
// ===============================

async function testGetSeries(seriesId, token) {
    logTest(`getSeries.md - GET /content/v2/cms/series/${seriesId}/`, {
        endpoint: `/content/v2/cms/series/${seriesId}/`,
        method: 'GET',
        headers: {
            'Authorization': 'Bearer [TOKEN]',
            'Accept': 'application/json',
        },
    });

    try {
        const response = await httpsGet(
            `${CONFIG.crunchyrollApi}/content/v2/cms/series/${seriesId}/`,
            {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            }
        );

        logSuccess(`getSeries résultat pour ${seriesId}`, {
            status: response.status,
            dataKeys: Object.keys(response.data || {}),
            title: response.data?.data?.title || 'N/A',
            description: response.data?.data?.description?.substring(0, 100) + '...',
        });

        return response.data;
    } catch (error) {
        logError(`Erreur getSeries: ${error.message}`);
        return null;
    }
}

async function testGetRating(contentId, accountUuid, token) {
    logTest(`getRating.md - GET /content-reviews/v3/user/${accountUuid}/rating/series/${contentId}`, {
        endpoint: `/content-reviews/v3/user/${accountUuid}/rating/series/${contentId}`,
        method: 'GET',
        headers: {
            'Authorization': 'Bearer [TOKEN]',
            'Accept': 'application/json',
        },
    });

    try {
        const response = await httpsGet(
            `${CONFIG.crunchyrollApi}/content-reviews/v3/user/${accountUuid}/rating/series/${contentId}`,
            {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            }
        );

        logSuccess(`getRating résultat pour ${contentId}`, {
            status: response.status,
            rating: response.data?.rating || 'no-rating',
            ratedAt: response.data?.created_at || 'never rated',
        });

        return response.data;
    } catch (error) {
        logWarn(`getRating (non critique): ${error.message}`);
        logInfo('Les ratings peuvent ne pas exister pour tous les contenus');
        return null;
    }
}

// ===============================
// Main Test Suite
// ===============================

async function runTests() {
    printBox('BetterCrunchyroll - Test Suite API Crunchyroll');

    console.log(`${Colors.Blue}Configuration:${Colors.Reset}`);
    console.log(`  API Base: ${CONFIG.crunchyrollApi}`);
    console.log(`  Test Series: ${CONFIG.testSeriesIds.join(', ')}`);
    console.log(`  Timeout: ${CONFIG.timeout}ms\n`);

    try {
        // === ÉTAPE 1: Authentification ===
        printBox('Étape 1: Authentification');
        const { token, accountUuid } = await getToken();

        // === ÉTAPE 2: getSeries ===
        printBox('Étape 2: Test getSeries.md');
        const seriesResults = [];

        for (const seriesId of CONFIG.testSeriesIds) {
            const result = await testGetSeries(seriesId, token);
            seriesResults.push({ id: seriesId, success: !!result });

            // Délai
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        // === ÉTAPE 3: getRating ===
        printBox('Étape 3: Test getRating.md');
        const ratingResults = [];

        for (const seriesId of CONFIG.testSeriesIds) {
            const result = await testGetRating(seriesId, accountUuid, token);
            ratingResults.push({ id: seriesId, success: !!result });

            // Délai
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        // === RÉSUMÉ ===
        printBox('Résumé des Tests');

        const succeededSeries = seriesResults.filter(r => r.success).length;
        const succeededRatings = ratingResults.filter(r => r.success).length;

        logSuccess(`getSeries: ${succeededSeries}/${seriesResults.length}`);
        logSuccess(`getRating: ${succeededRatings}/${ratingResults.length}`);

        console.log(`\n${Colors.Green}${Colors.Bright}✓ Tous les tests terminés!${Colors.Reset}\n`);

    } catch (error) {
        logError('Test suite échouée');
        logError(error.message);
        process.exit(1);
    }
}

// Run tests
runTests().catch(error => {
    logError('Erreur non gérée: ' + error.message);
    process.exit(1);
});

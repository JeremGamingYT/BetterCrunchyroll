#!/usr/bin/env node

/**
 * BetterCrunchyroll - API Data Fetcher v2
 * 
 * Version améliorée qui utilise le serveur proxy Next.js
 * Récupère les données de l'API Crunchyroll et les organise dans Data/
 * 
 * Usage:
 *   1. Démarrer le serveur Next.js: npm run dev
 *   2. Exécuter le script: node scripts/fetch-crunchyroll-data-proxy.js
 * 
 * Options:
 *   --series ID,...  : IDs de séries à récupérer (séparées par virgule)
 *   --rating         : Récupérer aussi les ratings des contenus
 *   --account-id     : UUID du compte pour les ratings
 *   --localhost      : URL du serveur local (défaut: http://localhost:3000)
 *   --dry-run        : Simuler sans sauvegarder
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

// ===============================
// Configuration
// ===============================

const CONFIG = {
    localhost: process.argv.includes('--localhost') 
        ? process.argv[process.argv.indexOf('--localhost') + 1] 
        : 'http://localhost:3000',
    dataDir: path.join(__dirname, '../Data'),
    timeout: 30000,
};

// ===============================
// Logging & Utilities
// ===============================

const Colors = {
    Reset: '\x1b[0m',
    Bright: '\x1b[1m',
    Green: '\x1b[32m',
    Yellow: '\x1b[33m',
    Blue: '\x1b[34m',
    Red: '\x1b[31m',
};

function log(color, prefix, message) {
    console.log(`${color}[${prefix}]${Colors.Reset} ${message}`);
}

function logSuccess(message) { log(Colors.Green, '✓', message); }
function logInfo(message) { log(Colors.Blue, 'ℹ', message); }
function logWarn(message) { log(Colors.Yellow, '⚠', message); }
function logError(message) { log(Colors.Red, '✗', message); }

// ===============================
// HTTP Helper
// ===============================

function httpGet(url) {
    return new Promise((resolve, reject) => {
        const request = http.get(url, { timeout: CONFIG.timeout }, (response) => {
            let data = '';

            response.on('data', chunk => {
                data += chunk;
            });

            response.on('end', () => {
                if (response.statusCode >= 200 && response.statusCode < 300) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(new Error(`Invalid JSON response: ${e.message}`));
                    }
                } else {
                    reject(new Error(`HTTP ${response.statusCode}: ${data}`));
                }
            });
        });

        request.on('error', reject);
        request.setTimeout(CONFIG.timeout, () => {
            request.destroy();
            reject(new Error('Request timeout'));
        });
    });
}

// ===============================
// Crunchyroll API Calls via Proxy
// ===============================

async function getSeries(seriesId) {
    logInfo(`Récupération de la série: ${seriesId}`);
    
    try {
        const endpoint = `/content/v2/cms/series/${seriesId}/`;
        const url = `${CONFIG.localhost}/api/crunchyroll?endpoint=${encodeURIComponent(endpoint)}`;
        
        const data = await httpGet(url);
        logSuccess(`Série récupérée: ${seriesId}`);
        return data;
    } catch (error) {
        logError(`Erreur lors de la récupération de la série ${seriesId}: ${error.message}`);
        throw error;
    }
}

async function getRating(contentId, accountUuid) {
    logInfo(`Récupération du rating pour: ${contentId}`);
    
    try {
        const endpoint = `/content-reviews/v3/user/${accountUuid}/rating/series/${contentId}`;
        const url = `${CONFIG.localhost}/api/crunchyroll?endpoint=${encodeURIComponent(endpoint)}`;
        
        const data = await httpGet(url);
        logSuccess(`Rating récupéré: ${contentId}`);
        return data;
    } catch (error) {
        logWarn(`Rating non disponible pour ${contentId}: ${error.message}`);
        return null;
    }
}

// ===============================
// File System Operations
// ===============================

function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

function saveJson(filePath, data) {
    const dirPath = path.dirname(filePath);
    ensureDir(dirPath);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    logSuccess(`Fichier sauvegardé: ${path.relative(CONFIG.dataDir, filePath)}`);
}

function getExistingSeriesIds() {
    const seriesDir = path.join(CONFIG.dataDir, 'series');
    
    if (!fs.existsSync(seriesDir)) {
        return [];
    }

    return fs.readdirSync(seriesDir)
        .filter(file => {
            const fullPath = path.join(seriesDir, file);
            return fs.statSync(fullPath).isDirectory();
        });
}

// ===============================
// Data Processing
// ===============================

async function processSeries(seriesId, dryRun = false) {
    const result = {
        seriesId,
        success: false,
        data: null,
        error: null,
    };

    try {
        const seriesData = await getSeries(seriesId);

        if (!dryRun) {
            const seriesDir = path.join(CONFIG.dataDir, 'series', seriesId);
            const seriesFile = path.join(seriesDir, 'series.json');

            const payload = {
                total: seriesData.data ? 1 : 0,
                data: seriesData.data ? [seriesData.data] : [],
                metadata: {
                    timestamp: new Date().toISOString(),
                    source: 'crunchyroll-api',
                    endpoint: `/content/v2/cms/series/${seriesId}/`,
                },
            };

            saveJson(seriesFile, payload);
        }

        result.success = true;
        result.data = seriesData;
        
    } catch (error) {
        result.error = error.message;
        logError(`Erreur pour la série ${seriesId}: ${error.message}`);
    }

    return result;
}

async function processRating(contentId, accountUuid, dryRun = false) {
    const result = {
        contentId,
        success: false,
        data: null,
        error: null,
    };

    try {
        const ratingData = await getRating(contentId, accountUuid);

        if (ratingData && !dryRun) {
            const ratingDir = path.join(CONFIG.dataDir, 'rating-true');
            const ratingFile = path.join(ratingDir, `${contentId}.json`);

            const payload = {
                contentId,
                ...ratingData,
                metadata: {
                    timestamp: new Date().toISOString(),
                    source: 'crunchyroll-api',
                    endpoint: `/content-reviews/v3/user/${accountUuid}/rating/series/${contentId}`,
                },
            };

            saveJson(ratingFile, payload);
            result.success = true;
        }

        result.data = ratingData;
        
    } catch (error) {
        result.error = error.message;
    }

    return result;
}

// ===============================
// Main Execution
// ===============================

async function main() {
    console.log(`\n${Colors.Bright}╔══════════════════════════════════════════════════════╗${Colors.Reset}`);
    console.log(`${Colors.Bright}║   BetterCrunchyroll - API Data Fetcher (Proxy)       ║${Colors.Reset}`);
    console.log(`${Colors.Bright}╚══════════════════════════════════════════════════════╝${Colors.Reset}\n`);

    // Parser les arguments
    const args = process.argv.slice(2);
    const options = {
        seriesIds: [],
        rating: false,
        accountId: null,
        dryRun: args.includes('--dry-run'),
    };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--series':
                options.seriesIds = args[++i].split(',').map(s => s.trim());
                break;
            case '--rating':
                options.rating = true;
                break;
            case '--account-id':
                options.accountId = args[++i];
                break;
        }
    }

    if (options.dryRun) {
        logWarn('Mode DRY-RUN activé - Aucune donnée ne sera sauvegardée');
    }

    logInfo(`Serveur proxy: ${CONFIG.localhost}`);
    logInfo('Assurez-vous que le serveur Next.js est en cours d\'exécution! (npm run dev)');

    if (options.seriesIds.length === 0) {
        const existingIds = getExistingSeriesIds();
        if (existingIds.length > 0) {
            options.seriesIds = existingIds;
            logInfo(`${existingIds.length} séries trouvées dans Data/series`);
        } else {
            logWarn('Aucune série trouvée. Utilisation de séries exemples...');
            options.seriesIds = ['G0XHWM1JP', 'G1XHJV0G7'];
        }
    }

    try {
        // Récupération des données de séries
        logInfo('Récupération des séries...');
        const seriesResults = [];
        
        for (const seriesId of options.seriesIds) {
            const result = await processSeries(seriesId, options.dryRun);
            seriesResults.push(result);
            
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        // Récupération des ratings (optionnel)
        let ratingResults = [];
        if (options.rating && options.accountId) {
            logInfo('Récupération des ratings...');
            
            for (const seriesId of options.seriesIds) {
                const result = await processRating(seriesId, options.accountId, options.dryRun);
                ratingResults.push(result);
                
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        }

        // Résumé
        console.log(`\n${Colors.Bright}╔══════════════════════════════════════════════════════╗${Colors.Reset}`);
        console.log(`${Colors.Bright}║                        Résumé                         ║${Colors.Reset}`);
        console.log(`${Colors.Bright}╚══════════════════════════════════════════════════════╝${Colors.Reset}\n`);

        const successSeries = seriesResults.filter(r => r.success).length;
        const successRatings = ratingResults.filter(r => r.success).length;

        logSuccess(`Séries: ${successSeries}/${seriesResults.length} récupérées`);
        if (options.rating) {
            logSuccess(`Ratings: ${successRatings}/${ratingResults.length} récupérés`);
        }

        logInfo(`Données sauvegardées dans: ${CONFIG.dataDir}`);
        logSuccess('Opération terminée avec succès!');

        const errors = [
            ...seriesResults.filter(r => !r.success && r.error),
            ...ratingResults.filter(r => !r.success && r.error),
        ];

        if (errors.length > 0) {
            console.log(`\n${Colors.Yellow}Erreurs:${Colors.Reset}`);
            errors.forEach(err => {
                logError(`${err.seriesId || err.contentId}: ${err.error}`);
            });
        }

        console.log('');
        
    } catch (error) {
        logError(`Erreur fatale: ${error.message}`);
        console.log('');
        process.exit(1);
    }
}

main().catch(error => {
    logError(`Erreur non gérée: ${error.message}`);
    process.exit(1);
});

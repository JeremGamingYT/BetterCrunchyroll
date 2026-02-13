#!/usr/bin/env node

/**
 * BetterCrunchyroll - API Data Fetcher
 * 
 * Script professionnel qui interroge l'API Crunchyroll et organise les données
 * dans le dossier Data selon la structure du projet.
 * 
 * Usage:
 *   node scripts/fetch-crunchyroll-data.js [--token TOKEN] [--series ID,...] [--rating]
 * 
 * Options:
 *   --token TOKEN    : Token d'authentification Crunchyroll (optionnel, récupéré automatiquement)
 *   --series ID,...  : IDs de séries à récupérer (séparées par virgule)
 *   --rating         : Récupérer aussi les ratings des contenus
 *   --account-id     : UUID du compte pour les ratings
 *   --dry-run        : Simuler sans sauvegarder
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// ===============================
// Configuration
// ===============================

const CONFIG = {
    crunchyrollApi: 'https://www.crunchyroll.com',
    basicAuth: 'eHVuaWh2ZWRidDNtYmlzdWhldnQ6MWtJUzVkeVR2akUwX3JxYUEzWWVBaDBiVVhVbXhXMTE=',
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
// HTTPS Helper
// ===============================

function httpsGet(url, headers = {}) {
    return new Promise((resolve, reject) => {
        const request = https.get(url, { headers }, (response) => {
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
// Token Management
// ===============================

async function getAccessToken(tokenArg = null) {
    // Si un token est fourni en paramètre, l'utiliser
    if (tokenArg) {
        logInfo(`Utilisation du token fourni en paramètre`);
        return tokenArg;
    }

    logInfo('Génération d\'un nouveau token Crunchyroll...');
    
    try {
        const etpId = generateEtpId();
        const url = `${CONFIG.crunchyrollApi}/auth/v1/token`;
        
        const response = await new Promise((resolve, reject) => {
            const postData = 'grant_type=client_id';
            const options = {
                hostname: 'www.crunchyroll.com',
                path: '/auth/v1/token',
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${CONFIG.basicAuth}`,
                    'ETP-Anonymous-ID': etpId,
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': postData.length,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                },
                timeout: CONFIG.timeout,
            };

            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', chunk => { data += chunk; });
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        try {
                            resolve(JSON.parse(data));
                        } catch (e) {
                            reject(new Error(`Invalid JSON: ${e.message}`));
                        }
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}`));
                    }
                });
            });

            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Token request timeout'));
            });

            req.write(postData);
            req.end();
        });

        const token = response.access_token;
        const expiresIn = response.expires_in || 3600;
        
        logSuccess(`Token généré avec succès (expire dans ${expiresIn}s)`);
        return token;
    } catch (error) {
        logError(`Erreur lors de la génération du token: ${error.message}`);
        throw error;
    }
}

function generateEtpId() {
    const chars = 'abcdef0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
        result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
}

// ===============================
// Crunchyroll API Calls
// ===============================

async function getSeries(seriesId, token) {
    logInfo(`Récupération de la série: ${seriesId}`);
    
    try {
        const url = `${CONFIG.crunchyrollApi}/content/v2/cms/series/${seriesId}/`;
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        };

        const data = await httpsGet(url, headers);
        logSuccess(`Série récupérée: ${seriesId}`);
        return data;
    } catch (error) {
        logError(`Erreur lors de la récupération de la série ${seriesId}: ${error.message}`);
        throw error;
    }
}

async function getRating(contentId, accountUuid, token, contentType = 'series') {
    logInfo(`Récupération du rating pour: ${contentId} (type: ${contentType})`);
    
    try {
        const url = `${CONFIG.crunchyrollApi}/content-reviews/v3/user/${accountUuid}/rating/${contentType}/${contentId}`;
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        };

        const data = await httpsGet(url, headers);
        logSuccess(`Rating récupéré: ${contentId}`);
        return data;
    } catch (error) {
        // Les ratings peuvent ne pas exister pour certains contenus
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

function loadJson(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        }
    } catch (error) {
        logWarn(`Impossible de lire: ${filePath}`);
    }
    return null;
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

async function processSeries(seriesId, token, dryRun = false) {
    const result = {
        seriesId,
        success: false,
        data: null,
        error: null,
    };

    try {
        // Récupérer les données de la série
        const seriesData = await getSeries(seriesId, token);

        if (!dryRun) {
            // Sauvegarder dans Data/series/{seriesId}/series.json
            const seriesDir = path.join(CONFIG.dataDir, 'series', seriesId);
            const seriesFile = path.join(seriesDir, 'series.json');

            // Wrapper dans un format compatible
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

async function processRating(contentId, accountUuid, token, dryRun = false) {
    const result = {
        contentId,
        success: false,
        data: null,
        error: null,
    };

    try {
        const ratingData = await getRating(contentId, accountUuid, token);

        if (ratingData && !dryRun) {
            // Sauvegarder dans Data/rating-{type}/
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
    console.log(`${Colors.Bright}║   BetterCrunchyroll - API Data Fetcher               ║${Colors.Reset}`);
    console.log(`${Colors.Bright}╚══════════════════════════════════════════════════════╝${Colors.Reset}\n`);

    // Parser les arguments
    const args = process.argv.slice(2);
    const options = {
        token: null,
        seriesIds: [],
        rating: false,
        accountId: null,
        dryRun: false,
    };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--token':
                options.token = args[++i];
                break;
            case '--series':
                options.seriesIds = args[++i].split(',').map(s => s.trim());
                break;
            case '--rating':
                options.rating = true;
                break;
            case '--account-id':
                options.accountId = args[++i];
                break;
            case '--dry-run':
                options.dryRun = true;
                break;
        }
    }

    // Mode dry-run
    if (options.dryRun) {
        logWarn('Mode DRY-RUN activé - Aucune donnée ne sera sauvegardée');
    }

    // Si aucune série n'est spécifiée, utiliser les IDs existants
    if (options.seriesIds.length === 0) {
        const existingIds = getExistingSeriesIds();
        if (existingIds.length > 0) {
            options.seriesIds = existingIds;
            logInfo(`${existingIds.length} séries trouvées dans Data/series`);
        } else {
            logWarn('Aucune série trouvée. Utilisation de séries exemples...');
            options.seriesIds = ['G0XHWM1JP', 'G1XHJV0G7', 'G1XHJVWXG']; // Exemples
        }
    }

    try {
        // Authentification
        logInfo('Étape 1/3: Authentification');
        const token = await getAccessToken(options.token);

        // Récupération des données de séries
        logInfo('Étape 2/3: Récupération des séries');
        const seriesResults = [];
        
        for (const seriesId of options.seriesIds) {
            const result = await processSeries(seriesId, token, options.dryRun);
            seriesResults.push(result);
            
            // Délai pour respecter les limites de débit
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Récupération des ratings (optionnel)
        let ratingResults = [];
        if (options.rating && options.accountId) {
            logInfo('Étape 3/3: Récupération des ratings');
            
            for (const seriesId of options.seriesIds) {
                const result = await processRating(seriesId, options.accountId, token, options.dryRun);
                ratingResults.push(result);
                
                // Délai pour respecter les limites de débit
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        } else {
            logInfo('Étape 3/3: Ratings ignorés (non demandés)');
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

        // Afficher les détails des erreurs
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

// Lancer le script
main().catch(error => {
    logError(`Erreur non gérée: ${error.message}`);
    process.exit(1);
});

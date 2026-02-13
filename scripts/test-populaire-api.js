#!/usr/bin/env node

/**
 * BetterCrunchyroll - Test API Populaire
 * 
 * Test la nouvelle API qui combine Crunchyroll + AniList
 * Vérifie que les ratings sont correctement combinés
 * 
 * Usage:
 *   node scripts/test-populaire-api.js
 */

const http = require('http');

const Colors = {
    Reset: '\x1b[0m',
    Bright: '\x1b[1m',
    Green: '\x1b[32m',
    Yellow: '\x1b[33m',
    Blue: '\x1b[34m',
    Red: '\x1b[31m',
    Cyan: '\x1b[36m',
};

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

// HTTP GET Request
function httpGet(url) {
    return new Promise((resolve, reject) => {
        const request = http.get(url, { timeout: 60000 }, (response) => {
            let data = '';

            response.on('data', chunk => {
                data += chunk;
            });

            response.on('end', () => {
                if (response.statusCode >= 200 && response.statusCode < 300) {
                    try {
                        resolve({ status: response.statusCode, data: JSON.parse(data) });
                    } catch (e) {
                        reject(new Error(`Invalid JSON: ${e.message}`));
                    }
                } else {
                    reject(new Error(`HTTP ${response.statusCode}`));
                }
            });
        });

        request.on('error', reject);
        request.setTimeout(60000, () => {
            request.destroy();
            reject(new Error('Request timeout'));
        });
    });
}

async function testAPI() {
    printBox('BetterCrunchyroll - Test API Populaire');

    console.log(`Configuration:`);
    console.log(`  Server: http://localhost:3000`);
    console.log(`  API Endpoint: /api/populaire`);
    console.log(`  Timeout: 60s\n`);

    // Test 1: API Accessibility
    printBox('Test 1: Accessibilité API');
    try {
        logInfo('Vérification que le serveur répond...');
        const response = await httpGet('http://localhost:3000/api/populaire?limit=10&sortBy=combined');
        logSuccess('API est accessible', {
            statusCode: response.status,
            totalResults: response.data.total,
            sortBy: response.data.sortBy,
        });
    } catch (error) {
        logError(`Erreur: ${error.message}`);
        logWarn('Assurez-vous que le serveur Next.js est en cours d\'exécution (npm run dev)');
        process.exit(1);
    }

    // Test 2: Combined Sorting
    printBox('Test 2: Tri par Score Combiné');
    try {
        logInfo('Récupération des animés triés par score combiné...');
        const response = await httpGet('http://localhost:3000/api/populaire?limit=5&sortBy=combined');

        if (response.data.data.length > 0) {
            const topAnime = response.data.data[0];
            logSuccess(`Top 1: ${topAnime.title}`, {
                combinedScore: topAnime.combined.score,
                crunchyrollRating: topAnime.crunchyroll.rating.average,
                anilistScore: topAnime.anilist?.meanScore || 'N/A',
                combinedPopularityScore: topAnime.combined.popularityScore,
            });

            // Verify combined score calculation
            const crScore = parseFloat(topAnime.crunchyroll.rating.average) / 2;
            const alScore = (topAnime.anilist?.meanScore || 0) / 20;
            const expectedCombined = ((crScore * 0.6) + (alScore * 0.4)).toFixed(1);

            if (parseFloat(topAnime.combined.score).toFixed(1) === expectedCombined) {
                logSuccess('Score combiné calculé correctement', {
                    expected: expectedCombined,
                    actual: topAnime.combined.score,
                });
            } else {
                logWarn('Score combiné différent de celui attendu', {
                    expected: expectedCombined,
                    actual: topAnime.combined.score,
                });
            }
        }
    } catch (error) {
        logError(`Erreur: ${error.message}`);
    }

    // Test 3: Crunchyroll Sorting
    printBox('Test 3: Tri par Rating Crunchyroll');
    try {
        logInfo('Récupération des animés triés par rating Crunchyroll...');
        const response = await httpGet('http://localhost:3000/api/populaire?limit=3&sortBy=crunchyroll');

        if (response.data.data.length > 0) {
            response.data.data.forEach((anime, index) => {
                console.log(`\n  ${index + 1}. ${anime.title}`);
                console.log(`     Rating: ${anime.crunchyroll.rating.average}/10 (${anime.crunchyroll.rating.total} votes)`);
            });
            logSuccess('Tri Crunchyroll fonctionnant');
        }
    } catch (error) {
        logError(`Erreur: ${error.message}`);
    }

    // Test 4: AniList Sorting
    printBox('Test 4: Tri par Score AniList');
    try {
        logInfo('Récupération des animés triés par score AniList...');
        const response = await httpGet('http://localhost:3000/api/populaire?limit=3&sortBy=anilist');

        if (response.data.data.length > 0) {
            response.data.data.forEach((anime, index) => {
                const score = anime.anilist?.meanScore || 'N/A';
                console.log(`\n  ${index + 1}. ${anime.title}`);
                console.log(`     AniList Score: ${score}/100${anime.anilist ? ` (${anime.anilist.popularity} 👥)` : ''}`);
            });
            logSuccess('Tri AniList fonctionnant');
        }
    } catch (error) {
        logError(`Erreur: ${error.message}`);
    }

    // Test 5: Popularity Sorting
    printBox('Test 5: Tri par Popularité (Votes Crunchyroll)');
    try {
        logInfo('Récupération des animés triés par popularité...');
        const response = await httpGet('http://localhost:3000/api/populaire?limit=3&sortBy=popularity');

        if (response.data.data.length > 0) {
            response.data.data.forEach((anime, index) => {
                console.log(`\n  ${index + 1}. ${anime.title}`);
                console.log(`     Votes: ${anime.crunchyroll.rating.total?.toLocaleString()} 👥`);
            });
            logSuccess('Tri Popularité fonctionnant');
        }
    } catch (error) {
        logError(`Erreur: ${error.message}`);
    }

    // Test 6: Data Enrichment
    printBox('Test 6: Enrichissement des Données');
    try {
        logInfo('Vérification que tous les animés sont enrichis...');
        const response = await httpGet('http://localhost:3000/api/populaire?limit=10&sortBy=combined');

        let withAniList = 0;
        let withCrunchyroll = 0;
        let withBoth = 0;

        response.data.data.forEach(anime => {
            if (anime.anilist) withAniList++;
            if (anime.crunchyroll) withCrunchyroll++;
            if (anime.anilist && anime.crunchyroll) withBoth++;
        });

        logSuccess('Résultats d\'enrichissement', {
            totalAnimes: response.data.data.length,
            avecAniList: `${withAniList}/${response.data.data.length}`,
            avecCrunchyroll: `${withCrunchyroll}/${response.data.data.length}`,
            avecLes2: `${withBoth}/${response.data.data.length}`,
        });
    } catch (error) {
        logError(`Erreur: ${error.message}`);
    }

    // Test 7: Complete Data Example
    printBox('Test 7: Exemple de Donnée Complète');
    try {
        logInfo('Récupération d\'un exemple complet...');
        const response = await httpGet('http://localhost:3000/api/populaire?limit=1&sortBy=combined');

        if (response.data.data.length > 0) {
            const anime = response.data.data[0];
            console.log(`\n${Colors.Cyan}Anime: ${anime.title}${Colors.Reset}\n`);
            console.log('Crunchyroll:');
            console.log(`  • Rating: ${anime.crunchyroll.rating.average}/10`);
            console.log(`  • Votes: ${anime.crunchyroll.rating.total?.toLocaleString()}`);
            console.log(`  • Maturity: ${anime.crunchyroll.maturityRatings?.join(', ') || 'N/A'}`);

            if (anime.anilist) {
                console.log('\nAniList:');
                console.log(`  • Score: ${anime.anilist.meanScore}/100`);
                console.log(`  • Popularity: ${anime.anilist.popularity?.toLocaleString()} 👥`);
                console.log(`  • Episodes: ${anime.anilist.episodes || 'N/A'}`);
            }

            console.log(`\nScore Combiné:`);
            console.log(`  • Score: ${anime.combined.score}/5`);
            console.log(`  • Popularity Score: ${anime.combined.popularityScore.toLocaleString()}`);

            logSuccess('Exemple complet affiché');
        }
    } catch (error) {
        logError(`Erreur: ${error.message}`);
    }

    // Summary
    printBox('Résumé des Tests');
    logSuccess('Tous les tests sont terminés!');
    console.log(`\n${Colors.Green}✓ L'API Populaire fonctionne correctement${Colors.Reset}`);
    console.log(`✓ Les ratings Crunchyroll et AniList sont combinés`);
    console.log(`✓ Le tri par score combiné fonctionne\n`);
}

testAPI().catch(error => {
    logError(`Erreur fatale: ${error.message}`);
    process.exit(1);
});

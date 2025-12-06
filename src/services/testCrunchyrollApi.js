/**
 * Script de test pour l'API Crunchyroll
 * À exécuter depuis la console de l'extension
 */

import crunchyrollAPI from './crunchyrollApi.js';

// Fonction de test principale
async function testCrunchyrollAPI() {
    console.log('🧪 === TEST CRUNCHYROLL API ===\n');

    try {
        // 1. Initialiser l'API
        console.log('1️⃣ Initialisation de l\'API...');
        const initialized = await crunchyrollAPI.initialize();

        if (!initialized) {
            console.error('❌ Échec de l\'initialisation. Vérifiez que vous êtes connecté à Crunchyroll.');
            return;
        }

        console.log('✅ API initialisée avec succès\n');

        // 2. Tester Continue Watching
        console.log('2️⃣ Test Continue Watching...');
        try {
            const continueWatching = await crunchyrollAPI.getContinueWatching(5);
            console.log('✅ Continue Watching:', continueWatching);
            console.log(`   → ${continueWatching?.data?.length || 0} items\n`);
        } catch (error) {
            console.error('❌ Erreur Continue Watching:', error.message);
        }

        // 3. Tester Watchlist
        console.log('3️⃣ Test Watchlist...');
        try {
            const watchlist = await crunchyrollAPI.getWatchlist(5);
            console.log('✅ Watchlist:', watchlist);
            console.log(`   → ${watchlist?.data?.length || 0} items\n`);
        } catch (error) {
            console.error('❌ Erreur Watchlist:', error.message);
        }

        // 4. Tester Recommendations
        console.log('4️⃣ Test Recommendations...');
        try {
            const recommendations = await crunchyrollAPI.getRecommendations();
            console.log('✅ Recommendations:', recommendations);
            console.log(`   → ${recommendations?.objects?.length || 0} items\n`);
        } catch (error) {
            console.error('❌ Erreur Recommendations:', error.message);
        }

        // 5. Tester Up Next (avec un ID de série)
        console.log('5️⃣ Test Up Next...');
        const testSeriesId = 'G0XHWM1JP'; // SPY x FAMILY
        try {
            const upNext = await crunchyrollAPI.getUpNext(testSeriesId);
            console.log(`✅ Up Next pour ${testSeriesId}:`, upNext);
            console.log(`   → ${upNext?.data?.length || 0} items\n`);
        } catch (error) {
            console.error('❌ Erreur Up Next:', error.message);
        }

        // 6. Tester Search
        console.log('6️⃣ Test Search...');
        try {
            const searchResults = await crunchyrollAPI.search('naruto', 3);
            console.log('✅ Search results:', searchResults);
            console.log(`   → ${searchResults?.data?.length || 0} items\n`);
        } catch (error) {
            console.error('❌ Erreur Search:', error.message);
        }

        // 7. Tester le cache
        console.log('7️⃣ Test Cache...');
        console.log('   Première requête (va en cache):');
        const start1 = performance.now();
        await crunchyrollAPI.getContinueWatching(5);
        const time1 = performance.now() - start1;
        console.log(`   → Temps: ${time1.toFixed(2)}ms`);

        console.log('   Deuxième requête (depuis le cache):');
        const start2 = performance.now();
        await crunchyrollAPI.getContinueWatching(5);
        const time2 = performance.now() - start2;
        console.log(`   → Temps: ${time2.toFixed(2)}ms`);
        console.log(`   → Gain: ${((time1 - time2) / time1 * 100).toFixed(1)}%\n`);

        console.log('🎉 === TOUS LES TESTS TERMINÉS ===');

    } catch (error) {
        console.error('💥 Erreur critique:', error);
    }
}

// Fonction pour tester un endpoint spécifique
async function testEndpoint(endpoint, params = {}) {
    await crunchyrollAPI.initialize();
    const result = await crunchyrollAPI.get(endpoint, params);
    console.log('Result:', result);
    return result;
}

// Fonction pour vider le cache
function clearAPICache() {
    crunchyrollAPI.clearCache();
    console.log('✅ Cache vidé');
}

// Exporter les fonctions de test
window.testCrunchyrollAPI = testCrunchyrollAPI;
window.testEndpoint = testEndpoint;
window.clearAPICache = clearAPICache;
window.crunchyrollAPI = crunchyrollAPI;

console.log(`
🧪 Tests Crunchyroll API chargés !

Utilisez dans la console:
  testCrunchyrollAPI()        - Lance tous les tests
  testEndpoint(url, params)   - Teste un endpoint spécifique
  clearAPICache()             - Vide le cache
  crunchyrollAPI              - Accès direct à l'API

Exemple:
  await testCrunchyrollAPI()
  await testEndpoint('/content/v2/discover/34f17284-47d3-574c-be3d-e32ce10b4ede/watchlist', { n: 5 })
`);

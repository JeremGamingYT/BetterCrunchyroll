/**
 * Quick smoke tests for the Crunchyroll API client.
 * Run from the extension console if needed.
 */

import crunchyrollAPI from './crunchyrollApi';

async function testCrunchyrollAPI() {
    console.log('=== CRUNCHYROLL API SMOKE TEST ===');

    try {
        const initialized = await crunchyrollAPI.initialize();
        if (!initialized) {
            console.error('Initialization failed. Sign in on Crunchyroll and try again.');
            return;
        }

        const continueWatching = await crunchyrollAPI.getContinueWatching(5);
        console.log('Continue Watching items:', continueWatching.length);

        const watchlist = await crunchyrollAPI.getWatchlist(5);
        console.log('Watchlist items:', watchlist.data.length);

        const recommendations = await crunchyrollAPI.getRecommendations();
        console.log('Recommendations items:', recommendations.recommendations.length);

        const testSeriesId = 'G0XHWM1JP'; // SPY x FAMILY
        const upNext = await crunchyrollAPI.getUpNext(testSeriesId);
        console.log('Up Next sample:', upNext);

        const searchResults = await crunchyrollAPI.search('naruto', 3);
        console.log('Search results count:', searchResults.data.length);

        // Cache check
        await crunchyrollAPI.getContinueWatching(5); // warm cache
        const start = performance.now();
        await crunchyrollAPI.getContinueWatching(5);
        const elapsed = performance.now() - start;
        console.log(`Cache fetch duration: ${elapsed.toFixed(2)}ms`);

        console.log('=== SMOKE TEST COMPLETE ===');
    } catch (error) {
        console.error('Smoke test failed:', error);
    }
}

async function testEndpoint(endpoint, params = {}) {
    await crunchyrollAPI.initialize();
    const result = await crunchyrollAPI.fetchEndpoint(endpoint, params);
    console.log('Result:', result);
    return result;
}

function clearAPICache() {
    crunchyrollAPI.clearCache();
    console.log('Cache cleared');
}

// Expose helpers in the console
window.testCrunchyrollAPI = testCrunchyrollAPI;
window.testEndpoint = testEndpoint;
window.clearAPICache = clearAPICache;
window.crunchyrollAPI = crunchyrollAPI;

console.log('Crunchyroll API test helpers loaded. Run testCrunchyrollAPI() to validate quickly.');

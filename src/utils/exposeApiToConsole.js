/**
 * Expose l'API Crunchyroll dans la console globale
 * Pour l'utiliser : window.crunchyAPI.getContinueWatching(10)
 */

import crunchyrollAPI from '../services/crunchyrollApi';
import dataCollector from '../services/dataCollector.js';

// Initialiser l'API (elle demandera les credentials au content script)
crunchyrollAPI.initialize().then((success) => {
    if (success) {
        console.log('✅ CrunchyrollAPI initialisée et disponible dans window.crunchyAPI');
    } else {
        console.warn('⚠️ CrunchyrollAPI initialisée avec des credentials manquantes');
    }
});

// Helper functions pour la console
const apiHelpers = {
    // Instance directe
    api: crunchyrollAPI,
    collector: dataCollector,

    // NEW: Data Collection System
    async collectData() {
        if (confirm("This will start scraping Crunchyroll data and downloading JSON files. Continue?")) {
            return await dataCollector.startCollection();
        }
    },

    // Fonctions raccourcies
    async continueWatching(limit = 10) {
        await crunchyrollAPI.initialize();
        return await crunchyrollAPI.getContinueWatching(limit);
    },

    async watchlist(getAllItems = true) {
        await crunchyrollAPI.initialize();

        if (!getAllItems) {
            // Mode simple : retourne seulement 10 items
            return await crunchyrollAPI.getWatchlist(10);
        }

        // Mode complet : récupère TOUS les items avec pagination
        console.log('[crunchyAPI] Récupération de TOUTE la watchlist...');

        let allItems = [];
        let currentStart = 0;
        const limit = 50; // 50 items par requête
        let hasMore = true;

        while (hasMore) {
            const response = await crunchyrollAPI.getWatchlist(limit, currentStart);

            if (!response || !response.data) {
                break;
            }

            allItems = allItems.concat(response.data);
            console.log(`[crunchyAPI] Récupéré ${allItems.length}/${response.total} items`);

            // Vérifier s'il y a encore des items
            hasMore = allItems.length < response.total;
            currentStart += limit;

            // Sécurité : éviter les boucles infinies
            if (currentStart > 1000) {
                console.warn('[crunchyAPI] Protection : arrêt à 1000 items');
                break;
            }
        }

        console.log(`[crunchyAPI] ✅ Watchlist complète récupérée : ${allItems.length} items`);

        return {
            data: allItems,
            total: allItems.length
        };
    },

    async recommendations() {
        await crunchyrollAPI.initialize();
        return await crunchyrollAPI.getRecommendations();
    },

    async upNext(seriesId) {
        await crunchyrollAPI.initialize();
        return await crunchyrollAPI.getUpNext(seriesId);
    },

    async search(query, limit = 10) {
        await crunchyrollAPI.initialize();
        return await crunchyrollAPI.search(query, limit);
    },

    async series(seriesId) {
        await crunchyrollAPI.initialize();
        return await crunchyrollAPI.getSeries(seriesId);
    },

    async getSeriesWithSeasons(seriesId) {
        await crunchyrollAPI.initialize();
        return await crunchyrollAPI.getSeriesWithSeasons(seriesId);
    },

    async getSeries(seriesId) {
        return await this.series(seriesId);
    },

    async getSeasons(seriesId) {
        await crunchyrollAPI.initialize();
        return await crunchyrollAPI.getSeasons(seriesId);
    },

    async getEpisodes(seasonId) {
        await crunchyrollAPI.initialize();
        return await crunchyrollAPI.getEpisodes(seasonId);
    },

    async getUserRating(contentId, contentType = 'series') {
        await crunchyrollAPI.initialize();
        return await crunchyrollAPI.getUserRating(contentId, contentType);
    },

    async updateUserRating(contentId, rating, contentType = 'series') {
        await crunchyrollAPI.initialize();
        return await crunchyrollAPI.updateUserRating(contentId, rating, contentType);
    },

    async getPlayheads(contentIds) {
        await crunchyrollAPI.initialize();
        return await crunchyrollAPI.getPlayheads(contentIds);
    },

    async getPlayStream(contentId) {
        await crunchyrollAPI.initialize();
        return await crunchyrollAPI.getPlayStream(contentId);
    },

    async browse(options = {}) {
        await crunchyrollAPI.initialize();
        return await crunchyrollAPI.browse(options);
    },

    async isInWatchlist(seriesId) {
        await crunchyrollAPI.initialize();
        return await crunchyrollAPI.isInWatchlist(seriesId);
    },

    async addToWatchlist(seriesId) {
        await crunchyrollAPI.initialize();
        return await crunchyrollAPI.addToWatchlist(seriesId);
    },

    async removeFromWatchlist(seriesId) {
        await crunchyrollAPI.initialize();
        return await crunchyrollAPI.removeFromWatchlist(seriesId);
    },

    // Tests rapides
    async testAll() {
        console.log('🧪 === TEST COMPLET API ===\n');

        try {
            await crunchyrollAPI.initialize();

            console.log('1️⃣ Continue Watching...');
            const cw = await crunchyrollAPI.getContinueWatching(5);
            console.log('✅', cw);

            console.log('\n2️⃣ Watchlist...');
            const wl = await crunchyrollAPI.getWatchlist(5);
            console.log('✅', wl);

            console.log('\n3️⃣ Recommendations...');
            const reco = await crunchyrollAPI.getRecommendations();
            console.log('✅', reco);

            console.log('\n4️⃣ Search...');
            const search = await crunchyrollAPI.search('naruto', 3);
            console.log('✅', search);

            console.log('\n🎉 Tous les tests terminés !');
        } catch (error) {
            console.error('❌ Erreur:', error);
        }
    },

    // Helpers
    clearCache() {
        crunchyrollAPI.clearCache();
        console.log('🗑️ Cache vidé');
    },

    async checkToken() {
        // Demander au content script
        return new Promise((resolve) => {
            const timeout = setTimeout(() => resolve(null), 2000);

            const handler = (event) => {
                if (event.data.type === 'CRUNCHYROLL_CREDENTIALS_RESPONSE') {
                    clearTimeout(timeout);
                    window.removeEventListener('message', handler);
                    console.log('🔑 Token:', event.data.credentials.tokenData);
                    resolve(event.data.credentials.tokenData);
                }
            };

            window.addEventListener('message', handler);
            window.postMessage({
                type: 'REQUEST_CRUNCHYROLL_CREDENTIALS',
                source: 'crunchyroll-api'
            }, '*');
        });
    },

    help() {
        console.log(`
🚀 API Crunchyroll - Aide

📋 Fonctions disponibles:
  • crunchyAPI.continueWatching(limit)    - Historique (défaut: 10)
  • crunchyAPI.watchlist(getAllItems)     - Liste de suivi (défaut: tous)
  • crunchyAPI.recommendations()          - Recommandations
  • crunchyAPI.upNext(seriesId)           - Prochain épisode
  • crunchyAPI.search(query, limit)       - Recherche (défaut: 10)
  • crunchyAPI.series(seriesId)           - Détails d'une série
  • crunchyAPI.browse(options)            - Parcourir la base de données
  
🧪 Tests:
  • crunchyAPI.testAll()                  - Lance tous les tests
  • crunchyAPI.collectData()              - 📥 TÉLÉCHARGER TOUTES LES DONNÉES (Scraper)
  
🛠️ Utilitaires:
  • crunchyAPI.clearCache()               - Vider le cache
  • crunchyAPI.checkToken()               - Afficher le token
  • crunchyAPI.api                        - Accès direct à l'API
  
📖 Exemples:
  await crunchyAPI.continueWatching(5)
  await crunchyAPI.watchlist()
  await crunchyAPI.search('naruto')
  await crunchyAPI.browse({ type: 'series', limit: 20 })
  await crunchyAPI.testAll()
        `);
    }
};

// Exposer globalement
if (typeof window !== 'undefined') {
    window.crunchyAPI = apiHelpers;

    // Message de bienvenue
    console.log(`
%c🎯 BetterCrunchyroll API Ready! %c

Tapez %ccrunchyAPI.help()%c pour voir les commandes disponibles.

Exemples rapides:
  • await crunchyAPI.continueWatching()
  • await crunchyAPI.watchlist()
  • await crunchyAPI.testAll()
    `,
        'color: #ff6b00; font-size: 16px; font-weight: bold;',
        '',
        'color: #4ade80; font-weight: bold;',
        ''
    );
}

export default apiHelpers;

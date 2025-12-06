/**
 * Service pour interagir avec l'API Crunchyroll
 * Gère l'authentification, les requêtes et le cache
 */

const API_BASE = 'https://www.crunchyroll.com';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

class CrunchyrollAPI {
    constructor() {
        this.cache = new Map();
        this.authToken = null;
        this.profileId = null;
        this.accountId = null;
        this.locale = 'fr-FR';
        this.preferredAudioLanguage = 'fr-FR';
        this.tokenExpiresAt = null; // Timestamp d'expiration du token
    }

    /**
     * Vérifie si le token est expiré
     */
    isTokenExpired() {
        if (!this.tokenExpiresAt) return true;
        // Ajoute une marge de 60 secondes pour éviter les expirations en cours de requête
        return Date.now() >= (this.tokenExpiresAt - 60000);
    }

    /**
     * Demande les credentials au content script via postMessage
     */
    async fetchCredentialsFromContentScript() {
        return new Promise((resolve) => {
            // Timeout après 5 secondes
            const timeout = setTimeout(() => {
                console.warn('[CrunchyrollAPI] Timeout en attendant les credentials du content script');
                resolve(null);
            }, 5000);

            // Écouter la réponse
            const messageHandler = (event) => {
                if (event.data.type === 'CRUNCHYROLL_CREDENTIALS_RESPONSE') {
                    clearTimeout(timeout);
                    window.removeEventListener('message', messageHandler);
                    resolve(event.data.credentials);
                }
            };

            window.addEventListener('message', messageHandler);

            // Demander les credentials
            window.postMessage({
                type: 'REQUEST_CRUNCHYROLL_CREDENTIALS',
                source: 'crunchyroll-api'
            }, '*');
        });
    }

    /**
     * Initialise l'API avec les credentials depuis le content script
     */
    async initialize() {
        try {
            // Demander les credentials au content script
            console.log('[CrunchyrollAPI] Demande des credentials au content script...');
            const credentials = await this.fetchCredentialsFromContentScript();

            if (!credentials) {
                console.warn('[CrunchyrollAPI] Aucune credentials reçue du content script');
                return false;
            }

            const { tokenData, profileData } = credentials;

            // Extraire le token et accountId
            if (tokenData) {
                this.authToken = tokenData.access_token;
                this.accountId = tokenData.account_id;

                // Calculer le timestamp d'expiration
                if (tokenData.expires_in) {
                    this.tokenExpiresAt = Date.now() + (tokenData.expires_in * 1000);
                    // Standardiser pour sessionStorage
                    tokenData.timestamp = Date.now();
                    console.log('[CrunchyrollAPI] Token expire dans', tokenData.expires_in, 'secondes');
                }

                // IMPORTANT: Met à jour sessionStorage pour éviter les boucles de rafraîchissement
                try {
                    sessionStorage.setItem('crunchyroll_token', JSON.stringify(tokenData));
                } catch (e) {
                    console.warn('[CrunchyrollAPI] Erreur écriture sessionStorage (initialize)', e);
                }

                // Extraire la locale depuis le token (country)
                if (tokenData.country) {
                    const countryToLocale = {
                        'CA': 'fr-FR',
                        'US': 'en-US',
                        'FR': 'fr-FR',
                        'GB': 'en-GB',
                        'DE': 'de-DE',
                        'ES': 'es-ES',
                        'IT': 'it-IT',
                        'BR': 'pt-BR'
                    };
                    this.locale = countryToLocale[tokenData.country] || 'en-US';
                    this.preferredAudioLanguage = this.locale;
                }
            }

            // Récupérer le profileId depuis les données de profil
            if (profileData && profileData.profiles) {
                const selectedProfile = profileData.profiles.find(p => p.is_selected);
                if (selectedProfile) {
                    this.profileId = selectedProfile.profile_id;
                }
            }

            // Si on n'a pas de profileId, essayer de le récupérer depuis l'API
            if (!this.profileId && this.authToken) {
                console.log('📡 Récupération du profileId depuis l\'API...');
                await this.fetchAndStoreProfile();
            }

            console.log('🚀 CrunchyrollAPI initialisée', {
                hasToken: !!this.authToken,
                hasProfile: !!this.profileId,
                hasAccount: !!this.accountId,
                locale: this.locale,
                token: this.authToken ? `${this.authToken.substring(0, 20)}...` : 'N/A'
            });

            return !!this.authToken && !!this.profileId;
        } catch (error) {
            console.error('❌ Erreur initialisation API:', error);
            return false;
        }
    }

    /**
     * Récupère les informations de profil depuis l'API
     */
    async fetchAndStoreProfile() {
        try {
            const response = await fetch('https://www.crunchyroll.com/accounts/v1/me/multiprofile', {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const profileData = await response.json();

            // Trouver le profil sélectionné
            if (profileData.profiles) {
                const selectedProfile = profileData.profiles.find(p => p.is_selected);
                if (selectedProfile) {
                    this.profileId = selectedProfile.profile_id;

                    // Stocker dans sessionStorage (accessible depuis le contexte de la page)
                    sessionStorage.setItem('crunchyroll_profile', JSON.stringify(profileData));

                    // Essayer aussi dans chrome.storage si disponible (pour le content script)
                    if (typeof chrome !== 'undefined' && chrome.storage) {
                        try {
                            await chrome.storage.local.set({ crunchyroll_profile: profileData });
                        } catch (e) {
                            // chrome.storage non accessible depuis le contexte de la page, c'est normal
                        }
                    }

                    console.log('✅ ProfileId récupéré:', this.profileId);
                }
            }
        } catch (error) {
            console.error('❌ Erreur récupération profil:', error);
        }
    }

    /**
     * Effectue une requête GET vers l'API Crunchyroll
     */
    async get(endpoint, params = {}, useCache = true) {
        const cacheKey = `${endpoint}?${new URLSearchParams(params).toString()}`;

        // Vérifier le cache
        if (useCache && this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < CACHE_DURATION) {
                console.log('📦 Données depuis le cache:', cacheKey);
                return cached.data;
            }
        }

        // Check if we already have a valid in-memory token
        if (this.authToken && !this.isTokenExpired()) {
            // Already have a valid token, proceed
        } else {
            // Try to get from sessionStorage as backup or source of truth
            try {
                const sessionToken = sessionStorage.getItem('crunchyroll_token');
                if (sessionToken) {
                    const tokenData = JSON.parse(sessionToken);
                    const now = Math.floor(Date.now() / 1000);

                    // Check expiration: support both 'exp' (JWT) and 'expires_in' (OAuth)
                    let isExpired = true;

                    if (tokenData.exp) {
                        isExpired = now >= (tokenData.exp - 60);
                        // Update expiration derived from sessionStorage
                        if (!isExpired) this.tokenExpiresAt = tokenData.exp * 1000;
                    } else if (tokenData.expires_in && tokenData.timestamp) {
                        // timestamp should be in ms
                        const expirationTime = (tokenData.timestamp / 1000) + tokenData.expires_in;
                        isExpired = now >= (expirationTime - 60);
                        // Update expiration derived from sessionStorage
                        if (!isExpired) this.tokenExpiresAt = expirationTime * 1000;
                    } else if (tokenData.access_token) {
                        // We have a token but no expiration info? Assume valid for now if we just got it, 
                        // but risky. Let's assume valid to break loops if data is malformed but working.
                        isExpired = false;
                        console.warn('[CrunchyrollAPI] Token sans date d\'expiration, supposé valide.');
                    }

                    if (isExpired) {
                        console.warn('[CrunchyrollAPI] Token expiré (sessionStorage), rafraîchissement...', tokenData);
                        const refreshed = await this.initialize();
                        if (!refreshed) {
                            throw new Error('Impossible de rafraîchir le token');
                        }
                    } else {
                        // Valid session token, sync to memory
                        this.authToken = tokenData.access_token;
                        if (tokenData.account_id) this.accountId = tokenData.account_id;
                    }
                } else {
                    // No session token, initialize
                    console.warn('[CrunchyrollAPI] Pas de token en sessionStorage, rafraîchissement...');
                    const refreshed = await this.initialize();
                    if (!refreshed) {
                        throw new Error('Impossible de récupérer le token');
                    }
                }
            } catch (sessionError) {
                console.warn('[CrunchyrollAPI] Erreur sessionStorage, fallback...', sessionError);
                if (this.isTokenExpired()) {
                    const refreshed = await this.initialize();
                    if (!refreshed) throw new Error('Impossible de rafraîchir le token (fallback)');
                }
            }
        }

        try {
            // Construire l'URL avec les paramètres
            const url = new URL(`${API_BASE}${endpoint}`);
            Object.entries(params).forEach(([key, value]) => {
                url.searchParams.append(key, value);
            });

            // Ajouter les paramètres de langue par défaut
            if (!params.locale) {
                url.searchParams.append('locale', this.locale);
            }
            if (!params.preferred_audio_language && endpoint.includes('discover')) {
                url.searchParams.append('preferred_audio_language', this.preferredAudioLanguage);
            }

            console.log('🌐 Requête API:', url.toString());

            // Effectuer la requête
            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
                    'Authorization': this.authToken ? `Bearer ${this.authToken}` : '',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
                    'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
                    'sec-ch-ua-mobile': '?0',
                    'sec-ch-ua-platform': '"Windows"',
                    'sec-fetch-dest': 'empty',
                    'sec-fetch-mode': 'cors',
                    'sec-fetch-site': 'same-origin'
                },
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            // Mettre en cache
            if (useCache) {
                this.cache.set(cacheKey, {
                    data,
                    timestamp: Date.now()
                });
            }

            console.log('✅ Données reçues:', data);
            return data;

        } catch (error) {
            console.error('❌ Erreur requête API:', error);
            throw error;
        }
    }

    /**
     * Récupère le prochain épisode à regarder pour un anime
     */
    async getUpNext(seriesId) {
        const response = await this.get(`/content/v2/discover/up_next/${seriesId}`);
        return response?.data?.[0] || null;
    }

    /**
     * Récupère l'historique de visionnage (Continue Watching)
     */
    async getContinueWatching(limit = 20) {
        if (!this.profileId) {
            console.warn('⚠️ ProfileId manquant, impossible de récupérer l\'historique');
            return null;
        }

        const response = await this.get(`/content/v2/discover/${this.profileId}/history`, { n: limit });
        return response?.data || [];
    }

    /**
     * Récupère la watchlist
     */
    async getWatchlist(limit = 20, start = 0) {
        // Utiliser accountId selon la doc API
        const id = this.accountId || this.profileId;
        if (!id) {
            console.warn('⚠️ AccountId/ProfileId manquant, impossible de récupérer la watchlist');
            return null;
        }

        const params = { n: limit };
        if (start > 0) {
            params.start = start;
        }

        const response = await this.get(`/content/v2/discover/${id}/watchlist`, params);

        // Return structured object with total for pagination
        return {
            data: response?.data || [],
            total: response?.total || 0,
            meta: response?.meta || {}
        };
    }

    /**
     * Vérifie si une série est dans la watchlist
     */
    async isInWatchlist(seriesId) {
        const id = this.accountId || this.profileId;
        if (!id) {
            console.warn('⚠️ AccountId/ProfileId manquant, impossible de vérifier la watchlist');
            return false;
        }

        try {
            // L'API ne semble pas supporter correctement le filtrage par content_ids sur cet endpoint du moins pas comme documenté ou attendu par l'app.
            // On va récupérer la watchlist (les 100 derniers items par exemple) et vérifier manuellement
            // C'est moins efficace mais plus sûr si le filtre serveur ne marche pas
            const response = await this.get(`/content/v2/discover/${id}/watchlist`, {
                n: 100, // On espère que la série est dans les 100 derniers ajoutés/modifiés
                sort_by: 'date_added',
                order: 'desc'
            }, false); // <--- SKIP CACHE

            if (response?.data && response.data.length > 0) {
                return response.data.some(item =>
                    item.id === seriesId ||
                    item.panel?.episode_metadata?.series_id === seriesId ||
                    item.content_id === seriesId ||
                    (item.panel && item.panel.id === seriesId)
                );
            }
            return false;
        } catch (error) {
            console.error('❌ Erreur vérification watchlist:', error);
            return false;
        }
    }

    /**
     * Ajoute une série à la watchlist
     */
    async addToWatchlist(seriesId) {
        const id = this.accountId || this.profileId;
        if (!id) {
            console.warn('⚠️ AccountId/ProfileId manquant, impossible d\'ajouter à la watchlist');
            return { success: false, error: 'AccountId manquant' };
        }

        try {
            console.log('➕ Ajout à la watchlist:', seriesId, 'pour account:', id);

            // POST /content/v2/${account_uuid}/watchlist
            const url = `${API_BASE}/content/v2/${id}/watchlist`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': this.authToken ? `Bearer ${this.authToken}` : '',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    content_id: seriesId
                }),
                credentials: 'include'
            });

            if (!response.ok) {
                // Si l'erreur est 409 Conflict, cela signifie que l'élément est déjà dans la watchlist
                // C'est un succès du point de vue de l'interface
                if (response.status === 409) {
                    console.log('✅ Série déjà dans la watchlist (409 Conflict géré)');
                    // Invalider le cache de la watchlist pour être sûr
                    this.clearCacheByPrefix(`/content/v2/discover/${id}/watchlist`);
                    this.clearCacheByPrefix(`/content/v2/discover/`);
                    return { success: true, alreadyInHash: true };
                }

                const errorText = await response.text();
                console.error('❌ Response error:', errorText);
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            // Le POST peut retourner 200 OK sans body JSON
            let data = null;
            try {
                data = await response.json();
            } catch (e) {
                // Pas de JSON dans la réponse, c'est OK
            }

            console.log('✅ Série ajoutée à la watchlist:', data || 'success');

            // Invalider le cache de la watchlist
            this.clearCacheByPrefix(`/content/v2/discover/${id}/watchlist`);
            this.clearCacheByPrefix(`/content/v2/discover/`);

            return { success: true, data };
        } catch (error) {
            console.error('❌ Erreur ajout watchlist:', error);
            // Si c'est un conflit mais passé dans le catch (selon l'implémentation fetch/navigateur)
            if (error.message.includes('409')) {
                return { success: true, alreadyInHash: true };
            }
            return { success: false, error: error.message };
        }
    }

    /**
     * Retire une série de la watchlist
     */
    async removeFromWatchlist(seriesId) {
        const id = this.accountId || this.profileId;
        if (!id) {
            console.warn('⚠️ AccountId/ProfileId manquant, impossible de retirer de la watchlist');
            return { success: false, error: 'AccountId manquant' };
        }

        try {
            console.log('➖ Retrait de la watchlist:', seriesId, 'pour account:', id);

            // Selon la doc: DELETE /content/v2/${account_uuid}/watchlist/${content_id}
            const url = `${API_BASE}/content/v2/${id}/watchlist/${seriesId}`;
            const response = await fetch(url, {
                method: 'DELETE',
                headers: {
                    'Authorization': this.authToken ? `Bearer ${this.authToken}` : '',
                    'Accept': 'application/json'
                },
                credentials: 'include'
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Response error:', errorText);
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            console.log('✅ Série retirée de la watchlist');

            // Invalider le cache de la watchlist
            this.clearCacheByPrefix(`/content/v2/discover/${id}/watchlist`);
            this.clearCacheByPrefix(`/content/v2/discover/`);

            return { success: true };
        } catch (error) {
            console.error('❌ Erreur retrait watchlist:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Récupère les recommandations personnalisées
     */
    async getRecommendations(collectionId = 'Curation_Collections/Dynamic/Top_10_CA') {
        if (!this.profileId) {
            console.warn('⚠️ ProfileId manquant, impossible de récupérer les recommandations');
            return null;
        }

        const params = {
            collectionId,
            vendor: 'thinkanalytics',
            profileId: this.profileId,
            cacheKey: Math.floor(Date.now() / 1000), // timestamp pour éviter le cache
            ratings: 'true'
        };

        const response = await this.get('/personalization/v2/personalization', params);
        return response?.recommendations || [];
    }

    /**
     * Récupère les informations détaillées d'une série
     */
    async getSeries(seriesId) {
        const response = await this.get(`/content/v2/cms/series/${seriesId}`);
        // Endpoint returns { total: 1, data: [ { ... } ] }
        return response?.data?.[0] || null;
    }

    /**
     * Récupère les saisons d'une série
     */
    async getSeasons(seriesId) {
        const response = await this.get(`/content/v2/cms/series/${seriesId}/seasons`);
        return response?.data || [];
    }

    /**
     * Récupère les épisodes d'une saison
     */
    async getEpisodes(seasonId) {
        const response = await this.get(`/content/v2/cms/seasons/${seasonId}/episodes`);
        return response?.data || [];
    }

    /**
     * Recherche d'animes
     */
    async search(query, limit = 20) {
        const params = {
            q: query,
            n: limit,
            type: 'series,movie_listing'
        };

        const response = await this.get('/content/v2/discover/search', params);
        return {
            data: response?.data || [],
            total: response?.total || 0,
            meta: response?.meta || {}
        };
    }

    /**
     * Parcourir la base de données Crunchyroll avec des filtres
     * @param {Object} options - Options de filtrage
     * @param {number} options.limit - Nombre d'items à retourner (défaut: 20)
     * @param {number} options.start - Position de départ (pagination)
     * @param {string} options.type - Type: 'series', 'episode', 'movie_listing'
     * @param {string[]} options.categories - Catégories à filtrer
     * @param {string} options.seasonal_tag - Tag saisonnier (ex: 'winter-2024')
     * @param {boolean} options.is_dubbed - Filtrer les doublés
     * @param {boolean} options.is_subbed - Filtrer les sous-titrés
     * @param {string} options.q - Requête de recherche
     */
    /**
     * Parcourir la base de données Crunchyroll avec des filtres
     * @param {Object} options - Options de filtrage
     */
    async browse(options = {}) {
        const params = {
            n: options.limit || 20,
            type: options.type || 'series'
        };

        if (options.start !== undefined) params.start = options.start;
        if (options.categories) params.categories = options.categories.join(',');
        if (options.seasonal_tag) params.seasonal_tag = options.seasonal_tag;
        if (options.is_dubbed !== undefined) params.is_dubbed = options.is_dubbed;
        if (options.is_subbed !== undefined) params.is_subbed = options.is_subbed;
        if (options.q) params.q = options.q;
        // Tri spécifique
        if (options.sort_by) params.sort_by = options.sort_by;

        // Ajouter locale et ratings
        params.locale = this.locale;
        params.preferred_audio_language = this.preferredAudioLanguage;
        // Demander explicitement les notes pour pouvoir trier
        params.ratings = 'true';

        const response = await this.get('/content/v2/discover/browse', params);
        return {
            data: response?.data || [],
            total: response?.total || 0,
            meta: response?.meta || {}
        };
    }

    /**
     * Récupère la note de l'utilisateur pour un contenu
     * @param {string} contentId - ID du contenu
     * @param {string} contentType - Type (series, episode, etc.)
     */
    async getUserRating(contentId, contentType = 'series') {
        const id = this.accountId;
        if (!id) return null;

        try {
            // GET /content-reviews/v3/user/${account_uuid}/rating/${contentType}/${content_id}
            const response = await this.get(`/content-reviews/v3/user/${id}/rating/${contentType}/${contentId}`, {}, false);
            // false pour ne pas utiliser le cache car cela peut changer vite
            return response;
        } catch (error) {
            // Si 404, pas de note
            return null;
        }
    }

    /**
     * Met à jour la note de l'utilisateur
     * @param {string} contentId - ID du contenu
     * @param {string} rating - "5s", "4s", ... ou "up"/"down"
     * @param {string} contentType - Type (series, episode, etc.)
     */
    async updateUserRating(contentId, rating, contentType = 'series') {
        const id = this.accountId;
        if (!id || !this.authToken) return { success: false, error: 'Auth missing' };

        try {
            const url = `${API_BASE}/content-reviews/v3/user/${id}/rating/${contentType}/${contentId}`;
            console.log('⭐ Updating rating:', url, rating);

            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authToken}`,
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ rating }),
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            // Invalider le cache de la série pour refléter la nouvelle note si nécessaire
            // (Bien que la note globale ne change pas immédiatement, la note utilisateur oui)
            return { success: true };
        } catch (error) {
            console.error('❌ Erreur mise à jour note:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Vide le cache
     */
    clearCache() {
        this.cache.clear();
        console.log('🗑️ Cache vidé');
    }

    /**
     * Vide le cache pour toutes les clés commençant par un préfixe
     */
    clearCacheByPrefix(prefix) {
        const keysToDelete = [];
        for (const key of this.cache.keys()) {
            if (key.startsWith(prefix)) {
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach(key => this.cache.delete(key));
        console.log(`🗑️ Cache vidé pour le préfixe: ${prefix} (${keysToDelete.length} entrées)`);
    }

    /**
     * Change la langue
     */
    async setLocale(locale) {
        this.locale = locale;
        this.preferredAudioLanguage = locale;

        // Stocker dans sessionStorage
        sessionStorage.setItem('locale', locale);

        // Essayer chrome.storage si disponible
        if (typeof chrome !== 'undefined' && chrome.storage) {
            try {
                await chrome.storage.local.set({ locale });
            } catch (e) {
                // chrome.storage non accessible, c'est normal
            }
        }

        this.clearCache();
        console.log('🌍 Langue changée:', locale);
    }
    /**
     * Récupère le flux vidéo pour un épisode
     */
    async getPlayStream(contentId) {
        // Base URL spécifique pour le service de lecture
        const PLAY_API_BASE = 'https://cr-play-service.prd.crunchyrollsvc.com';
        const url = `${PLAY_API_BASE}/v1/${contentId}/web/chrome/play`;

        console.log('🎬 Récupération du flux vidéo:', url);

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': this.authToken ? `Bearer ${this.authToken}` : '',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'x-cr-stream-limits': 'false'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('✅ Flux vidéo reçu:', data);
            return data;
        } catch (error) {
            console.error('❌ Erreur récupération flux vidéo:', error);
            throw error;
        }
    }

    /**
     * Récupère la progression de lecture (playheads) pour une liste d'IDs
     */
    async getPlayheads(contentIds) {
        const id = this.accountId || this.profileId;
        if (!id || !contentIds || contentIds.length === 0) return {};

        try {
            // content_ids doit être une string séparée par des virgules
            const idsList = Array.isArray(contentIds) ? contentIds.join(',') : contentIds;

            // L'endpoint est /content/v2/{account_id}/playheads
            const response = await this.get(`/content/v2/${id}/playheads`, {
                content_ids: idsList
            });

            // Réponse format: { data: [{ content_id: "...", playhead: 60, fully_watched: false, ... }], ... }
            if (response && response.data) {
                // Convertir en map pour accès facile: { contentId: { playhead, fully_watched } }
                return response.data.reduce((acc, item) => {
                    acc[item.content_id] = {
                        playhead: item.playhead,
                        fully_watched: item.fully_watched,
                        last_modified: item.last_modified
                    };
                    return acc;
                }, {});
            }
            return {};
        } catch (error) {
            console.error('[CrunchyrollAPI] Erreur récupération playheads:', error);
            return {};
        }
    }
}

// Instance singleton
const crunchyrollAPI = new CrunchyrollAPI();

export default crunchyrollAPI;

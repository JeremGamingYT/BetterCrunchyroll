/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Crunchyroll API client rebuilt from the documented endpoints.
 * Handles auth bootstrap from the page/extension, typed helpers, caching and common endpoints.
 */

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface CachedEntry<T> {
    data: T;
    expiresAt: number;
}

interface RequestOptions {
    params?: Record<string, any>;
    body?: any;
    useCache?: boolean;
    cacheTtlMs?: number;
    includeLocale?: boolean;
    skipAuth?: boolean;
    headers?: Record<string, string>;
    baseUrl?: string;
}

interface ApiListResponse<T> {
    total?: number;
    data?: T[];
    meta?: Record<string, any>;
}

interface BrowseOptions {
    limit?: number;
    start?: number;
    categories?: string[];
    type?: string;
    q?: string;
    seasonal_tag?: string;
    seasonalTag?: string;
    is_dubbed?: boolean;
    isDubbed?: boolean;
    is_subbed?: boolean;
    isSubbed?: boolean;
    sort_by?: string;
    sortBy?: string;
    order?: string;
    includeRatings?: boolean;
    useCache?: boolean;
}

interface WatchlistOptions {
    order?: string;
    type?: string;
    sort_by?: string;
    sortBy?: string;
    is_favorite?: boolean;
    is_dubbed?: boolean;
    is_subbed?: boolean;
    useCache?: boolean;
}

interface RecommendationResponse<T = any> {
    recommendations: T[];
}

interface SeriesWithSeasons {
    series: any;
    seasons: any[];
    isInWatchlist: boolean;
}

const API_BASE = 'https://www.crunchyroll.com';
const PLAY_API_BASE = 'https://cr-play-service.prd.crunchyrollsvc.com';
const DEFAULT_CACHE_MS = 5 * 60 * 1000;

class CrunchyrollAPI {
    private cache = new Map<string, CachedEntry<any>>();
    authToken: string | null = null;
    profileId: string | null = null;
    accountId: string | null = null;
    locale = 'en-US';
    preferredAudioLanguage = 'en-US';
    private tokenExpiresAt: number | null = null;
    private initializePromise: Promise<boolean> | null = null;

    private storageKeys = {
        token: 'crunchyroll_token',
        profile: 'crunchyroll_profile',
        locale: 'crunchyroll_locale'
    };

    /** Simple logger to keep noisy console output tidy. */
    private log(level: 'info' | 'warn' | 'error', ...args: any[]) {
        const tag = '[CrunchyrollAPI]';
        if (level === 'info') console.log(tag, ...args);
        if (level === 'warn') console.warn(tag, ...args);
        if (level === 'error') console.error(tag, ...args);
    }

    private countryToLocale(country?: string | null) {
        const map: Record<string, string> = {
            CA: 'fr-FR',
            US: 'en-US',
            FR: 'fr-FR',
            GB: 'en-GB',
            DE: 'de-DE',
            ES: 'es-ES',
            IT: 'it-IT',
            BR: 'pt-BR'
        };
        return country ? (map[country] || 'en-US') : 'en-US';
    }

    /**
     * Persist data in sessionStorage and chrome.storage (when available).
     */
    private async persist(key: keyof CrunchyrollAPI['storageKeys'], value: any) {
        try {
            if (typeof sessionStorage !== 'undefined') {
                sessionStorage.setItem(this.storageKeys[key], JSON.stringify(value));
            }
        } catch (e) {
            this.log('warn', 'Unable to persist in sessionStorage', e);
        }

        if (typeof chrome !== 'undefined' && chrome.storage?.local) {
            try {
                await chrome.storage.local.set({ [this.storageKeys[key]]: value });
            } catch (e) {
                this.log('warn', 'Unable to persist in chrome.storage', e);
            }
        }
    }

    /**
     * Apply token data from storage or interceptor payload.
     */
    private applyTokenData(tokenData: any) {
        if (!tokenData) return;

        this.authToken = tokenData.access_token || tokenData.token || this.authToken;
        this.accountId = tokenData.account_id || tokenData.account_uuid || this.accountId;

        if (tokenData.expires_in) {
            const ts = tokenData.timestamp || Date.now();
            this.tokenExpiresAt = ts + Number(tokenData.expires_in) * 1000;
            tokenData.timestamp = ts;
        } else if (tokenData.exp) {
            this.tokenExpiresAt = Number(tokenData.exp) * 1000;
        }

        if (tokenData.country) {
            const locale = this.countryToLocale(tokenData.country);
            this.locale = locale;
            this.preferredAudioLanguage = locale;
            this.persist('locale', locale);
        }

        this.persist('token', tokenData);
    }

    /**
     * Apply profile data and remember the selected profile.
     */
    private applyProfileData(profileData: any) {
        if (profileData?.account_id) {
            this.accountId = profileData.account_id;
        }

        if (profileData?.profiles?.length) {
            const selected = profileData.profiles.find((p: any) => p.is_selected) || profileData.profiles[0];
            if (selected?.profile_id || selected?.id) {
                this.profileId = selected.profile_id || selected.id;
            }
        }

        this.persist('profile', profileData);
    }

    /**
     * Load persisted token/profile/locale from sessionStorage and chrome.storage.
     */
    private async loadPersistedCredentials() {
        // Session storage first for speed
        try {
            const tokenRaw = sessionStorage.getItem(this.storageKeys.token);
            const profileRaw = sessionStorage.getItem(this.storageKeys.profile);
            const localeRaw = sessionStorage.getItem(this.storageKeys.locale);

            if (tokenRaw) this.applyTokenData(JSON.parse(tokenRaw));
            if (profileRaw) this.applyProfileData(JSON.parse(profileRaw));
            if (localeRaw) {
                this.locale = JSON.parse(localeRaw);
                this.preferredAudioLanguage = this.locale;
            }
        } catch (e) {
            this.log('warn', 'Failed to read sessionStorage', e);
        }

        // chrome.storage as fallback
        if (typeof chrome !== 'undefined' && chrome.storage?.local) {
            try {
                const stored = await chrome.storage.local.get([
                    this.storageKeys.token,
                    this.storageKeys.profile,
                    this.storageKeys.locale
                ]);
                if (stored?.[this.storageKeys.token]) this.applyTokenData(stored[this.storageKeys.token]);
                if (stored?.[this.storageKeys.profile]) this.applyProfileData(stored[this.storageKeys.profile]);
                if (stored?.[this.storageKeys.locale]) {
                    this.locale = stored[this.storageKeys.locale];
                    this.preferredAudioLanguage = this.locale;
                }
            } catch (e) {
                this.log('warn', 'Failed to read chrome.storage', e);
            }
        }
    }

    /**
     * Ask the injected content script for fresh credentials.
     */
    private async fetchCredentialsFromContentScript(retries = 2): Promise<{ tokenData?: any; profileData?: any } | null> {
        for (let attempt = 0; attempt <= retries; attempt++) {
            const payload = await new Promise<{ tokenData?: any; profileData?: any } | null>((resolve) => {
                const timeout = setTimeout(() => resolve(null), 5000);

                const handler = (event: MessageEvent) => {
                    if (event.data?.type === 'CRUNCHYROLL_CREDENTIALS_RESPONSE') {
                        clearTimeout(timeout);
                        window.removeEventListener('message', handler);
                        resolve(event.data.credentials);
                    }
                };

                window.addEventListener('message', handler);
                window.postMessage({ type: 'REQUEST_CRUNCHYROLL_CREDENTIALS', source: 'crunchyroll-api' }, '*');
            });

            if (payload) return payload;
            if (attempt < retries) {
                await new Promise(res => setTimeout(res, 300 * (attempt + 1)));
            }
        }

        return null;
    }

    /**
     * Fetch the selected profile from the API when it is missing.
     */
    private async fetchAndStoreProfile() {
        if (!this.authToken) return null;

        const response = await fetch(`${API_BASE}/accounts/v1/me/multiprofile`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${this.authToken}`,
                Accept: 'application/json'
            },
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch profile (HTTP ${response.status})`);
        }

        const data = await response.json();
        this.applyProfileData(data);
        return data;
    }

    private isTokenExpired() {
        if (!this.tokenExpiresAt) return true;
        return Date.now() >= this.tokenExpiresAt - 60000; // 60s safety window
    }

    /**
     * Initialize by loading cached credentials or requesting them from the page.
     */
    async initialize(force = false): Promise<boolean> {
        if (!force && this.authToken && !this.isTokenExpired() && this.profileId) {
            return true;
        }

        if (this.initializePromise && !force) {
            return this.initializePromise;
        }

        this.initializePromise = (async () => {
            await this.loadPersistedCredentials();

            if (!this.authToken || this.isTokenExpired()) {
                const credentials = await this.fetchCredentialsFromContentScript();
                if (credentials?.tokenData) this.applyTokenData(credentials.tokenData);
                if (credentials?.profileData) this.applyProfileData(credentials.profileData);
            }

            if (!this.profileId && this.authToken) {
                try {
                    await this.fetchAndStoreProfile();
                } catch (e) {
                    this.log('warn', 'Profile fetch failed', e);
                }
            }

            const ready = !!this.authToken && !!this.profileId;
            this.initializePromise = null;
            return ready;
        })();

        return this.initializePromise;
    }

    private async ensureReady(force = false) {
        const ready = await this.initialize(force);
        if (!ready) {
            throw new Error('Crunchyroll credentials are missing');
        }
    }

    private buildUrl(path: string, params: Record<string, any> = {}, includeLocale = true, baseUrl = API_BASE) {
        const url = new URL(path.startsWith('http') ? path : `${baseUrl}${path}`);

        Object.entries(params).forEach(([key, value]) => {
            if (value === undefined || value === null) return;
            const encoded = Array.isArray(value) ? value.join(',') : value;
            url.searchParams.append(key, String(encoded));
        });

        if (includeLocale) {
            if (!url.searchParams.has('locale')) {
                url.searchParams.append('locale', this.locale);
            }
            if (!url.searchParams.has('preferred_audio_language')) {
                url.searchParams.append('preferred_audio_language', this.preferredAudioLanguage);
            }
        }

        return url.toString();
    }

    /**
     * Core HTTP request helper with optional caching.
     */
    private async request<T>(method: HttpMethod, path: string, options: RequestOptions = {}): Promise<T> {
        if (!options.skipAuth) {
            await this.ensureReady();
        }

        const url = this.buildUrl(
            path,
            options.params || {},
            options.includeLocale ?? true,
            options.baseUrl || API_BASE
        );

        const useCache = method === 'GET' && (options.useCache ?? true);
        const cacheKey = `${method}:${url}`;
        if (useCache && this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey)!;
            if (cached.expiresAt > Date.now()) {
                return cached.data as T;
            }
            this.cache.delete(cacheKey);
        }

        const headers: Record<string, string> = {
            Accept: 'application/json, text/plain, */*',
            ...options.headers
        };

        if (this.authToken && !options.skipAuth) {
            headers.Authorization = `Bearer ${this.authToken}`;
        }

        const fetchInit: RequestInit = {
            method,
            headers,
            credentials: 'include'
        };

        if (method !== 'GET' && method !== 'DELETE' && options.body !== undefined) {
            fetchInit.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
            headers['Content-Type'] = headers['Content-Type'] || 'application/json';
        }

        const response = await fetch(url, fetchInit);

        if (!response.ok) {
            // Clear invalid token on auth errors so next call can re-initialize cleanly.
            if (response.status === 401 || response.status === 403) {
                this.authToken = null;
                this.tokenExpiresAt = null;
            }
            const text = await response.text();
            throw new Error(`HTTP ${response.status}: ${text || response.statusText}`);
        }

        const data = await response.json().catch(() => null);

        if (useCache) {
            this.cache.set(cacheKey, {
                data,
                expiresAt: Date.now() + (options.cacheTtlMs || DEFAULT_CACHE_MS)
            });
        }

        return data as T;
    }

    clearCache() {
        this.cache.clear();
        this.log('info', 'Cache cleared');
    }

    clearCacheByPrefix(prefix: string) {
        for (const key of Array.from(this.cache.keys())) {
            if (key.includes(prefix)) {
                this.cache.delete(key);
            }
        }
    }

    async setLocale(locale: string) {
        this.locale = locale;
        this.preferredAudioLanguage = locale;
        await this.persist('locale', locale);
        this.clearCache();
    }

    // ---------------------------------------------------------------------
    // Documented endpoints
    // ---------------------------------------------------------------------

    /**
     * Generic GET helper for debugging arbitrary endpoints.
     */
    async fetchEndpoint(path: string, params?: Record<string, any>, useCache = false) {
        return this.request<any>('GET', path, { params, useCache });
    }

    async browse(options: BrowseOptions = {}) {
        const params: Record<string, any> = {
            n: options.limit || 20,
            start: options.start,
            categories: options.categories?.join(','),
            type: options.type || 'series',
            q: options.q,
            seasonal_tag: options.seasonalTag || options.seasonal_tag,
            is_dubbed: options.isDubbed ?? options.is_dubbed,
            is_subbed: options.isSubbed ?? options.is_subbed,
            sort_by: options.sortBy || options.sort_by,
            order: options.order
        };

        if (options.includeRatings !== false) {
            params.ratings = 'true';
        }

        const response = await this.request<ApiListResponse<any>>('GET', '/content/v2/discover/browse', {
            params,
            useCache: options.useCache
        });

        return {
            data: response?.data || [],
            total: response?.total || 0,
            meta: response?.meta || {}
        };
    }

    async search(query: string, limit = 20, start = 0, type = 'series,movie_listing') {
        const params = { q: query, n: limit, start, type };
        const response = await this.request<ApiListResponse<any>>('GET', '/content/v2/discover/search', { params });
        return {
            data: response?.data || [],
            total: response?.total || 0,
            meta: response?.meta || {}
        };
    }

    async getUpNext(contentId: string) {
        const response = await this.request<ApiListResponse<any>>('GET', `/content/v2/discover/up_next/${contentId}`);
        return response?.data?.[0] || null;
    }

    async getWatchHistory(pageSize = 20, page = 1) {
        const account = this.accountId || this.profileId;
        if (!account) throw new Error('Missing account id for watch history');
        const response = await this.request<ApiListResponse<any>>('GET', `/content/v2/${account}/watch-history`, {
            params: { page_size: pageSize, page },
            useCache: false
        });
        return response?.data || [];
    }

    async getContinueWatching(limit = 20) {
        try {
            const history = await this.getWatchHistory(limit, 1);
            if (history.length > 0) return history;
        } catch (e) {
            this.log('warn', 'watch-history endpoint failed, falling back', e);
        }

        // Fallback to legacy discover history endpoint
        const account = this.accountId || this.profileId;
        if (!account) return [];
        const fallback = await this.request<ApiListResponse<any>>('GET', `/content/v2/discover/${account}/history`, {
            params: { n: limit },
            useCache: false
        });
        return fallback?.data || [];
    }

    async getWatchlist(limit = 20, start = 0, options: WatchlistOptions = {}) {
        const account = this.accountId || this.profileId;
        if (!account) throw new Error('Missing account id for watchlist');

        const params: Record<string, any> = {
            n: limit,
            start,
            order: options.order,
            type: options.type,
            sort_by: options.sortBy || options.sort_by,
            is_favorite: options.is_favorite,
            is_dubbed: options.is_dubbed,
            is_subbed: options.is_subbed
        };

        const response = await this.request<ApiListResponse<any>>('GET', `/content/v2/discover/${account}/watchlist`, {
            params,
            useCache: options.useCache
        });

        return {
            data: response?.data || [],
            total: response?.total || 0,
            meta: response?.meta || {}
        };
    }

    async isInWatchlist(seriesId: string) {
        const list = await this.getWatchlist(100, 0, {
            sort_by: 'date_updated',
            order: 'desc',
            useCache: false
        });

        return list.data.some((item: any) =>
            item.id === seriesId ||
            item.content_id === seriesId ||
            item.panel?.episode_metadata?.series_id === seriesId ||
            item.panel?.id === seriesId
        );
    }

    async addToWatchlist(seriesId: string) {
        const account = this.accountId || this.profileId;
        if (!account) return { success: false, error: 'Missing account id' };

        try {
            await this.ensureReady();
            await this.request('POST', `/content/v2/${account}/watchlist`, {
                body: { content_id: seriesId },
                useCache: false
            });
            this.clearCacheByPrefix(`/content/v2/discover/${account}/watchlist`);
            this.clearCacheByPrefix(`/content/v2/${account}/watchlist`);
            return { success: true };
        } catch (e: any) {
            if (String(e?.message || '').includes('409')) {
                return { success: true, alreadyInHash: true };
            }
            return { success: false, error: e?.message || 'Failed to add to watchlist' };
        }
    }

    async removeFromWatchlist(seriesId: string) {
        const account = this.accountId || this.profileId;
        if (!account) return { success: false, error: 'Missing account id' };

        try {
            await this.ensureReady();
            await this.request('DELETE', `/content/v2/${account}/watchlist/${seriesId}`, { useCache: false });
            this.clearCacheByPrefix(`/content/v2/discover/${account}/watchlist`);
            this.clearCacheByPrefix(`/content/v2/${account}/watchlist`);
            return { success: true };
        } catch (e: any) {
            return { success: false, error: e?.message || 'Failed to remove from watchlist' };
        }
    }

    async getSeries(seriesId: string) {
        const response = await this.request<ApiListResponse<any>>('GET', `/content/v2/cms/series/${seriesId}/`);
        return response?.data?.[0] || null;
    }

    async getSeasons(seriesId: string) {
        const response = await this.request<ApiListResponse<any>>('GET', `/content/v2/cms/series/${seriesId}/seasons`);
        return response?.data || [];
    }

    async getSeason(seasonId: string) {
        const response = await this.request<ApiListResponse<any>>('GET', `/content/v2/cms/seasons/${seasonId}/`);
        return response?.data?.[0] || null;
    }

    async getSeasonEpisodes(seasonId: string) {
        const response = await this.request<ApiListResponse<any>>('GET', `/content/v2/cms/seasons/${seasonId}/episodes`);
        return response?.data || [];
    }

    // Backwards compatibility alias
    async getEpisodes(seasonId: string) {
        return this.getSeasonEpisodes(seasonId);
    }

    async getEpisode(episodeId: string) {
        const response = await this.request<ApiListResponse<any>>('GET', `/content/v2/cms/episodes/${episodeId}`);
        return response?.data?.[0] || null;
    }

    async getObjects(contentIds: string | string[], fields?: string[]) {
        const account = this.accountId || this.profileId;
        if (!account) throw new Error('Missing account id for objects');
        const ids = Array.isArray(contentIds) ? contentIds.join(',') : contentIds;
        const params: Record<string, any> = {};
        if (fields?.length) params.fields = fields.join(',');

        const response = await this.request<ApiListResponse<any>>(
            'GET',
            `/content/v2/cms/${account}/objects/${ids}`,
            { params }
        );
        return response?.data || [];
    }

    async getPlayheads(contentIds: string[] | string) {
        const account = this.accountId || this.profileId;
        if (!account) return {};

        const ids = Array.isArray(contentIds) ? contentIds.join(',') : contentIds;
        const response = await this.request<ApiListResponse<any>>('GET', `/content/v2/${account}/playheads`, {
            params: { content_ids: ids }
        });

        if (!response?.data) return {};
        return response.data.reduce((acc: any, item: any) => {
            acc[item.content_id] = {
                playhead: item.playhead,
                fully_watched: item.fully_watched,
                last_modified: item.last_modified
            };
            return acc;
        }, {});
    }

    async getHomeFeed(limit = 30, start = 0) {
        const account = this.accountId || this.profileId;
        if (!account) throw new Error('Missing account id for home feed');
        return this.request<ApiListResponse<any>>('GET', `/content/v2/discover/${account}/home_feed`, {
            params: { n: limit, start },
            useCache: false
        });
    }

    async getRecommendations(seedContentId?: string): Promise<RecommendationResponse> {
        // Direct recommendation endpoint (documented)
        if (seedContentId) {
            const response = await this.request<any>('GET', `/recommendations/v1/next/android/${seedContentId}`, {
                useCache: false
            });
            const recs = response?.recommendations || response?.data || response?.items || [];
            return { recommendations: recs };
        }

        // Try home_feed lane first
        const account = this.accountId || this.profileId;
        if (account) {
            try {
                const feed = await this.getHomeFeed(50, 0);
                const lanes = Array.isArray(feed?.data) ? feed.data : [];
                const recLane = lanes.find((lane: any) =>
                    lane.resource_id === 'recommendations' ||
                    lane.title?.toLowerCase?.().includes('recommend') ||
                    lane.panel?.type === 'recommendations'
                );
                const items = recLane?.items || recLane?.data || recLane?.panel?.items;
                if (items && Array.isArray(items)) {
                    return { recommendations: items };
                }
            } catch (e) {
                this.log('warn', 'Home feed recommendations failed', e);
            }
        }

        // Fallback to a high-rated browse list
        const fallback = await this.browse({ type: 'series', limit: 30, sort_by: 'popularity', includeRatings: true });
        return { recommendations: fallback.data };
    }

    async getUserRating(contentId: string, contentType = 'series') {
        const account = this.accountId;
        if (!account) return null;
        try {
            return await this.request<any>('GET', `/content-reviews/v3/user/${account}/rating/${contentType}/${contentId}`, {
                useCache: false
            });
        } catch {
            return null;
        }
    }

    async updateUserRating(contentId: string, rating: string, contentType = 'series') {
        const account = this.accountId;
        if (!account) return { success: false, error: 'Missing account id' };

        try {
            await this.request('PUT', `/content-reviews/v3/user/${account}/rating/${contentType}/${contentId}`, {
                body: { rating },
                useCache: false
            });
            return { success: true };
        } catch (e: any) {
            return { success: false, error: e?.message || 'Failed to update rating' };
        }
    }

    async removeUserRating(contentId: string, contentType = 'series') {
        const account = this.accountId;
        if (!account) return { success: false, error: 'Missing account id' };

        try {
            await this.request('DELETE', `/content-reviews/v3/user/${account}/rating/${contentType}/${contentId}`, {
                useCache: false
            });
            return { success: true };
        } catch (e: any) {
            return { success: false, error: e?.message || 'Failed to remove rating' };
        }
    }

    async getPlayStream(contentId: string) {
        return this.request<any>('GET', `/v1/${contentId}/web/chrome/play`, {
            baseUrl: PLAY_API_BASE,
            includeLocale: false,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'x-cr-stream-limits': 'false'
            }
        });
    }

    // ---------------------------------------------------------------------
    // Convenience aggregations
    // ---------------------------------------------------------------------

    async getSeriesWithSeasons(seriesId: string): Promise<SeriesWithSeasons> {
        await this.ensureReady();

        const [seriesRes, seasonsRes, watchlistRes] = await Promise.allSettled([
            this.getSeries(seriesId),
            this.getSeasons(seriesId),
            this.isInWatchlist(seriesId)
        ]);

        return {
            series: seriesRes.status === 'fulfilled' ? seriesRes.value : null,
            seasons: seasonsRes.status === 'fulfilled' ? seasonsRes.value : [],
            isInWatchlist: watchlistRes.status === 'fulfilled' ? watchlistRes.value : false
        };
    }

    async getHomeData(options: { continueWatchingLimit?: number; browseLimit?: number; seasonalTag?: string | null } = {}) {
        await this.ensureReady();

        const {
            continueWatchingLimit = 10,
            browseLimit = 30,
            seasonalTag = null
        } = options;

        const [cwRes, recoRes, browseRes, seasonalRes] = await Promise.allSettled([
            this.getContinueWatching(continueWatchingLimit),
            this.getRecommendations(),
            this.browse({ type: 'series', limit: browseLimit }),
            seasonalTag
                ? this.browse({ type: 'series', seasonal_tag: seasonalTag, limit: 20 })
                : Promise.resolve({ data: [], total: 0, meta: {} })
        ]);

        return {
            continueWatching: cwRes.status === 'fulfilled' ? cwRes.value : [],
            recommendations: recoRes.status === 'fulfilled' ? recoRes.value : { recommendations: [] },
            browseData: browseRes.status === 'fulfilled' ? browseRes.value : { data: [], total: 0, meta: {} },
            seasonalData: seasonalRes.status === 'fulfilled' ? seasonalRes.value : { data: [], total: 0, meta: {} }
        };
    }

    isInitialized() {
        return !!this.authToken && !!this.profileId;
    }
}

const crunchyrollAPI = new CrunchyrollAPI();
export default crunchyrollAPI;

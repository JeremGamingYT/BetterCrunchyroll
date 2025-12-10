export interface CrunchyrollAPI {
    authToken: string | null;
    profileId: string | null;
    accountId: string | null;
    locale: string;
    preferredAudioLanguage: string;
    initialize(force?: boolean): Promise<boolean>;
    isInitialized(): boolean;
    fetchEndpoint(path: string, params?: Record<string, any>, useCache?: boolean): Promise<any>;
    browse(options?: {
        limit?: number;
        start?: number;
        type?: string;
        categories?: string[];
        seasonal_tag?: string;
        seasonalTag?: string;
        is_dubbed?: boolean;
        is_subbed?: boolean;
        isDubbed?: boolean;
        isSubbed?: boolean;
        q?: string;
        sort_by?: string;
        sortBy?: string;
        order?: string;
        includeRatings?: boolean;
        useCache?: boolean;
    }): Promise<{ data: any[]; total: number; meta: any }>;
    search(query: string, limit?: number, start?: number, type?: string): Promise<{ data: any[]; total: number; meta: any }>;
    getUpNext(contentId: string): Promise<any>;
    getWatchHistory(pageSize?: number, page?: number): Promise<any[]>;
    getContinueWatching(limit?: number): Promise<any[]>;
    getWatchlist(limit?: number, start?: number, options?: {
        order?: string;
        type?: string;
        sort_by?: string;
        sortBy?: string;
        is_favorite?: boolean;
        is_dubbed?: boolean;
        is_subbed?: boolean;
        useCache?: boolean;
    }): Promise<{ data: any[]; total: number; meta: any }>;
    isInWatchlist(seriesId: string): Promise<boolean>;
    addToWatchlist(seriesId: string): Promise<{ success: boolean; error?: string; alreadyInHash?: boolean }>;
    removeFromWatchlist(seriesId: string): Promise<{ success: boolean; error?: string }>;
    getSeries(seriesId: string): Promise<any>;
    getSeasons(seriesId: string): Promise<any[]>;
    getSeason(seasonId: string): Promise<any>;
    getSeasonEpisodes(seasonId: string): Promise<any[]>;
    getEpisodes(seasonId: string): Promise<any[]>;
    getEpisode(episodeId: string): Promise<any>;
    getObjects(contentIds: string | string[], fields?: string[]): Promise<any[]>;
    getPlayheads(contentIds: string[] | string): Promise<Record<string, { playhead: number; fully_watched: boolean; last_modified: string }>>;
    getHomeFeed(limit?: number, start?: number): Promise<any>;
    getRecommendations(seedContentId?: string): Promise<{ recommendations: any[] }>;
    getUserRating(contentId: string, contentType?: string): Promise<any>;
    updateUserRating(contentId: string, rating: string, contentType?: string): Promise<{ success: boolean; error?: string }>;
    removeUserRating(contentId: string, contentType?: string): Promise<{ success: boolean; error?: string }>;
    getPlayStream(contentId: string): Promise<any>;
    setLocale(locale: string): Promise<void>;
    clearCache(): void;
    clearCacheByPrefix(prefix: string): void;
    getSeriesWithSeasons(seriesId: string): Promise<{
        series: any;
        seasons: any[];
        isInWatchlist: boolean;
    }>;
    getHomeData(options?: {
        continueWatchingLimit?: number;
        browseLimit?: number;
        seasonalTag?: string | null;
    }): Promise<{
        continueWatching: any[];
        recommendations: { recommendations: any[] };
        browseData: { data: any[]; total: number; meta: any };
        seasonalData: { data: any[]; total: number; meta: any };
    }>;
}

declare const crunchyrollAPI: CrunchyrollAPI;
export default crunchyrollAPI;

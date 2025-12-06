export interface CrunchyrollAPI {
    authToken: string | null;
    initialize(): Promise<boolean>;
    get(endpoint: string, params?: Record<string, any>, useCache?: boolean): Promise<any>;
    getUpNext(seriesId: string): Promise<any>;
    getContinueWatching(limit?: number): Promise<any>;
    getWatchlist(limit?: number, start?: number): Promise<any>;
    isInWatchlist(seriesId: string): Promise<boolean>;
    addToWatchlist(seriesId: string): Promise<{ success: boolean; data?: any; error?: string }>;
    removeFromWatchlist(seriesId: string): Promise<{ success: boolean; error?: string }>;
    getRecommendations(collectionId?: string): Promise<any>;
    getSeries(seriesId: string): Promise<any>;
    getSeasons(seriesId: string): Promise<any>;
    getEpisodes(seasonId: string): Promise<any>;
    search(query: string, limit?: number): Promise<any>;
    browse(options?: {
        limit?: number;
        start?: number;
        type?: string;
        categories?: string[];
        seasonal_tag?: string;
        is_dubbed?: boolean;
        is_subbed?: boolean;
        q?: string;
    }): Promise<any>;
    clearCache(): void;
    setLocale(locale: string): Promise<void>;
    getPlayStream(contentId: string): Promise<{
        url: string;
        subtitles?: Record<string, { url: string; format: string }>;
        [key: string]: any;
    }>;
}

declare const crunchyrollAPI: CrunchyrollAPI;
export default crunchyrollAPI;

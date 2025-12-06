import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

// Chrome Extension API types (global declaration)
declare global {
    const chrome: any;
}



// ========================================
// TYPES
// ========================================

export interface CrunchyrollImage {
    height: number;
    source: string;
    type: string;
    width: number;
}

export interface EpisodeMetadata {
    series_id: string;
    series_title: string;
    series_slug_title: string;
    season_id: string;
    season_title: string;
    season_number: number;
    episode_number: number;
    episode: string;
    duration_ms: number;
    audio_locale: string;
    subtitle_locales: string[];
    availability_starts: string;
    availability_ends: string;
    is_premium_only: boolean;
    maturity_ratings: string[];
    tenant_categories?: string[];
}

export interface Episode {
    id: string;
    title: string;
    description: string;
    images: {
        thumbnail: CrunchyrollImage[][];
    };
    episode_metadata: EpisodeMetadata;
    playhead?: number;
    fully_watched?: boolean;
    never_watched?: boolean;
    slug_title?: string;
    type?: string;
}

export interface SeriesMetadata {
    audio_locales: string[];
    subtitle_locales: string[];
    episode_count: number;
    season_count: number;
    is_dubbed: boolean;
    is_subbed: boolean;
    is_simulcast: boolean;
    is_mature: boolean;
    maturity_ratings: string[];
    tenant_categories?: string[];
    series_launch_year?: number;
}

export interface Series {
    id: string;
    title: string;
    description: string;
    slug_title: string;
    images: {
        poster_tall: CrunchyrollImage[][];
        poster_wide: CrunchyrollImage[][];
    };
    series_metadata: SeriesMetadata;
    rating?: {
        average: string;
        total: number;
        [key: string]: any;
    };
    type?: string;
}

export interface UpNextItem {
    panel: Episode;
    playhead: number;
    fully_watched: boolean;
    never_watched: boolean;
}

export interface CrunchyrollData {
    up_next?: {
        data: UpNextItem[];
        total: number;
        timestamp: number;
    };
    objects?: {
        data: Series[];
        total: number;
        timestamp: number;
    };
    discover?: {
        data: Series[];
        total: number;
        timestamp: number;
    };
    watchlist?: {
        data: any[];
        total: number;
        timestamp: number;
    };
    series?: {
        data: Series[];
        total: number;
        timestamp: number;
    };
}

export interface CrunchyrollHeaders {
    Authorization?: string;
    'X-Crunchyroll-Policy'?: string;
    'X-Crunchyroll-Signature'?: string;
    'X-Crunchyroll-KeyPairId'?: string;
}

// ========================================
// CONTEXT
// ========================================

interface CrunchyrollDataContextType {
    data: CrunchyrollData;
    headers: CrunchyrollHeaders | null;
    loading: boolean;
    error: string | null;
    refreshData: () => Promise<void>;
    fetchAPI: (endpoint: string) => Promise<any>;
    fetchAPIDirect: (method: 'getContinueWatching' | 'getWatchlist' | 'getRecommendations' | 'getUpNext' | 'getSeries' | 'search', ...args: any[]) => Promise<any>;
    getUpNext: () => UpNextItem[];
    getDiscover: () => Series[];
    getWatchlist: () => any[];
}

const CrunchyrollDataContext = createContext<CrunchyrollDataContextType | undefined>(undefined);

// ========================================
// PROVIDER
// ========================================

export const CrunchyrollDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [data, setData] = useState<CrunchyrollData>({});
    const [headers, setHeaders] = useState<CrunchyrollHeaders | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Check if we're in a Chrome extension environment
    const isExtension = typeof chrome !== 'undefined' && chrome.storage;

    // Load data from chrome.storage
    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);

            // If not in extension environment, use mock data for development
            if (!isExtension) {
                console.log('[CrunchyrollData] Development mode - using mock data');
                setLoading(false);
                return;
            }

            // Get stored data
            const result = await chrome.storage.local.get(['crunchyrollData', 'crunchyroll_headers']);

            if (result.crunchyrollData) {
                setData(result.crunchyrollData);
                console.log('[CrunchyrollData] Loaded data:', result.crunchyrollData);
            }

            if (result.crunchyroll_headers) {
                setHeaders(result.crunchyroll_headers);
                console.log('[CrunchyrollData] Loaded headers:', Object.keys(result.crunchyroll_headers));
            }

        } catch (err) {
            console.error('[CrunchyrollData] Error loading data:', err);
            setError(err instanceof Error ? err.message : 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    // Listen for data updates
    useEffect(() => {
        loadData();

        // Only set up listener in extension environment
        if (!isExtension) {
            return;
        }

        // Listen for storage changes
        const handleStorageChange = (changes: { [key: string]: any }) => {
            if (changes.crunchyrollData) {
                console.log('[CrunchyrollData] Data updated');
                setData(changes.crunchyrollData.newValue || {});
            }
            if (changes.crunchyroll_headers) {
                console.log('[CrunchyrollData] Headers updated');
                setHeaders(changes.crunchyroll_headers.newValue || null);
            }
        };

        chrome.storage.onChanged.addListener(handleStorageChange);

        return () => {
            chrome.storage.onChanged.removeListener(handleStorageChange);
        };
    }, []);

    // Refresh data
    const refreshData = async () => {
        await loadData();
    };

    // Fetch from Crunchyroll API using background script
    const fetchAPI = async (endpoint: string) => {
        if (!isExtension) {
            throw new Error('API fetching is only available in extension mode. Please use the extension on crunchyroll.com');
        }

        if (!headers) {
            throw new Error('No authentication headers available. Please visit Crunchyroll first.');
        }

        try {
            const response = await chrome.runtime.sendMessage({
                action: 'FETCH_CRUNCHYROLL_API',
                endpoint: endpoint
            });

            if (!response.success) {
                throw new Error(response.error || 'Failed to fetch from API');
            }

            return response.data;
        } catch (err) {
            console.error('[CrunchyrollData] Error fetching from API:', err);
            throw err;
        }
    };

    // Fetch from Crunchyroll API using direct API calls
    const fetchAPIDirect = async (method: 'getContinueWatching' | 'getWatchlist' | 'getRecommendations' | 'getUpNext' | 'getSeries' | 'search', ...args: any[]) => {
        if (!isExtension) {
            throw new Error('API fetching is only available in extension mode. Please use the extension on crunchyroll.com');
        }

        try {
            // Dynamically import the API service
            // @ts-ignore - JS module in TS context
            const { default: crunchyrollAPI } = await import('../services/crunchyrollApi.js');

            // Initialize if not already done
            await crunchyrollAPI.initialize();

            // Call the requested method
            const result = await (crunchyrollAPI as any)[method](...args);

            return result;
        } catch (err) {
            console.error('[CrunchyrollData] Error fetching from API directly:', err);
            throw err;
        }
    };

    // Helper: Get "Continue Watching" items
    const getUpNext = (): UpNextItem[] => {
        return data.up_next?.data || [];
    };

    // Helper: Get discover/browse items
    const getDiscover = (): Series[] => {
        // Try objects first (contains series data with ratings)
        if (data.objects?.data && data.objects.data.length > 0) {
            return data.objects.data;
        }
        // Fallback to discover
        if (data.discover?.data && data.discover.data.length > 0) {
            return data.discover.data;
        }
        return [];
    };

    // Helper: Get watchlist
    const getWatchlist = () => {
        return data.watchlist?.data || [];
    };

    const value: CrunchyrollDataContextType = {
        data,
        headers,
        loading,
        error,
        refreshData,
        fetchAPI,
        fetchAPIDirect,
        getUpNext,
        getDiscover,
        getWatchlist
    };

    return (
        <CrunchyrollDataContext.Provider value={value}>
            {children}
        </CrunchyrollDataContext.Provider>
    );
};

// ========================================
// HOOK
// ========================================

export const useCrunchyrollData = () => {
    const context = useContext(CrunchyrollDataContext);
    if (!context) {
        throw new Error('useCrunchyrollData must be used within CrunchyrollDataProvider');
    }
    return context;
};

export default CrunchyrollDataContext;

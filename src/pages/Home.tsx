import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import ContentRow from '../components/ContentRow';
import LoadingScreen from '../components/LoadingScreen';
import { type Anime } from '../components/AnimeCard';
import { useCrunchyrollData } from '../contexts/CrunchyrollDataContext';
import { cacheService } from '../services/cacheService';
import crunchyrollAPI from '../services/crunchyrollApi';

const mockNewReleases: Anime[] = [
    { id: 8, title: "Frieren", image: "https://images3.alphacoders.com/133/1332803.jpeg", episodes: "Episode 12", type: "Simulcast" },
];

const mockPopular: Anime[] = [
    { id: 13, title: "Jujutsu Kaisen", image: "https://images6.alphacoders.com/133/1330235.png", episodes: "Season 2", type: "Sub | Dub" },
];

const getCurrentSeasonalTag = (): string => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    let season: string;
    if (month >= 1 && month <= 3) season = 'winter';
    else if (month >= 4 && month <= 6) season = 'spring';
    else if (month >= 7 && month <= 9) season = 'summer';
    else season = 'fall';
    return `${season}-${year}`;
};

const Home = () => {
    const navigate = useNavigate();
    useCrunchyrollData(); // Keep context active but we don't need data directly
    const [recommendations, setRecommendations] = useState<Anime[]>([]);
    const [continueWatching, setContinueWatching] = useState<Anime[]>([]);
    const [newReleases, setNewReleases] = useState<Anime[]>([]);
    const [popular, setPopular] = useState<Anime[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [heroLoaded, setHeroLoaded] = useState(false);
    const [dataLoaded, setDataLoaded] = useState(false);
    const [apiInitialized, setApiInitialized] = useState(false);
    const initializingRef = useRef(false);
    const dataLoadedRef = useRef(false);

    // Initialize API first - only once
    const initializeApi = useCallback(async () => {
        if (initializingRef.current || apiInitialized) return;
        initializingRef.current = true;

        try {
            console.log('[Home] 🔄 Initializing API...');
            const success = await crunchyrollAPI.initialize();
            if (success) {
                console.log('[Home] ✅ API initialized successfully');
                setApiInitialized(true);
            } else {
                console.warn('[Home] ⚠️ API initialization returned false, retrying...');
                // Retry after a delay
                setTimeout(() => {
                    initializingRef.current = false;
                    initializeApi();
                }, 1000);
            }
        } catch (error) {
            console.error('[Home] ❌ API initialization error:', error);
            // Continue anyway with cached/mock data
            setApiInitialized(true);
        }
    }, [apiInitialized]);

    // Initialize API on mount
    useEffect(() => {
        initializeApi();
    }, [initializeApi]);

    // Load data once API is initialized
    useEffect(() => {
        if (apiInitialized && !dataLoadedRef.current) {
            dataLoadedRef.current = true;
            loadAllData();
        }
    }, [apiInitialized]);

    // Finish loading when both hero and data are ready
    useEffect(() => {
        if (heroLoaded && dataLoaded) {
            console.log('[Home] ✅ Everything loaded');
            // Small delay for smooth transition
            const timer = setTimeout(() => setIsLoading(false), 300);
            return () => clearTimeout(timer);
        }
    }, [heroLoaded, dataLoaded]);

    const handleHeroLoad = useCallback(() => {
        console.log('[Home] ✅ Hero loaded');
        setHeroLoaded(true);
    }, []);

    const loadAllData = async () => {
        console.log('[Home] 📊 Loading all data...');

        try {
            // Check cache first for instant display
            const cachedNew = cacheService.get<Anime[]>('newReleases');
            const cachedPop = cacheService.get<Anime[]>('popular');
            const cachedReco = cacheService.get<Anime[]>('recommendations');
            const cachedCW = cacheService.get<Anime[]>('continueWatching');

            // Set cached data immediately if available
            if (cachedNew) setNewReleases(cachedNew);
            if (cachedPop) setPopular(cachedPop);
            if (cachedReco) setRecommendations(cachedReco);
            if (cachedCW) setContinueWatching(cachedCW);

            // If all data is cached, we're done
            if (cachedNew && cachedPop && cachedReco) {
                console.log('[Home] ✅ Using fully cached data');
                setDataLoaded(true);
                return;
            }

            // Load missing data in parallel
            await Promise.all([
                !cachedReco && loadRecommendations(),
                !cachedCW && loadContinueWatching(),
                (!cachedNew || !cachedPop) && loadDiscoverData()
            ].filter(Boolean));

            setDataLoaded(true);
        } catch (error) {
            console.error('[Home] Error loading data:', error);
            // Set mock data as fallback
            if (newReleases.length === 0) setNewReleases(mockNewReleases);
            if (popular.length === 0) setPopular(mockPopular);
            setDataLoaded(true);
        }
    };

    const loadRecommendations = async () => {
        try {
            const recoData = await crunchyrollAPI.getRecommendations();
            if (recoData?.recommendations && recoData.recommendations.length > 0) {
                const formattedReco: Anime[] = recoData.recommendations.slice(0, 10).map((series: any) => ({
                    id: series.id,
                    title: series.title,
                    image: series.images?.poster_wide?.[0]?.[0]?.source || series.images?.poster_tall?.[0]?.[0]?.source || '',
                    episodes: `${series.series_metadata?.episode_count || 0} Episodes`,
                    type: series.series_metadata?.is_dubbed && series.series_metadata?.is_subbed ? 'Sub | Dub' : series.series_metadata?.is_dubbed ? 'Dub' : 'Sub',
                    rating: series.rating?.average
                }));
                setRecommendations(formattedReco);
                cacheService.set('recommendations', formattedReco, 30);
                console.log('[Home] ✅ Recommendations loaded:', formattedReco.length);
            }
        } catch (error) {
            console.error('[Home] Error loading Recommendations:', error);
        }
    };

    const loadContinueWatching = async () => {
        try {
            const cwData = await crunchyrollAPI.getContinueWatching(10);

            if (cwData && cwData.length > 0) {
                const formattedCW: Anime[] = cwData.map((item: any) => {
                    const panel = item.panel;
                    const metadata = panel?.episode_metadata;
                    const duration = metadata?.duration_ms || 0;
                    const playhead = item.playhead || 0;
                    const progress = duration > 0 ? Math.round((playhead / (duration / 1000)) * 100) : 0;

                    return {
                        id: panel?.id || item.id,
                        title: metadata?.series_title || panel?.title || 'Unknown',
                        image: panel?.images?.thumbnail?.[0]?.[0]?.source || '',
                        episodes: metadata?.episode_number ? `Épisode ${metadata.episode_number}` : panel?.title,
                        type: metadata?.is_dubbed && metadata?.is_subbed ? 'Sub | Dub' : metadata?.is_dubbed ? 'Dub' : 'Sub',
                        progress: progress,
                        seriesId: metadata?.series_id,
                        episodeId: panel?.id
                    };
                });
                setContinueWatching(formattedCW);
                cacheService.set('continueWatching', formattedCW, 5);
                console.log('[Home] ✅ Continue Watching loaded:', formattedCW.length);
            }
        } catch (error) {
            console.error('[Home] Error loading Continue Watching:', error);
        }
    };

    const loadDiscoverData = async () => {
        try {
            const currentSeason = getCurrentSeasonalTag();

            // Fetch seasonal and popular data in parallel
            console.log('[Home] 📊 Fetching discover data...');
            const [seasonalData, popularData] = await Promise.all([
                crunchyrollAPI.browse({
                    type: 'series',
                    seasonal_tag: currentSeason,
                    limit: 20
                }),
                crunchyrollAPI.browse({
                    type: 'series',
                    limit: 30 // Get more to sort by rating
                })
            ]);

            // Process seasonal data
            if (seasonalData?.data && seasonalData.data.length > 0) {
                const formattedNewReleases: Anime[] = seasonalData.data.map((series: any) => ({
                    id: series.id,
                    title: series.title,
                    image: series.images?.poster_wide?.[0]?.[0]?.source || series.images?.poster_tall?.[0]?.[0]?.source || '',
                    episodes: `${series.series_metadata?.episode_count || 0} Episodes`,
                    type: series.series_metadata?.is_dubbed && series.series_metadata?.is_subbed ? 'Sub | Dub' : series.series_metadata?.is_dubbed ? 'Dub' : 'Sub',
                    rating: series.rating?.average
                }));
                setNewReleases(formattedNewReleases);
                cacheService.set('newReleases', formattedNewReleases, 30);
                console.log('[Home] ✅ New releases loaded:', formattedNewReleases.length);
            } else {
                setNewReleases(mockNewReleases);
            }

            // Process popular data - sort by rating since API doesn't support sort_by
            if (popularData?.data && popularData.data.length > 0) {
                // Sort by rating (highest first)
                const sortedByRating = [...popularData.data].sort((a: any, b: any) => {
                    const ratingA = a.rating?.average || 0;
                    const ratingB = b.rating?.average || 0;
                    return ratingB - ratingA;
                });

                const formattedPopular: Anime[] = sortedByRating.slice(0, 20).map((series: any) => ({
                    id: series.id,
                    title: series.title,
                    image: series.images?.poster_wide?.[0]?.[0]?.source || series.images?.poster_tall?.[0]?.[0]?.source || '',
                    episodes: `${series.series_metadata?.episode_count || 0} Episodes`,
                    type: series.series_metadata?.is_dubbed && series.series_metadata?.is_subbed ? 'Sub | Dub' : series.series_metadata?.is_dubbed ? 'Dub' : 'Sub',
                    rating: series.rating?.average
                }));
                setPopular(formattedPopular);
                cacheService.set('popular', formattedPopular, 30);
                console.log('[Home] ✅ Popular loaded:', formattedPopular.length);
            } else {
                console.warn('[Home] Popular api returned empty, using mock');
                setPopular(mockPopular);
            }

        } catch (error) {
            console.error('[Home] Error loading discover data:', error);
            setNewReleases(mockNewReleases);
            setPopular(mockPopular);
        }
    };

    const handleCardClick = (anime: Anime) => {
        const seriesId = (anime as any).seriesId;
        navigate(seriesId ? `/series/${seriesId}` : `/series/${anime.id}`);
    };

    return (
        <>
            {/* LoadingScreen FIRST - shown until everything is ready */}
            <AnimatePresence>
                {isLoading && (
                    <LoadingScreen key="loading" message="Chargement de vos animés..." />
                )}
            </AnimatePresence>

            {/* Content - render always but hidden until loaded */}
            <div style={{
                opacity: isLoading ? 0 : 1,
                transition: 'opacity 0.5s ease',
                visibility: isLoading ? 'hidden' : 'visible'
            }}>
                <div className="home-page">
                    <Navbar />
                    <Hero onLoadComplete={handleHeroLoad} />
                    <div className="home-content" style={{ marginTop: '2rem' }}>
                        {continueWatching.length > 0 && (
                            <ContentRow title="Continue Watching" items={continueWatching} onCardClick={handleCardClick} />
                        )}
                        {recommendations.length > 0 && (
                            <ContentRow title="Our Selection for You" items={recommendations} onCardClick={handleCardClick} />
                        )}
                        <ContentRow title="New Releases" items={newReleases} onCardClick={handleCardClick} />
                        <ContentRow title="Popular on Crunchyroll" items={popular} onCardClick={handleCardClick} />
                    </div>
                </div>
            </div>
        </>
    );
};

export default Home;

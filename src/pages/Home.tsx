import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import ContentRow from '../components/ContentRow';
import LoadingScreen from '../components/LoadingScreen';
import { type Anime } from '../components/AnimeCard';
import { useCrunchyrollData } from '../contexts/CrunchyrollDataContext';
import { cacheService } from '../services/cacheService';

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
    const { data } = useCrunchyrollData();
    const [recommendations, setRecommendations] = useState<Anime[]>([]);
    const [continueWatching, setContinueWatching] = useState<Anime[]>([]);
    const [newReleases, setNewReleases] = useState<Anime[]>([]);
    const [popular, setPopular] = useState<Anime[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [heroLoaded, setHeroLoaded] = useState(false);
    const [dataLoaded, setDataLoaded] = useState(false);

    useEffect(() => {
        loadAllData();
    }, [data]);

    useEffect(() => {
        if (heroLoaded && dataLoaded) {
            console.log('[Home] ✅ Everything loaded');
            setTimeout(() => setIsLoading(false), 300); // Petit délai pour smooth transition
        }
    }, [heroLoaded, dataLoaded]);

    const handleHeroLoad = () => {
        console.log('[Home] ✅ Hero loaded');
        setHeroLoaded(true);
    };

    const loadAllData = async (retryCount = 0) => {
        setDataLoaded(false);

        // Vérifier le cache d'abord
        const cachedNew = cacheService.get<Anime[]>('newReleases');
        const cachedPop = cacheService.get<Anime[]>('popular');
        const cachedReco = cacheService.get<Anime[]>('recommendations');
        const cachedCW = cacheService.get<Anime[]>('continueWatching');

        if (cachedNew && cachedPop && cachedReco) {
            console.log('[Home] ✅ Using fully cached data');
            setNewReleases(cachedNew);
            setPopular(cachedPop);
            setRecommendations(cachedReco);
            if (cachedCW) setContinueWatching(cachedCW);
            setDataLoaded(true);
            return;
        }

        // Attendre que l'API soit prête
        const api = (window as any).crunchyAPI;
        if (!api) {
            if (retryCount < 5) {
                console.log('[Home] API not ready, retrying in 300ms...');
                setTimeout(() => loadAllData(retryCount + 1), 300);
                return;
            }
            console.error('[Home] API not available after retries');
            // Utiliser les données mockées si disponibles
            setNewReleases(mockNewReleases);
            setPopular(mockPopular);
            setDataLoaded(true);
            return;
        }

        // Charger toutes les données en parallèle
        await Promise.all([
            loadRecommendations(),
            loadContinueWatching(),
            loadDiscoverData()
        ]);
        setDataLoaded(true);
    };

    const loadRecommendations = async () => {
        try {
            const cached = cacheService.get<Anime[]>('recommendations');
            if (cached && cached.length > 0) {
                setRecommendations(cached);
                return;
            }

            const api = (window as any).crunchyAPI;
            if (!api) return;
            const recoData = await api.recommendations();
            if (!recoData?.recommendations) return;
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
        } catch (error) {
            console.error('[Home] Error loading Recommendations:', error);
        }
    };

    const loadContinueWatching = async () => {
        try {
            const cached = cacheService.get<Anime[]>('continueWatching');
            if (cached && cached.length > 0) {
                setContinueWatching(cached);
                return;
            }

            const api = (window as any).crunchyAPI;
            if (!api) return;

            // Attendre que l'API soit initialisée avec le profileId si nécessaire
            // Note: ceci est géré par api.getContinueWatching mais on peut ajouter un check

            const cwData = await api.continueWatching(10);

            // Si data est null ou vide, ne rien faire
            // On évite de passer un tableau vide si l'API a juste échoué temporairement
            if (cwData && cwData.length > 0) {
                const formattedCW: Anime[] = cwData.map((item: any) => {
                    const panel = item.panel;
                    const metadata = panel.episode_metadata;
                    // Fix: Ensure we handle 0 duration or missing metadata gracefully
                    const duration = metadata?.duration_ms || 0;
                    const playhead = item.playhead || 0;
                    const progress = duration > 0 ? Math.round((playhead / (duration / 1000)) * 100) : 0;

                    return {
                        id: panel.id,
                        title: metadata?.series_title || panel.title,
                        image: panel.images?.thumbnail?.[0]?.[0]?.source || '',
                        episodes: metadata?.episode_number ? `Épisode ${metadata.episode_number}` : panel.title,
                        type: metadata?.is_dubbed && metadata?.is_subbed ? 'Sub | Dub' : metadata?.is_dubbed ? 'Dub' : 'Sub',
                        progress: progress,
                        seriesId: metadata?.series_id,
                        episodeId: panel.id
                    };
                });
                setContinueWatching(formattedCW);
                cacheService.set('continueWatching', formattedCW, 5); // Cache plus court (5 min)
                console.log('[Home] ✅ Continue Watching loaded:', formattedCW.length);
            } else {
                console.log('[Home] Continue Watching is empty or failed');
            }
        } catch (error) {
            console.error('[Home] Error loading Continue Watching:', error);
        }
    };

    const loadDiscoverData = async () => {
        try {
            const api = (window as any).crunchyAPI;
            if (!api) return;

            // Vérifier le cache
            const cachedNew = cacheService.get<Anime[]>('newReleases');
            const cachedPop = cacheService.get<Anime[]>('popular');

            if (cachedNew && cachedPop) {
                setNewReleases(cachedNew);
                setPopular(cachedPop);
                return;
            }

            const currentSeason = getCurrentSeasonalTag();

            console.log('[Home] 📊 Fetching seasonal data...');
            const seasonalData = await api.browse({
                type: 'series',
                seasonal_tag: currentSeason,
                limit: 20
            });

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

            // Récupérer les populaires via browse
            console.log('[Home] 📊 Fetching popular data...');
            const popularData = await api.browse({
                type: 'series',
                sort_by: 'popularity',
                limit: 20
            });

            if (popularData?.data && popularData.data.length > 0) {
                // Tri par popularité réelle (basé sur le total de votes et la note)
                const sortedData = popularData.data.sort((a: any, b: any) => {
                    // Utiliser total des votes comme métrique principale de popularité
                    const votesA = a.rating?.total || 0;
                    const votesB = b.rating?.total || 0;
                    if (votesB !== votesA) return votesB - votesA;

                    // En cas d'égalité, utiliser la note moyenne
                    const ratingA = parseFloat(a.rating?.average || '0');
                    const ratingB = parseFloat(b.rating?.average || '0');
                    return ratingB - ratingA;
                });

                const formattedPopular: Anime[] = sortedData.map((series: any) => ({
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
            {/* Contenu chargé en arrière-plan */}
            <div style={{ opacity: isLoading ? 0 : 1, transition: 'opacity 0.5s ease' }}>
                <div className="home-page">
                    <Navbar />
                    <Hero onLoadComplete={handleHeroLoad} />
                    <div className="home-content" style={{ marginTop: '2rem' }}>
                        {recommendations.length > 0 && (
                            <ContentRow title="Our Selection for You" items={recommendations} onCardClick={handleCardClick} />
                        )}
                        {continueWatching.length > 0 && (
                            <ContentRow title="Continue Watching" items={continueWatching} onCardClick={handleCardClick} />
                        )}
                        <ContentRow title="New Releases" items={newReleases} onCardClick={handleCardClick} />
                        <ContentRow title="Popular on Crunchyroll" items={popular} onCardClick={handleCardClick} />
                    </div>
                </div>
            </div>

            {/* LoadingScreen par-dessus */}
            <AnimatePresence>
                {isLoading && (
                    <LoadingScreen key="loading" message="Chargement de vos animés..." />
                )}
            </AnimatePresence>
        </>
    );
};

export default Home;

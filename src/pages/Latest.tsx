import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import AnimeCard, { type Anime } from '../components/AnimeCard';
import PageLoader from '../components/PageLoader';
import { cacheService } from '../services/cacheService';
import '../styles/GridPage.scss';

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

const Latest = () => {
    const navigate = useNavigate();
    const [latestAnime, setLatestAnime] = useState<Anime[]>([]);
    const [displayedAnime, setDisplayedAnime] = useState<Anime[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [displayCount, setDisplayCount] = useState(24);

    useEffect(() => {
        loadLatest();
    }, []);

    useEffect(() => {
        // Mettre à jour les animés affichés quand displayCount change
        setDisplayedAnime(latestAnime.slice(0, displayCount));
    }, [displayCount, latestAnime]);

    const loadLatest = async (retryCount = 0) => {
        try {
            // Vérifier le cache d'abord
            const cached = cacheService.get<Anime[]>('latest');
            if (cached && cached.length > 0) {
                console.log('[Latest] ✅ Using cached data');
                setLatestAnime(cached);
                setDisplayedAnime(cached.slice(0, displayCount));
                setLoading(false);
                return;
            }

            const api = (window as any).crunchyAPI;
            if (!api) {
                // Retry après un délai si l'API n'est pas encore prête
                if (retryCount < 3) {
                    console.log('[Latest] API not ready, retrying in 500ms...');
                    setTimeout(() => loadLatest(retryCount + 1), 500);
                    return;
                }
                console.error('[Latest] window.crunchyAPI not available after retries');
                setLoading(false);
                return;
            }

            console.log('[Latest] Loading latest episodes...');
            const currentSeason = getCurrentSeasonalTag();

            // Récupérer les séries de la saison actuelle
            const seasonalData = await api.browse({
                type: 'series',
                seasonal_tag: currentSeason,
                limit: 100, // Charger plus pour permettre la pagination
                sort_by: 'newly_added'
            });

            if (!seasonalData?.data || seasonalData.data.length === 0) {
                console.warn('[Latest] No seasonal data');
                setLoading(false);
                return;
            }

            // Formater les données
            const formatted: Anime[] = seasonalData.data.map((series: any) => ({
                id: series.id,
                title: series.title,
                image: series.images?.poster_wide?.[0]?.[0]?.source || series.images?.poster_tall?.[0]?.[0]?.source || '',
                episodes: series.series_metadata?.episode_count
                    ? `${series.series_metadata.episode_count} Episodes`
                    : 'New Series',
                type: series.series_metadata?.is_dubbed && series.series_metadata?.is_subbed
                    ? 'Sub | Dub'
                    : series.series_metadata?.is_dubbed
                        ? 'Dub'
                        : 'Sub',
                rating: series.rating?.average
            }));

            setLatestAnime(formatted);
            setDisplayedAnime(formatted.slice(0, displayCount));
            cacheService.set('latest', formatted, 15); // Cache de 15 minutes
            console.log(`[Latest] ✅ Loaded ${formatted.length} latest series`);
        } catch (error) {
            console.error('[Latest] Error loading latest:', error);
            // Retry on error
            if (retryCount < 2) {
                console.log('[Latest] Retrying after error...');
                setTimeout(() => loadLatest(retryCount + 1), 1000);
                return;
            }
        } finally {
            if (retryCount >= 2 || (window as any).crunchyAPI) {
                setLoading(false);
            }
        }
    };

    const handleLoadMore = () => {
        setLoadingMore(true);
        setTimeout(() => {
            setDisplayCount(prev => prev + 10);
            setLoadingMore(false);
        }, 300); // Petit délai pour l'effet de chargement
    };

    if (loading) {
        return (
            <div className="grid-page">
                <Navbar />
                <PageLoader message="Chargement des dernières sorties..." />
            </div>
        );
    }

    const hasMore = displayCount < latestAnime.length;

    return (
        <div className="grid-page">
            <Navbar />
            <div className="bc-container">
                <div className="page-header">
                    <h1>Latest Episodes</h1>
                    <p>Fresh from Japan, available now.</p>
                    {latestAnime.length > 0 && (
                        <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem' }}>
                            Affichage de {displayedAnime.length} sur {latestAnime.length} séries
                        </span>
                    )}
                </div>

                {displayedAnime.length > 0 ? (
                    <>
                        <div className="anime-grid">
                            {displayedAnime.map(anime => (
                                <AnimeCard
                                    key={anime.id}
                                    anime={anime}
                                    onClick={(a) => navigate(`/series/${a.id}`)}
                                />
                            ))}
                        </div>

                        {hasMore && (
                            <div style={{
                                display: 'flex',
                                justifyContent: 'center',
                                marginTop: '3rem',
                                marginBottom: '2rem'
                            }}>
                                <button
                                    className="btn-primary"
                                    onClick={handleLoadMore}
                                    disabled={loadingMore}
                                    style={{
                                        minWidth: '200px',
                                        opacity: loadingMore ? 0.7 : 1
                                    }}
                                >
                                    {loadingMore ? 'Chargement...' : 'Charger plus'}
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div style={{
                        textAlign: 'center',
                        padding: '4rem 2rem',
                        color: 'var(--color-text-secondary)'
                    }}>
                        <h3>Aucune série disponible pour le moment</h3>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Latest;

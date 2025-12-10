import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import AnimeCard, { type Anime } from '../components/AnimeCard';
import PageLoader from '../components/PageLoader';
import { cacheService } from '../services/cacheService';
import { ensureCrunchyApi } from '../utils/apiInstance';
import '../styles/GridPage.scss';

const Popular = () => {
    const navigate = useNavigate();
    const [popularAnime, setPopularAnime] = useState<Anime[]>([]);
    const [displayedAnime, setDisplayedAnime] = useState<Anime[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [displayCount, setDisplayCount] = useState(24);

    useEffect(() => {
        loadPopular();
    }, []);

    useEffect(() => {
        // Mettre à jour les animés affichés quand displayCount change
        setDisplayedAnime(popularAnime.slice(0, displayCount));
    }, [displayCount, popularAnime]);

    const loadPopular = async (retryCount = 0) => {
        try {
            // Vérifier le cache d'abord
            const cached = cacheService.get<Anime[]>('popularPage');
            if (cached && cached.length > 0) {
                console.log('[Popular] ✅ Using cached data');
                setPopularAnime(cached);
                setDisplayedAnime(cached.slice(0, displayCount));
                setLoading(false);
                return;
            }

            console.log('[Popular] Loading popular series...');

            // Initialiser API (fallback sur l'instance globale si disponible)
            const api = await ensureCrunchyApi();

            // Fetch more series to get a good sample for sorting by rating
            // Note: The Crunchyroll API doesn't support sort_by parameter
            // So we fetch a larger set and sort client-side by rating
            const browseData = await api.browse({
                type: 'series',
                limit: 100 // Get more to have better data for rating sort
            });

            if (!browseData?.data || browseData.data.length === 0) {
                console.warn('[Popular] No browse data found');

                // Retry if first attempt
                if (retryCount < 2) {
                    console.log('[Popular] Retrying...');
                    setTimeout(() => loadPopular(retryCount + 1), 1000);
                    return;
                }

                setLoading(false);
                return;
            }

            // Sort by rating (highest first)
            const sortedByRating = [...browseData.data].sort((a: any, b: any) => {
                const ratingA = a.rating?.average || 0;
                const ratingB = b.rating?.average || 0;
                return ratingB - ratingA;
            });

            // Formater les données
            const formatted: Anime[] = sortedByRating.map((series: any) => ({
                id: series.id,
                title: series.title,
                image: series.images?.poster_wide?.[0]?.[0]?.source || series.images?.poster_tall?.[0]?.[0]?.source || '',
                episodes: series.series_metadata?.episode_count
                    ? `${series.series_metadata.episode_count} Episodes`
                    : 'Série',
                type: series.series_metadata?.is_dubbed && series.series_metadata?.is_subbed
                    ? 'Sub | Dub'
                    : series.series_metadata?.is_dubbed
                        ? 'Dub'
                        : 'Sub',
                rating: series.rating?.average
            }));

            setPopularAnime(formatted);
            setDisplayedAnime(formatted.slice(0, displayCount));
            cacheService.set('popularPage', formatted, 60); // Cache de 1h
            console.log(`[Popular] ✅ Loaded ${formatted.length} popular series (sorted by rating)`);
            setLoading(false);
        } catch (error) {
            console.error('[Popular] Error loading popular:', error);
            // Retry on error
            if (retryCount < 2) {
                console.log('[Popular] Retrying after error...');
                setTimeout(() => loadPopular(retryCount + 1), 1000);
                return;
            }
            setLoading(false);
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
                <PageLoader message="Chargement des séries populaires..." />
            </div>
        );
    }

    const hasMore = displayCount < popularAnime.length;

    return (
        <div className="grid-page">
            <Navbar />
            <div className="bc-container">
                <div className="page-header">
                    <h1>Most Popular</h1>
                    <p>The most watched anime on Crunchyroll right now.</p>
                    {popularAnime.length > 0 && (
                        <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem' }}>
                            Affichage de {displayedAnime.length} sur {popularAnime.length} séries
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

export default Popular;

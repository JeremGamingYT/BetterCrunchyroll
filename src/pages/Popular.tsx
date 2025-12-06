import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import AnimeCard, { type Anime } from '../components/AnimeCard';
import PageLoader from '../components/PageLoader';
import { cacheService } from '../services/cacheService';
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

            const api = (window as any).crunchyAPI;
            if (!api) {
                // Retry après un délai si l'API n'est pas encore prête
                if (retryCount < 3) {
                    console.log('[Popular] API not ready, retrying in 500ms...');
                    setTimeout(() => loadPopular(retryCount + 1), 500);
                    return;
                }
                console.error('[Popular] window.crunchyAPI not available after retries');
                setLoading(false);
                return;
            }

            console.log('[Popular] Loading popular series...');

            // Récupérer les recommandations (contient les séries populaires avec ratings)
            const recoData = await api.recommendations();

            if (!recoData?.recommendations || recoData.recommendations.length === 0) {
                console.warn('[Popular] No recommendations data');
                setLoading(false);
                return;
            }

            // Filtrer et trier par popularité (rating × nombre de votes)
            const seriesWithRating = recoData.recommendations
                .filter((series: any) => series.rating?.average && series.rating?.total)
                .sort((a: any, b: any) => {
                    const aScore = parseFloat(a.rating?.average || '0') * Math.log10(parseInt(a.rating?.total || '0') + 1);
                    const bScore = parseFloat(b.rating?.average || '0') * Math.log10(parseInt(b.rating?.total || '0') + 1);
                    return bScore - aScore;
                });

            // Formater les données - prendre plus de séries pour la pagination
            const formatted: Anime[] = seriesWithRating.slice(0, 100).map((series: any) => ({
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
            cacheService.set('popularPage', formatted, 20); // Cache de 20 minutes
            console.log(`[Popular] ✅ Loaded ${formatted.length} popular series`);
        } catch (error) {
            console.error('[Popular] Error loading popular:', error);
            // Retry on error
            if (retryCount < 2) {
                console.log('[Popular] Retrying after error...');
                setTimeout(() => loadPopular(retryCount + 1), 1000);
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

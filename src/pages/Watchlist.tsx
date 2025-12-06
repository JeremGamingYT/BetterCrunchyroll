import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import AnimeCard, { type Anime } from '../components/AnimeCard';
import PageLoader from '../components/PageLoader';
import '../styles/GridPage.scss';

const Watchlist = () => {
    const navigate = useNavigate();
    const [watchlist, setWatchlist] = useState<Anime[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadWatchlist();
    }, []);

    const loadWatchlist = async (retryCount = 0) => {
        try {
            setLoading(true);

            // Récupérer l'API depuis window.crunchyAPI
            const api = (window as any).crunchyAPI;

            if (!api) {
                if (retryCount < 3) {
                    console.log('[Watchlist] API not ready, retrying in 500ms...');
                    setTimeout(() => loadWatchlist(retryCount + 1), 500);
                    return;
                }
                console.error('[Watchlist] window.crunchyAPI not available after retries');
                setLoading(false);
                return;
            }

            console.log('[Watchlist] Loading watchlist...');
            const watchlistData = await api.watchlist();

            if (!watchlistData || !watchlistData.data) {
                console.warn('[Watchlist] No watchlist data returned');
                setWatchlist([]);
                setLoading(false);
                return;
            }

            console.log('[Watchlist] Watchlist loaded:', watchlistData.total, 'items');

            // Formater les données pour les cartes - gérer différents formats de réponse
            const formattedWatchlist: Anime[] = watchlistData.data.map((item: any) => {
                // Gérer le format avec panel (historique/continue watching)
                const panel = item.panel;
                const metadata = panel?.episode_metadata;

                // Gérer le format série direct (watchlist)
                const seriesMeta = item.series_metadata || item.content_metadata;

                // Déterminer l'image
                const thumbnail = panel?.images?.thumbnail?.[0]?.[0]?.source
                    || item.images?.poster_wide?.[0]?.[0]?.source
                    || item.images?.poster_tall?.[0]?.[0]?.source
                    || '';

                // Calculer la progression (si disponible)
                const progress = item.playhead && metadata?.duration_ms
                    ? Math.round((item.playhead / (metadata.duration_ms / 1000)) * 100)
                    : 0;

                return {
                    id: panel?.id || item.id,
                    title: metadata?.series_title || item.title || panel?.title,
                    image: thumbnail,
                    episodes: metadata?.episode_number
                        ? `Épisode ${metadata.episode_number}`
                        : seriesMeta?.episode_count
                            ? `${seriesMeta.episode_count} Episodes`
                            : panel?.title || 'Série',
                    type: (metadata?.is_dubbed || seriesMeta?.is_dubbed) && (metadata?.is_subbed || seriesMeta?.is_subbed)
                        ? 'Sub | Dub'
                        : (metadata?.is_dubbed || seriesMeta?.is_dubbed)
                            ? 'Dub'
                            : 'Sub',
                    progress: progress,
                    // Informations supplémentaires pour le clic
                    seriesId: metadata?.series_id || item.id,
                    episodeId: panel?.id,
                    fullyWatched: item.fully_watched,
                    neverWatched: item.never_watched
                };
            });

            setWatchlist(formattedWatchlist);
            console.log('[Watchlist] ✅ Watchlist formatted:', formattedWatchlist.length, 'items');

        } catch (error) {
            console.error('[Watchlist] Error loading watchlist:', error);
            if (retryCount < 2) {
                setTimeout(() => loadWatchlist(retryCount + 1), 1000);
                return;
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCardClick = (anime: Anime) => {
        // Si on a un series_id, aller vers la série
        const seriesId = (anime as any).seriesId;
        if (seriesId) {
            navigate(`/series/${seriesId}`);
        } else {
            navigate(`/series/${anime.id}`);
        }
    };

    if (loading) {
        return (
            <div className="grid-page">
                <Navbar />
                <PageLoader message="Chargement de votre watchlist..." />
            </div>
        );
    }

    return (
        <div className="grid-page">
            <Navbar />

            <div className="bc-container">
                <div className="page-header">
                    <h1>Ma Watchlist</h1>
                    {watchlist.length > 0 && (
                        <p>{watchlist.length} anime{watchlist.length > 1 ? 's' : ''} dans votre liste</p>
                    )}
                </div>

                {watchlist.length > 0 ? (
                    <div className="anime-grid">
                        {watchlist.map((anime) => (
                            <div key={anime.id} className="anime-card-wrapper">
                                <AnimeCard anime={anime} onClick={handleCardClick} />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{
                        textAlign: 'center',
                        color: 'var(--color-text-secondary)',
                        padding: '4rem 2rem',
                        fontSize: '1.2rem',
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: '16px',
                        border: '1px solid var(--color-glass-border)'
                    }}>
                        Votre watchlist est vide. Ajoutez des animes pour commencer !
                    </div>
                )}
            </div>
        </div>
    );
};

export default Watchlist;

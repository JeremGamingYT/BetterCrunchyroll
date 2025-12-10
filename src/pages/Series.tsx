import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowLeft, Play, Star, Bookmark, Share2, Clock } from 'lucide-react';
import Navbar from '../components/Navbar';
import PageLoader from '../components/PageLoader';
import { cacheService } from '../services/cacheService';
import { ensureCrunchyApi } from '../utils/apiInstance';
import './Series.scss';

interface SeriesData {
    id: string;
    title: string;
    description: string;
    images?: {
        poster_wide?: Array<Array<{ source: string }>>;
        poster_tall?: Array<Array<{ source: string }>>;
    };
    series_metadata?: {
        maturity_ratings?: string[];
        is_mature?: boolean;
        is_subbed?: boolean;
        is_dubbed?: boolean;
        episode_count?: number;
        season_count?: number;
    };
    rating?: {
        average?: number;
        total?: number;
    };
}

interface Season {
    id: string;
    title: string;
    season_number: number;
    episodes?: Episode[];
    isLoading?: boolean;
}

interface Episode {
    id: string;
    title: string;
    episode: string;
    episode_number: number;
    season_number: number;
    description?: string;
    images?: {
        thumbnail?: Array<Array<{ source: string }>>;
    };
    duration_ms?: number;
    is_premium_only?: boolean;
    playhead?: number;
    fully_watched?: boolean;
}

const Series = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [seriesData, setSeriesData] = useState<SeriesData | null>(null);
    const [seasons, setSeasons] = useState<Season[]>([]);
    const [activeSeason, setActiveSeason] = useState<Season | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isInWatchlist, setIsInWatchlist] = useState(false);
    const [watchlistLoading, setWatchlistLoading] = useState(false);

    const [userRating, setUserRating] = useState<string | null>(null);

    const loadSeriesData = async (seriesId: string) => {
        try {
            setLoading(true);
            setError(null);
            const api = await ensureCrunchyApi();

            // Vérifier le cache d'abord
            const cacheKey = `series_${seriesId}`;
            const cached = cacheService.get<{ series: SeriesData; seasons: Season[] }>(cacheKey);

            if (cached) {
                console.log('[Series] ✅ Using cached data');
                setSeriesData(cached.series);
                setSeasons(cached.seasons);
                if (cached.seasons.length > 0) {
                    setActiveSeason(cached.seasons[0]);
                    if (!cached.seasons[0].episodes) {
                        loadEpisodes(cached.seasons[0]);
                    }
                }
                setLoading(false);
                // Background update watchlist status and rating
                checkWatchlistStatus(seriesId);
                loadUserRating(seriesId);
                return;
            }

            console.log('[Series] Loading series data for:', seriesId);

            // OPTIMISATION: Utiliser la méthode batch pour récupérer série, saisons et watchlist en parallèle
            const { series, seasons: seasonsData, isInWatchlist: watchlistStatus } = await api.getSeriesWithSeasons(seriesId);

            if (!series) {
                setError('Série introuvable');
                setLoading(false);
                return;
            }

            setSeriesData(series);
            setIsInWatchlist(watchlistStatus);

            // Charger le rating en arrière-plan
            loadUserRating(seriesId);

            if (seasonsData && Array.isArray(seasonsData)) {
                const sortedSeasons = seasonsData.sort(
                    (a: Season, b: Season) => a.season_number - b.season_number
                );
                setSeasons(sortedSeasons);

                // Charger les épisodes de la première saison
                if (sortedSeasons.length > 0) {
                    setActiveSeason(sortedSeasons[0]);
                    await loadEpisodes(sortedSeasons[0]);
                }

                // Mettre en cache
                cacheService.set(cacheKey, { series, seasons: sortedSeasons }, 30);
                console.log('[Series] ✅ Data loaded and cached');
            }

            setLoading(false);
        } catch (error) {
            console.error('[Series] Error loading data:', error);
            setError('Erreur lors du chargement de la série');
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) {
            loadSeriesData(id);
        }
    }, [id]);

    const loadUserRating = async (seriesId: string) => {
        try {
            const api = await ensureCrunchyApi();
            const data = await api.getUserRating(seriesId, 'series');
            if (data && data.rating) {
                setUserRating(data.rating); // e.g., "5s", "4s"
            }
        } catch (e) {
            console.error('[Series] Error loading user rating:', e);
        }
    };

    const handleRate = async (ratingVal: number) => {
        if (!id) return;
        try {
            const ratingString = `${ratingVal}s`;
            // Optimistic update
            setUserRating(ratingString);
            const api = await ensureCrunchyApi();
            await api.updateUserRating(id, ratingString, 'series');
            console.log('[Series] Rating updated:', ratingString);
        } catch (e) {
            console.error('[Series] Error updating rating:', e);
        }
    };

    const renderInteractiveStars = () => {
        const currentVal = userRating ? parseInt(userRating.replace('s', '')) : 0;
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            stars.push(
                <Star
                    key={i}
                    fill={i <= currentVal ? "var(--color-primary)" : "none"}
                    color="var(--color-primary)"
                    size={24}
                    style={{ cursor: 'pointer', marginRight: '4px' }}
                    onClick={() => handleRate(i)}
                />
            );
        }
        return <div style={{ display: 'flex', alignItems: 'center', marginTop: '0.5rem' }}>{stars}</div>;
    };

    const checkWatchlistStatus = async (seriesId: string) => {
        try {
            const api = await ensureCrunchyApi();
            const inWatchlist = await api.isInWatchlist(seriesId);
            setIsInWatchlist(inWatchlist);
            console.log('[Series] Watchlist status:', inWatchlist);
        } catch (error) {
            console.error('[Series] Error checking watchlist:', error);
        }
    };

    const loadEpisodes = async (season: Season) => {
        try {
            // Vérifier le cache des épisodes
            const episodeCacheKey = `episodes_${season.id}`;
            const cachedEpisodes = cacheService.get<Episode[]>(episodeCacheKey);

            if (cachedEpisodes && cachedEpisodes.length > 0) {
                console.log('[Series] ✅ Using cached episodes for season:', season.season_number);
                updateSeasonEpisodes(season.id, cachedEpisodes);

                // Refresh playheads even if cached (progress might have changed)
                refreshPlayheads(season.id, cachedEpisodes);
                return cachedEpisodes;
            }

            console.log('[Series] Loading episodes for season:', season.id);

            // Marquer la saison comme en chargement AVANT la requête
            updateSeasonLoadingState(season.id, true);

            const api = await ensureCrunchyApi();
            const episodes = await api.getEpisodes(season.id);
            if (episodes && Array.isArray(episodes)) {
                const sortedEpisodes = episodes.sort(
                    (a: Episode, b: Episode) => a.episode_number - b.episode_number
                );

                // Récupérer les playheads (progression de lecture)
                const episodeIds = sortedEpisodes.map((ep: Episode) => ep.id);
                const playheads = await api.getPlayheads(episodeIds);

                // Fusionner les playheads
                const episodesWithProgress = sortedEpisodes.map((ep: Episode) => ({
                    ...ep,
                    playhead: playheads[ep.id]?.playhead || 0,
                    fully_watched: playheads[ep.id]?.fully_watched || false
                }));

                // Mettre en cache les épisodes
                cacheService.set(episodeCacheKey, episodesWithProgress, 30);
                updateSeasonEpisodes(season.id, episodesWithProgress);
                console.log(`[Series] ✅ Loaded ${episodesWithProgress.length} episodes with progress`);
                return episodesWithProgress;
            }

            updateSeasonLoadingState(season.id, false);
            return null;
        } catch (error) {
            console.error('[Series] Error loading episodes:', error);
            updateSeasonLoadingState(season.id, false);
            return null;
        }
    };

    const updateSeasonEpisodes = (seasonId: string, episodes: Episode[]) => {
        setSeasons(prev => prev.map(s =>
            s.id === seasonId ? { ...s, episodes, isLoading: false } : s
        ));
        setActiveSeason(prev => {
            if (prev?.id === seasonId) {
                return { ...prev, episodes, isLoading: false };
            }
            return prev;
        });
    };

    const updateSeasonLoadingState = (seasonId: string, isLoading: boolean) => {
        setSeasons(prev => prev.map(s =>
            s.id === seasonId ? { ...s, isLoading } : s
        ));
        setActiveSeason(prev => {
            if (prev?.id === seasonId) {
                return { ...prev, isLoading };
            }
            return prev;
        });
    };

    const refreshPlayheads = async (seasonId: string, episodes: Episode[]) => {
        try {
            const episodeIds = episodes.map(ep => ep.id);
            const api = await ensureCrunchyApi();
            const playheads = await api.getPlayheads(episodeIds);

            if (Object.keys(playheads).length > 0) {
                setSeasons(prev => prev.map(s => {
                    if (s.id === seasonId && s.episodes) {
                        return {
                            ...s,
                            episodes: s.episodes.map(ep => ({
                                ...ep,
                                playhead: playheads[ep.id]?.playhead || ep.playhead,
                                fully_watched: playheads[ep.id]?.fully_watched || ep.fully_watched
                            }))
                        };
                    }
                    return s;
                }));

                // Update active if needed
                setActiveSeason(prev => {
                    if (prev?.id === seasonId && prev.episodes) {
                        return {
                            ...prev,
                            episodes: prev.episodes.map(ep => ({
                                ...ep,
                                playhead: playheads[ep.id]?.playhead || ep.playhead,
                                fully_watched: playheads[ep.id]?.fully_watched || ep.fully_watched
                            }))
                        };
                    }
                    return prev;
                });
            }
        } catch (e) { console.warn('Playhead refresh failed', e); }
    };

    const handleSeasonChange = async (season: Season) => {
        // Immédiatement mettre à jour la saison active avec état de chargement
        setActiveSeason({ ...season, isLoading: true, episodes: undefined });

        // Charger les épisodes
        await loadEpisodes(season);
    };

    const handleAddToWatchlist = async () => {
        if (!id) return;

        try {
            setWatchlistLoading(true);
            const api = await ensureCrunchyApi();

            if (isInWatchlist) {
                // Retirer de la watchlist
                const result = await api.removeFromWatchlist(id);
                if (result.success) {
                    setIsInWatchlist(false);
                    console.log('[Series] ✅ Série retirée de la watchlist');
                }
            } else {
                // Ajouter à la watchlist
                const result = await api.addToWatchlist(id);
                if (result.success) {
                    setIsInWatchlist(true);
                    console.log('[Series] ✅ Série ajoutée à la watchlist');
                } else {
                    console.error('[Series] Échec de l\'ajout:', result.error);
                }
            }
        } catch (error) {
            console.error('[Series] Erreur watchlist:', error);
        } finally {
            setWatchlistLoading(false);
        }
    };

    const formatSeasonTitle = (seasonTitle: string, seriesTitle?: string) => {
        if (!seriesTitle) return seasonTitle;

        // Enlever le nom de la série du titre de la saison
        let formatted = seasonTitle.replace(seriesTitle, '').trim();

        // Enlever les caractères de ponctuation au début (comme ":")
        formatted = formatted.replace(/^[:\-–—,]\s*/, '');

        // Si le titre est vide ou trop court, utiliser juste "Season X"
        if (!formatted || formatted.length < 3) {
            return seasonTitle;
        }

        return formatted;
    };

    const formatDuration = (ms?: number) => {
        if (!ms) return '24:00';
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const getMaturityRating = () => {
        const ratings = seriesData?.series_metadata?.maturity_ratings;
        if (!ratings || ratings.length === 0) return 'TV-14';
        return ratings[0];
    };

    const getBackgroundImage = () => {
        return seriesData?.images?.poster_wide?.[0]?.[0]?.source
            || seriesData?.images?.poster_tall?.[0]?.[0]?.source
            || 'https://images.alphacoders.com/132/1328678.jpeg';
    };

    const renderStars = (rating?: number) => {
        if (!rating) return null;
        const fullStars = Math.floor(rating);
        const stars = [];

        for (let i = 0; i < 5; i++) {
            stars.push(
                <Star
                    key={i}
                    fill={i < fullStars ? "var(--color-primary)" : "none"}
                    color="var(--color-primary)"
                    size={18}
                />
            );
        }

        return stars;
    };

    if (loading) {
        return (
            <div className="series-page">
                <Navbar />
                <PageLoader message="Chargement de la série..." />
            </div>
        );
    }

    if (error || !seriesData) {
        return (
            <div className="series-page">
                <Navbar />
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '60vh',
                    textAlign: 'center',
                    padding: '2rem'
                }}>
                    <h2 style={{ color: 'var(--color-text-primary)', marginBottom: '1rem' }}>
                        {error || 'Série introuvable'}
                    </h2>
                    <button
                        className="btn-primary"
                        onClick={() => navigate('/')}
                        style={{ marginTop: '1rem' }}
                    >
                        <ArrowLeft size={20} />
                        Retour à l'accueil
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="series-page">
            <Navbar />
            <div className="series-header" style={{ backgroundImage: `url(${getBackgroundImage()})` }}>
                <div className="header-overlay"></div>

                <button className="back-btn" onClick={() => navigate('/discover')}>
                    <ArrowLeft size={20} />
                    Back
                </button>

                <div className="header-content bc-container">
                    <div className="series-badge">
                        {seriesData.series_metadata?.is_subbed && seriesData.series_metadata?.is_dubbed ? (
                            <>SUB & DUB AVAILABLE</>
                        ) : seriesData.series_metadata?.is_dubbed ? (
                            <>DUB AVAILABLE</>
                        ) : (
                            <>SUB AVAILABLE</>
                        )}
                    </div>

                    <h1 className="series-title">{seriesData.title}</h1>

                    <div className="series-meta">
                        {seriesData.rating?.average && (
                            <div className="rating">
                                {renderStars(seriesData.rating.average)}
                                <span className="rating-value">{seriesData.rating.average.toFixed(1)}</span>
                                {seriesData.rating.total && (
                                    <span className="rating-votes">({seriesData.rating.total} votes)</span>
                                )}
                            </div>
                        )}
                        {/* Interactive User Rating */}
                        <div className="user-rating-section" style={{ display: 'flex', flexDirection: 'column', marginLeft: '2rem' }}>
                            <span style={{ fontSize: '0.8rem', color: '#aaa' }}>YOUR RATING</span>
                            {renderInteractiveStars()}
                        </div>
                        <span className="badge">{getMaturityRating()}</span>
                        {seriesData.series_metadata?.season_count && (
                            <span className="badge">
                                {seriesData.series_metadata.season_count} Season{seriesData.series_metadata.season_count > 1 ? 's' : ''}
                            </span>
                        )}
                        {seriesData.series_metadata?.episode_count && (
                            <span className="badge">
                                {seriesData.series_metadata.episode_count} Episodes
                            </span>
                        )}
                    </div>

                    {seriesData.description && (
                        <p className="series-description">{seriesData.description}</p>
                    )}

                    <div className="series-actions">
                        <button className="btn-primary" onClick={() => {
                            // Naviguer vers le premier épisode de la première saison
                            if (activeSeason?.episodes && activeSeason.episodes.length > 0) {
                                window.location.href = `https://www.crunchyroll.com/watch/${activeSeason.episodes[0].id}`;
                            }
                        }}>
                            <Play fill="currentColor" size={20} />
                            START WATCHING
                        </button>
                        <button
                            className={`btn-secondary ${isInWatchlist ? 'added' : ''}`}
                            onClick={handleAddToWatchlist}
                            disabled={watchlistLoading}
                        >
                            <Bookmark size={20} fill={isInWatchlist ? "currentColor" : "none"} />
                            {isInWatchlist ? 'IN MY LIST' : 'ADD TO LIST'}
                        </button>
                        <button className="btn-icon">
                            <Share2 size={20} />
                        </button>
                        <button
                            className="btn-icon"
                            title="View on AniList (Coming Soon)"
                            style={{ opacity: 0.7, cursor: 'not-allowed' }}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 190 190"
                                width="20"
                                height="20"
                                fill="currentColor"
                            >
                                <path d="M86.4 49.2l-65.5 113.3h40.7l11.2-19.7L93.6 98l-7.2-48.8zM154.1 162.5h-35.8L79.2 56.3l-5.9 10.3L0 56.3h35.8l39.1 106.2 5.9-10.3 73.3-0.7z" />
                                <circle cx="134.6" cy="157" r="16.7" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            <div className="series-content bc-container">
                {seasons.length > 0 && (
                    <div className="seasons-tabs">
                        {seasons.map(season => (
                            <button
                                key={season.id}
                                className={`season-tab ${activeSeason?.id === season.id ? 'active' : ''}`}
                                onClick={() => handleSeasonChange(season)}
                            >
                                {formatSeasonTitle(season.title, seriesData.title)}
                            </button>
                        ))}
                    </div>
                )}

                <div className="episodes-grid">
                    {activeSeason?.isLoading ? (
                        <div style={{
                            gridColumn: '1 / -1',
                            textAlign: 'center',
                            padding: '3rem',
                            color: 'var(--color-text-secondary)'
                        }}>
                            <PageLoader message="Chargement des épisodes..." />
                        </div>
                    ) : activeSeason?.episodes && activeSeason.episodes.length > 0 ? (
                        activeSeason.episodes.map((episode) => (
                            <div key={episode.id} className={`episode-card ${episode.fully_watched ? 'watched' : ''}`} onClick={() => {
                                window.location.href = `https://www.crunchyroll.com/watch/${episode.id}`;
                            }}>
                                <div className="episode-thumbnail">
                                    <img
                                        src={episode.images?.thumbnail?.[0]?.[0]?.source || getBackgroundImage()}
                                        alt={episode.title}
                                    />
                                    <div className="play-overlay">
                                        <Play fill="currentColor" size={32} />
                                    </div>
                                    <div className="episode-duration">
                                        <Clock size={12} style={{ marginRight: '4px' }} />
                                        {formatDuration(episode.duration_ms)}
                                    </div>
                                    {episode.is_premium_only && (
                                        <div className="premium-badge">PREMIUM</div>
                                    )}
                                    {/* Progress Bar */}
                                    {episode.playhead && episode.duration_ms && episode.playhead > 0 && !episode.fully_watched && (
                                        <div className="episode-progress">
                                            <div
                                                className="progress-fill"
                                                style={{ width: `${Math.min(100, (episode.playhead / (episode.duration_ms / 1000)) * 100)}%` }}
                                            />
                                        </div>
                                    )}
                                    {episode.fully_watched && (
                                        <div className="watched-badge">V</div>
                                    )}
                                </div>
                                <div className="episode-info">
                                    <h4>Episode {episode.episode_number}</h4>
                                    <p>{episode.title || episode.episode}</p>
                                    {episode.description && (
                                        <p className="episode-description">{episode.description}</p>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div style={{
                            gridColumn: '1 / -1',
                            textAlign: 'center',
                            padding: '3rem',
                            color: 'var(--color-text-secondary)'
                        }}>
                            <h3>Aucun épisode disponible</h3>
                        </div>
                    )}
                </div>
            </div>

            <footer style={{ padding: '4rem 2rem', textAlign: 'center', color: '#666', borderTop: '1px solid #222', marginTop: '4rem' }}>
                <div className="bc-container">
                    <p>&copy; 2024 BetterCrunchyroll. A Premium Redesign Concept.</p>
                </div>
            </footer>
        </div>
    );
};

export default Series;

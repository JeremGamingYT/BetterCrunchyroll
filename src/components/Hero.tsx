import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Bookmark, Clock } from 'lucide-react';
import { cacheService } from '../services/cacheService';
import './Hero.scss';

interface HeroSlide {
    id: string;
    title: string;
    description: string;
    image: string;
    tags: string[];
    releaseDate?: Date;
    episodeTitle?: string;
    episodeNumber?: string;
}

interface HeroProps {
    onLoadComplete?: () => void;
}

const getCurrentSeasonalTag = (): string => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    let season: string;
    if (month >= 1 && month <= 3) {
        season = 'winter';
    } else if (month >= 4 && month <= 6) {
        season = 'spring';
    } else if (month >= 7 && month <= 9) {
        season = 'summer';
    } else {
        season = 'fall';
    }

    return `${season}-${year}`;
};

const getTimeUntil = (targetDate: Date): string => {
    const now = new Date();
    const diff = targetDate.getTime() - now.getTime();

    if (diff <= 0) return 'Disponible maintenant';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
        return `Dans ${days}j ${hours}h`;
    } else if (hours > 0) {
        return `Dans ${hours}h ${minutes}m`;
    } else {
        return `Dans ${minutes}m`;
    }
};

const isUpcoming = (dateString: string): boolean => {
    const releaseDate = new Date(dateString);
    const now = new Date();
    const in7Days = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));

    return releaseDate > now && releaseDate <= in7Days;
};

// Fonction pour attendre (throttling)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const Hero = ({ onLoadComplete }: HeroProps) => {
    const [current, setCurrent] = useState(0);
    const [slides, setSlides] = useState<HeroSlide[]>([]);
    const [loading, setLoading] = useState(true);
    const [, setTick] = useState(0);

    useEffect(() => {
        loadUpcomingReleases();
    }, []);

    useEffect(() => {
        if (slides.length === 0) return;

        const timer = setInterval(() => {
            setCurrent((prev) => (prev + 1) % slides.length);
        }, 8000);
        return () => clearInterval(timer);
    }, [slides.length]);

    useEffect(() => {
        const ticker = setInterval(() => {
            setTick(prev => prev + 1);
        }, 60000);
        return () => clearInterval(ticker);
    }, []);

    const loadUpcomingReleases = async () => {
        try {
            // 1. Vérifier le cache d'abord
            const cachedSlides = cacheService.get<HeroSlide[]>('heroSlides');
            if (cachedSlides && cachedSlides.length > 0) {
                console.log('[Hero] ✅ Using cached slides');
                setSlides(cachedSlides);
                setLoading(false);
                onLoadComplete?.();
                return;
            }

            const api = (window as any).crunchyAPI;
            if (!api) {
                console.error('[Hero] window.crunchyAPI not available');
                setLoading(false);
                onLoadComplete?.();
                return;
            }

            const currentSeason = getCurrentSeasonalTag();
            console.log(`[Hero] Loading upcoming releases for ${currentSeason}`);

            const seasonalData = await api.browse({
                type: 'series',
                seasonal_tag: currentSeason,
                limit: 20  // Réduit de 50 à 20
            });

            if (!seasonalData?.data) {
                console.warn('[Hero] No seasonal data');
                setLoading(false);
                onLoadComplete?.();
                return;
            }

            const upcomingReleases: HeroSlide[] = [];
            let requestCount = 0;
            const MAX_REQUESTS = 10; // Limite stricte de requêtes

            // Parcourir seulement les 10 premières séries au lieu de 30
            for (const series of seasonalData.data.slice(0, 10)) {
                try {
                    // Limite de sécurité
                    if (requestCount >= MAX_REQUESTS) {
                        console.log('[Hero] ⚠️ Max requests reached, stopping');
                        break;
                    }

                    // Throttling : 100ms entre chaque requête
                    if (requestCount > 0) {
                        await delay(100);
                    }

                    requestCount++;
                    const seasonsData = await api.api.getSeasons(series.id);
                    if (!seasonsData || seasonsData.length === 0) continue;

                    const latestSeason = seasonsData[0];

                    // Throttling avant la prochaine requête
                    await delay(100);
                    requestCount++;

                    const episodesData = await api.api.getEpisodes(latestSeason.id);
                    if (!episodesData) continue;

                    const upcomingEpisode = episodesData.find((ep: any) =>
                        ep.episode_metadata?.premium_available_date &&
                        isUpcoming(ep.episode_metadata.premium_available_date)
                    );

                    if (upcomingEpisode) {
                        const categories = series.series_metadata?.tenant_categories || [];
                        const poster = series.images?.poster_wide?.[0]?.[0]?.source || '';
                        const releaseDate = new Date(upcomingEpisode.episode_metadata.premium_available_date);

                        upcomingReleases.push({
                            id: series.id,
                            title: series.title,
                            description: series.description || 'Prochain épisode bientôt disponible !',
                            image: poster,
                            tags: categories.slice(0, 3),
                            releaseDate: releaseDate,
                            episodeTitle: upcomingEpisode.title || '',
                            episodeNumber: upcomingEpisode.episode_metadata?.episode_number?.toString() || ''
                        });

                        console.log(`[Hero] ✅ Found upcoming: ${series.title} - Ep ${upcomingEpisode.episode_metadata?.episode_number}`);
                    }

                    // Arrêter dès qu'on a 5 slides
                    if (upcomingReleases.length >= 5) break;
                } catch (error) {
                    console.warn(`[Hero] Error checking series ${series.id}:`, error);
                }
            }

            console.log(`[Hero] 📊 Made ${requestCount} API requests`);

            upcomingReleases.sort((a, b) => {
                const dateA = a.releaseDate?.getTime() || 0;
                const dateB = b.releaseDate?.getTime() || 0;
                return dateA - dateB;
            });

            let finalSlides: HeroSlide[] = [];

            if (upcomingReleases.length > 0) {
                finalSlides = upcomingReleases;
                console.log(`[Hero] 🎯 Loaded ${upcomingReleases.length} upcoming releases`);
            } else {
                console.log('[Hero] No upcoming releases, using seasonal series');
                finalSlides = seasonalData.data.slice(0, 5).map((series: any) => ({
                    id: series.id,
                    title: series.title,
                    description: series.description || '',
                    image: series.images?.poster_wide?.[0]?.[0]?.source || '',
                    tags: (series.series_metadata?.tenant_categories || []).slice(0, 3)
                }));
            }

            // Mettre en cache pour 60 minutes
            cacheService.set('heroSlides', finalSlides, 60);
            setSlides(finalSlides);
            setLoading(false);
            onLoadComplete?.();
        } catch (error) {
            console.error('[Hero] Error loading upcoming releases:', error);
            setLoading(false);
            onLoadComplete?.();
        }
    };

    if (loading || slides.length === 0) {
        return (
            <div className="hero" style={{ minHeight: '600px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ color: '#888' }}>Chargement du carousel...</p>
            </div>
        );
    }

    return (
        <div className="hero">
            <AnimatePresence mode='wait'>
                <motion.div
                    key={current}
                    className="hero-background"
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    <img src={slides[current].image} alt={slides[current].title} />
                    <div className="gradient-overlay"></div>
                    <div className="gradient-overlay-bottom"></div>
                </motion.div>
            </AnimatePresence>

            <div className="hero-content bc-container">
                <AnimatePresence mode='wait'>
                    <motion.div
                        key={current}
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 50 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="slide-info"
                    >
                        {slides[current].releaseDate && (
                            <div className="release-countdown">
                                <Clock size={16} />
                                <span className="countdown-time">
                                    {getTimeUntil(slides[current].releaseDate!)}
                                </span>
                                <span className="separator">|</span>
                                <span className="episode-info">
                                    {slides[current].episodeNumber && `Épisode ${slides[current].episodeNumber}`}
                                    {slides[current].episodeTitle && slides[current].episodeNumber && ' - '}
                                    {slides[current].episodeTitle}
                                </span>
                            </div>
                        )}

                        <h1 className="title">{slides[current].title}</h1>

                        <div className="tags">
                            {slides[current].tags.map(tag => (
                                <span key={tag} className="tag">{tag}</span>
                            ))}
                        </div>

                        <p className="description">{slides[current].description}</p>

                        <div className="actions">
                            <button className="btn-primary">
                                <Play fill="currentColor" size={20} /> Watch Now
                            </button>
                            <button className="btn-secondary">
                                <Bookmark size={20} /> Add to Watchlist
                            </button>
                        </div>
                    </motion.div>
                </AnimatePresence>

                <div className="indicators">
                    {slides.map((_, index) => (
                        <div
                            key={index}
                            className={`indicator ${index === current ? 'active' : ''}`}
                            onClick={() => setCurrent(index)}
                        >
                            <div className="progress-bar">
                                {index === current && (
                                    <motion.div
                                        className="progress-fill"
                                        initial={{ width: "0%" }}
                                        animate={{ width: "100%" }}
                                        transition={{ duration: 8, ease: "linear" }}
                                    />
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Hero;

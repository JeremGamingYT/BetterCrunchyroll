import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Plus, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cacheService } from '../services/cacheService';
import { ensureCrunchyApi } from '../utils/apiInstance';
import './Hero.scss';

interface HeroItem {
    id: string;
    title: string;
    description: string;
    image: string;
    tags: string[];
    type?: 'series' | 'movie_listing';
    episodeId?: string;
}

interface HeroProps {
    onLoadComplete?: () => void;
}

const Hero = ({ onLoadComplete }: HeroProps) => {
    const navigate = useNavigate();
    const [heroItems, setHeroItems] = useState<HeroItem[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [watchlistStatus, setWatchlistStatus] = useState<Record<string, boolean>>({});
    const [watchlistLoading, setWatchlistLoading] = useState<Record<string, boolean>>({});
    const autoplayRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const progressRef = useRef<number>(0);
    const [progress, setProgress] = useState(0);
    const AUTOPLAY_DURATION = 8000; // 8 seconds per slide

    // Load hero items from API
    const loadHeroItems = useCallback(async () => {
        try {
            // Check cache first
            const cached = cacheService.get<HeroItem[]>('heroItems');
            if (cached && cached.length > 0) {
                console.log('[Hero] ✅ Using cached hero items');
                setHeroItems(cached);
                setIsLoading(false);
                onLoadComplete?.();
                // Check watchlist status in background
                checkAllWatchlistStatus(cached);
                return;
            }

            // Initialize API
            const api = await ensureCrunchyApi();

            // Fetch popular/trending series for the carousel
            const browseData = await api.browse({
                type: 'series',
                limit: 10
            });

            if (browseData?.data && browseData.data.length > 0) {
                const formatted: HeroItem[] = browseData.data.slice(0, 5).map((series: any) => ({
                    id: series.id,
                    title: series.title,
                    description: series.description || '',
                    image: series.images?.poster_wide?.[0]?.[series.images.poster_wide[0].length - 1]?.source
                        || series.images?.poster_wide?.[0]?.[0]?.source
                        || series.images?.poster_tall?.[0]?.[0]?.source
                        || '',
                    tags: [
                        series.series_metadata?.is_simulcast ? 'Simulcast' : null,
                        series.series_metadata?.is_dubbed && series.series_metadata?.is_subbed
                            ? 'Sub & Dub'
                            : series.series_metadata?.is_dubbed
                                ? 'Dub'
                                : 'Sub',
                        series.series_metadata?.maturity_ratings?.[0] || null
                    ].filter(Boolean) as string[],
                    type: 'series'
                }));

                setHeroItems(formatted);
                cacheService.set('heroItems', formatted, 30); // Cache for 30 minutes
                console.log('[Hero] ✅ Loaded', formatted.length, 'hero items');

                // Check watchlist status
                checkAllWatchlistStatus(formatted, api);
            }
        } catch (error) {
            console.error('[Hero] Error loading hero items:', error);
            // Use fallback items if API fails
            setHeroItems([{
                id: 'fallback',
                title: 'Welcome to BetterCrunchyroll',
                description: 'Discover your next favorite anime with our redesigned experience.',
                image: 'https://images3.alphacoders.com/133/1332803.jpeg',
                tags: ['Premium', 'Exclusive'],
                type: 'series'
            }]);
        } finally {
            setIsLoading(false);
            onLoadComplete?.();
        }
    }, [onLoadComplete]);

    // Check watchlist status for all items
    const checkAllWatchlistStatus = async (items: HeroItem[], apiInstance?: any) => {
        try {
            const api = apiInstance || await ensureCrunchyApi();
            const statusMap: Record<string, boolean> = {};
            for (const item of items) {
                if (item.id && item.id !== 'fallback') {
                    try {
                        const inWatchlist = await api.isInWatchlist(item.id);
                        statusMap[item.id] = inWatchlist;
                    } catch {
                        statusMap[item.id] = false;
                    }
                }
            }
            setWatchlistStatus(statusMap);
        } catch (error) {
            console.error('[Hero] Error checking watchlist status:', error);
        }
    };

    // Autoplay logic
    useEffect(() => {
        if (heroItems.length <= 1) return;

        const startAutoplay = () => {
            progressRef.current = 0;
            setProgress(0);

            const interval = 50; // Update every 50ms for smooth progress
            const increment = (interval / AUTOPLAY_DURATION) * 100;

            autoplayRef.current = setInterval(() => {
                progressRef.current += increment;
                setProgress(progressRef.current);

                if (progressRef.current >= 100) {
                    setCurrentIndex(prev => (prev + 1) % heroItems.length);
                    progressRef.current = 0;
                    setProgress(0);
                }
            }, interval);
        };

        startAutoplay();

        return () => {
            if (autoplayRef.current) {
                clearInterval(autoplayRef.current);
            }
        };
    }, [heroItems.length, currentIndex]);

    // Load items on mount
    useEffect(() => {
        loadHeroItems();
    }, [loadHeroItems]);

    // Handle slide change
    const goToSlide = (index: number) => {
        setCurrentIndex(index);
        progressRef.current = 0;
        setProgress(0);
    };

    // Handle Watch Now button
    const handleWatchNow = async () => {
        const currentItem = heroItems[currentIndex];
        if (!currentItem || currentItem.id === 'fallback') return;

        try {
            // Get the up next episode for this series
            const api = await ensureCrunchyApi();
            const upNext = await api.getUpNext(currentItem.id);
            if (upNext?.panel?.id) {
                // Navigate to the episode watch page
                window.location.href = `https://www.crunchyroll.com/watch/${upNext.panel.id}`;
            } else {
                // If no up next, go to series page
                navigate(`/series/${currentItem.id}`);
            }
        } catch (error) {
            console.error('[Hero] Error getting up next:', error);
            // Fallback to series page
            navigate(`/series/${currentItem.id}`);
        }
    };

    // Handle Add to Watchlist button
    const handleAddToWatchlist = async () => {
        const currentItem = heroItems[currentIndex];
        if (!currentItem || currentItem.id === 'fallback') return;

        const seriesId = currentItem.id;
        const isCurrentlyInWatchlist = watchlistStatus[seriesId];

        try {
            setWatchlistLoading(prev => ({ ...prev, [seriesId]: true }));

            const api = await ensureCrunchyApi();

            if (isCurrentlyInWatchlist) {
                // Remove from watchlist
                const result = await api.removeFromWatchlist(seriesId);
                if (result.success) {
                    setWatchlistStatus(prev => ({ ...prev, [seriesId]: false }));
                    console.log('[Hero] ✅ Removed from watchlist');
                }
            } else {
                // Add to watchlist
                const result = await api.addToWatchlist(seriesId);
                if (result.success) {
                    setWatchlistStatus(prev => ({ ...prev, [seriesId]: true }));
                    console.log('[Hero] ✅ Added to watchlist');
                }
            }
        } catch (error) {
            console.error('[Hero] Error updating watchlist:', error);
        } finally {
            setWatchlistLoading(prev => ({ ...prev, [seriesId]: false }));
        }
    };

    if (isLoading || heroItems.length === 0) {
        return (
            <div className="hero">
                <div className="hero-background">
                    <div className="gradient-overlay"></div>
                    <div className="gradient-overlay-bottom"></div>
                </div>
            </div>
        );
    }

    const currentItem = heroItems[currentIndex];
    const isInWatchlist = watchlistStatus[currentItem.id] || false;
    const isWatchlistUpdating = watchlistLoading[currentItem.id] || false;

    return (
        <div className="hero">
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentIndex}
                    className="hero-background"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <img
                        src={currentItem.image}
                        alt={currentItem.title}
                        onLoad={() => onLoadComplete?.()}
                    />
                    <div className="gradient-overlay"></div>
                    <div className="gradient-overlay-bottom"></div>
                </motion.div>
            </AnimatePresence>

            <div className="hero-content bc-container">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentIndex}
                        className="slide-info"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -30 }}
                        transition={{ duration: 0.5 }}
                    >
                        <h1 className="title">{currentItem.title}</h1>

                        <div className="tags">
                            {currentItem.tags.map((tag, idx) => (
                                <span key={idx} className="tag">{tag}</span>
                            ))}
                        </div>

                        <p className="description">{currentItem.description}</p>

                        <div className="actions">
                            <button
                                className="btn-primary"
                                onClick={handleWatchNow}
                            >
                                <Play fill="currentColor" size={20} />
                                Watch Now
                            </button>
                            <button
                                className="btn-secondary"
                                onClick={handleAddToWatchlist}
                                disabled={isWatchlistUpdating}
                            >
                                {isInWatchlist ? (
                                    <>
                                        <Check size={20} />
                                        In My List
                                    </>
                                ) : (
                                    <>
                                        <Plus size={20} />
                                        Add to List
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                </AnimatePresence>

                {/* Carousel Indicators */}
                {heroItems.length > 1 && (
                    <div className="indicators">
                        {heroItems.map((_, idx) => (
                            <div
                                key={idx}
                                className={`indicator ${idx === currentIndex ? 'active' : ''}`}
                                onClick={() => goToSlide(idx)}
                            >
                                <div className="progress-bar">
                                    {idx === currentIndex && (
                                        <motion.div
                                            className="progress-fill"
                                            style={{ width: `${progress}%` }}
                                        />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Hero;

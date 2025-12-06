import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Maximize, Minimize } from 'lucide-react';
import './Watch.scss';

const Watch = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const containerRef = useRef<HTMLDivElement>(null);

    const [showControls, setShowControls] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [episodeInfo, setEpisodeInfo] = useState<any>(null);
    const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        // Load episode info
        if (id) {
            loadEpisodeInfo(id);
        }

        // Listen for fullscreen changes
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);

        // Make the native Crunchyroll player visible
        showNativePlayer();

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, [id]);

    const showNativePlayer = () => {
        // Find and style the native Crunchyroll video player
        const findPlayer = () => {
            const selectors = [
                '#vilos-player',
                '.vilos-player',
                '[data-testid="vilos-player"]',
                '.erc-watch-video-player',
                '.video-player-container',
                '.erc-current-media-player',
                '#player0',
                '.css-1dbjc4n[data-testid="vilos-player"]'
            ];

            for (const selector of selectors) {
                const element = document.querySelector(selector);
                if (element) {
                    return element as HTMLElement;
                }
            }

            // Try to find by video element
            const videos = document.querySelectorAll('video');
            for (const video of videos) {
                if (video.src || video.querySelector('source')) {
                    return video.closest('div[class*="player"]') as HTMLElement || video.parentElement;
                }
            }

            return null;
        };

        const stylePlayer = (player: HTMLElement) => {
            player.style.cssText = `
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                z-index: 1 !important;
                background: #000 !important;
            `;

            // Also style the video element inside
            const video = player.querySelector('video');
            if (video) {
                video.style.cssText = `
                    width: 100% !important;
                    height: 100% !important;
                    object-fit: contain !important;
                `;
            }

            console.log('[Watch] Native player styled:', player);
        };

        // Try to find player immediately and with retries
        let attempts = 0;
        const maxAttempts = 20;

        const tryFindPlayer = () => {
            const player = findPlayer();
            if (player) {
                stylePlayer(player);
            } else if (attempts < maxAttempts) {
                attempts++;
                setTimeout(tryFindPlayer, 500);
            }
        };

        tryFindPlayer();
    };

    const loadEpisodeInfo = async (episodeId: string) => {
        try {
            const api = (window as any).crunchyAPI?.api;
            if (api) {
                await api.initialize();
                const response = await api.get(`/content/v2/cms/objects/${episodeId}`);
                if (response?.data?.[0]) {
                    setEpisodeInfo(response.data[0]);
                }
            }
        } catch (error) {
            console.error('Error loading episode info:', error);
        }
    };

    const handleMouseMove = () => {
        setShowControls(true);
        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }
        controlsTimeoutRef.current = setTimeout(() => {
            setShowControls(false);
        }, 3000);
    };

    const toggleFullscreen = async () => {
        try {
            if (!document.fullscreenElement) {
                await document.documentElement.requestFullscreen();
            } else {
                await document.exitFullscreen();
            }
        } catch (error) {
            console.error('Fullscreen error:', error);
        }
    };

    const goBack = () => {
        // Navigate back and refresh to reset CSS
        navigate(-1);
        // Force page reload to reset the CSS hiding
        setTimeout(() => {
            window.location.reload();
        }, 100);
    };

    const episodeMeta = episodeInfo?.episode_metadata || episodeInfo;

    return (
        <div
            className="watch-page-player"
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setShowControls(false)}
        >
            {/* Top overlay with back button and episode info */}
            <div className={`player-top-overlay ${showControls ? 'visible' : ''}`}>
                <button className="back-btn" onClick={goBack}>
                    <ArrowLeft size={24} />
                </button>

                <div className="episode-info-overlay">
                    {episodeMeta && (
                        <>
                            <span className="episode-badge">
                                S{episodeMeta.season_number || '?'} E{episodeMeta.episode_number || '?'}
                            </span>
                            <h2>{episodeInfo?.title || episodeMeta?.title || 'Chargement...'}</h2>
                            {episodeMeta.series_title && (
                                <p>{episodeMeta.series_title}</p>
                            )}
                        </>
                    )}
                </div>

                <div className="top-right-controls">
                    <button onClick={toggleFullscreen} title="Plein écran">
                        {isFullscreen ? <Minimize size={22} /> : <Maximize size={22} />}
                    </button>
                </div>
            </div>

            {/* Loading indicator */}
            {!episodeInfo && (
                <div className="loading-indicator">
                    <div className="spinner"></div>
                </div>
            )}
        </div>
    );
};

export default Watch;

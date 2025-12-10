import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft,
    Maximize,
    Minimize,
    Play,
    Pause,
    Volume2,
    VolumeX,
    SkipForward,
    Settings,
    Subtitles,
    Loader2,
    RefreshCw,
    FastForward
} from 'lucide-react';
import { ensureCrunchyApi } from '../utils/apiInstance';
import './Watch.scss';

// Types
interface StreamData {
    manifestUrl: string;
    token: string;
    mediaId: string;
    subtitles: SubtitleTrack[];
}

interface SubtitleTrack {
    locale: string;
    url: string;
    format: string;
    label: string;
}

interface EpisodeData {
    id: string;
    title: string;
    description?: string;
    episode_number?: number;
    season_number?: number;
    series_id?: string;
    series_title?: string;
    duration_ms?: number;
}

interface SkipEvent {
    type: string;
    start: number;
    end: number;
}

// Shaka Player type
declare global {
    interface Window {
        shaka?: any;
    }
}

// Skip Events API
const SKIP_EVENTS_BASE = 'https://static.crunchyroll.com/skip-events/production/';
const LICENSE_URL = 'https://cr-license-proxy.prd.crunchyrollsvc.com/v1/license/widevine';

const WatchShaka = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    // Refs
    const containerRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const playerRef = useRef<any>(null);
    const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // State
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [episodeData, setEpisodeData] = useState<EpisodeData | null>(null);
    const [stream, setStream] = useState<StreamData | null>(null);
    const [skipEvents, setSkipEvents] = useState<SkipEvent[]>([]);

    // Playback state
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [buffered, setBuffered] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [isBuffering, setIsBuffering] = useState(false);
    const [showSkipButton, setShowSkipButton] = useState<SkipEvent | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [selectedSubtitle, setSelectedSubtitle] = useState<string | null>(null);

    // Load Shaka Player
    const loadShakaPlayer = useCallback(() => {
        return new Promise<void>((resolve, reject) => {
            if (window.shaka) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/shaka-player/4.7.11/shaka-player.compiled.min.js';
            script.onload = () => resolve();
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }, []);

    // Parse stream response from Crunchyroll API
    const parseStreamResponse = (data: any, mediaId: string): StreamData | null => {
        if (!data) return null;

        // Find manifest URL - prefer DASH for DRM
        let manifestUrl = '';
        const streams = data.streams || data;

        // Try to find DASH manifest with DRM
        if (streams.adaptive_dash) {
            const dashStreams = Object.values(streams.adaptive_dash) as any[];
            manifestUrl = dashStreams[0]?.url || '';
        }

        // Fallback to drm_adaptive_dash
        if (!manifestUrl && streams.drm_adaptive_dash) {
            const drmStreams = Object.values(streams.drm_adaptive_dash) as any[];
            manifestUrl = drmStreams[0]?.url || '';
        }

        // Get token for license requests
        const token = data.token || '';

        // Parse subtitles
        const subtitles: SubtitleTrack[] = [];
        if (data.subtitles) {
            Object.entries(data.subtitles).forEach(([locale, sub]: [string, any]) => {
                subtitles.push({
                    locale,
                    url: sub.url,
                    format: sub.format || 'ass',
                    label: getLanguageLabel(locale)
                });
            });
        }

        if (!manifestUrl) {
            console.warn('[WatchShaka] No manifest URL found in response');
            return null;
        }

        return {
            manifestUrl,
            token,
            mediaId,
            subtitles
        };
    };

    const getLanguageLabel = (locale: string): string => {
        const labels: Record<string, string> = {
            'en-US': 'English',
            'fr-FR': 'Français',
            'de-DE': 'Deutsch',
            'es-ES': 'Español',
            'es-419': 'Español (LA)',
            'pt-BR': 'Português',
            'it-IT': 'Italiano',
            'ru-RU': 'Русский',
            'ar-SA': 'العربية',
            'ja-JP': '日本語'
        };
        return labels[locale] || locale;
    };

    // Initialize Shaka Player with DRM
    const initializePlayer = useCallback(async (streamData: StreamData) => {
        if (!videoRef.current || !window.shaka) return;

        try {
            // Install polyfills
            window.shaka.polyfill.installAll();

            // Check browser support
            if (!window.shaka.Player.isBrowserSupported()) {
                throw new Error('Browser does not support Shaka Player');
            }

            // Create player
            const player = new window.shaka.Player(videoRef.current);
            playerRef.current = player;

            // Configure DRM
            player.configure({
                drm: {
                    servers: {
                        'com.widevine.alpha': LICENSE_URL,
                    },
                    advanced: {
                        'com.widevine.alpha': {
                            videoRobustness: 'SW_SECURE_CRYPTO',
                            audioRobustness: 'SW_SECURE_CRYPTO',
                        }
                    }
                },
                streaming: {
                    bufferingGoal: 30,
                    rebufferingGoal: 2,
                }
            });

            // Add license request filter to add auth headers
            player.getNetworkingEngine().registerRequestFilter((type: any, request: any) => {
                if (type === window.shaka.net.NetworkingEngine.RequestType.LICENSE) {
                    request.headers['X-Cr-Content-Id'] = streamData.mediaId;
                    request.headers['X-Cr-Video-Token'] = streamData.token;
                }
            });

            // Error handling
            player.addEventListener('error', (event: any) => {
                console.error('[WatchShaka] Player error:', event.detail);
                setError(`Player error: ${event.detail.message || 'Unknown error'}`);
            });

            // Buffering
            player.addEventListener('buffering', (event: any) => {
                setIsBuffering(event.buffering);
            });

            // Load manifest
            console.log('[WatchShaka] Loading manifest:', streamData.manifestUrl);
            await player.load(streamData.manifestUrl);
            console.log('[WatchShaka] Manifest loaded successfully');

            setLoading(false);
            setError(null);

        } catch (err: any) {
            console.error('[WatchShaka] Failed to initialize player:', err);
            setError(err.message || 'Failed to initialize player');
            setLoading(false);
        }
    }, []);

    // Load episode and stream data
    const loadEpisodeData = useCallback(async (episodeId: string) => {
        setLoading(true);
        setError(null);

        try {
            // Load Shaka Player first
            await loadShakaPlayer();

            const api = await ensureCrunchyApi();

            // Get episode info
            const episode = await api.getEpisode(episodeId);
            if (episode) {
                setEpisodeData(episode);
            }

            // Get stream data - use web endpoint
            console.log('[WatchShaka] Fetching stream data...');
            const streamResponse = await api.getPlayStream(episodeId);
            console.log('[WatchShaka] Stream response:', streamResponse);

            const parsedStream = parseStreamResponse(streamResponse, episodeId);
            if (!parsedStream) {
                throw new Error('Could not find playable stream');
            }

            setStream(parsedStream);

            // Initialize player
            await initializePlayer(parsedStream);

            // Load skip events
            loadSkipEvents(episodeId);

        } catch (err: any) {
            console.error('[WatchShaka] Error loading episode:', err);
            setError(err.message || 'Failed to load episode');
            setLoading(false);
        }
    }, [loadShakaPlayer, initializePlayer]);

    // Load skip events
    const loadSkipEvents = async (episodeId: string) => {
        try {
            const response = await fetch(`${SKIP_EVENTS_BASE}${episodeId}.json`);
            if (!response.ok) return;

            const data = await response.json();
            const events: SkipEvent[] = [];

            if (data.intro) events.push({ type: 'intro', ...data.intro });
            if (data.credits) events.push({ type: 'credits', ...data.credits });
            if (data.preview) events.push({ type: 'preview', ...data.preview });

            setSkipEvents(events);
            console.log('[WatchShaka] Skip events loaded:', events);
        } catch (err) {
            console.log('[WatchShaka] No skip events available');
        }
    };

    // Cleanup
    useEffect(() => {
        return () => {
            if (playerRef.current) {
                playerRef.current.destroy();
            }
        };
    }, []);

    // Load episode on mount
    useEffect(() => {
        if (id) {
            loadEpisodeData(id);
        }
    }, [id, loadEpisodeData]);

    // Video event handlers
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleTimeUpdate = () => {
            setCurrentTime(video.currentTime);
            if (video.buffered.length > 0) {
                setBuffered(video.buffered.end(video.buffered.length - 1));
            }
        };

        const handleDurationChange = () => setDuration(video.duration);
        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);
        const handleWaiting = () => setIsBuffering(true);
        const handlePlaying = () => setIsBuffering(false);
        const handleVolumeChange = () => {
            setVolume(video.volume);
            setIsMuted(video.muted);
        };

        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('durationchange', handleDurationChange);
        video.addEventListener('play', handlePlay);
        video.addEventListener('pause', handlePause);
        video.addEventListener('waiting', handleWaiting);
        video.addEventListener('playing', handlePlaying);
        video.addEventListener('volumechange', handleVolumeChange);

        return () => {
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('durationchange', handleDurationChange);
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('pause', handlePause);
            video.removeEventListener('waiting', handleWaiting);
            video.removeEventListener('playing', handlePlaying);
            video.removeEventListener('volumechange', handleVolumeChange);
        };
    }, []);

    // Check for skip events
    useEffect(() => {
        const activeSkip = skipEvents.find(
            event => currentTime >= event.start && currentTime < event.end
        );
        setShowSkipButton(activeSkip || null);
    }, [currentTime, skipEvents]);

    // Controls visibility
    const showControlsTemporarily = useCallback(() => {
        setShowControls(true);
        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }
        controlsTimeoutRef.current = setTimeout(() => {
            if (isPlaying) setShowControls(false);
        }, 3000);
    }, [isPlaying]);

    // Playback controls
    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
        }
    };

    const toggleMute = () => {
        if (videoRef.current) {
            videoRef.current.muted = !isMuted;
        }
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = parseFloat(e.target.value);
        if (videoRef.current) {
            videoRef.current.volume = newVolume;
            videoRef.current.muted = newVolume === 0;
        }
    };

    const seek = (time: number) => {
        if (videoRef.current) {
            videoRef.current.currentTime = Math.max(0, Math.min(time, duration));
        }
    };

    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        seek(pos * duration);
    };

    const toggleFullscreen = () => {
        if (!containerRef.current) return;
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    const handleSkip = () => {
        if (showSkipButton && videoRef.current) {
            videoRef.current.currentTime = showSkipButton.end;
        }
    };

    const formatTime = (seconds: number): string => {
        if (!isFinite(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getSkipLabel = (type: string): string => {
        switch (type) {
            case 'intro': return 'Passer l\'intro';
            case 'credits': return 'Passer le générique';
            case 'preview': return 'Passer la preview';
            default: return 'Passer';
        }
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement) return;

            switch (e.key.toLowerCase()) {
                case ' ':
                case 'k':
                    e.preventDefault();
                    togglePlay();
                    break;
                case 'f':
                    e.preventDefault();
                    toggleFullscreen();
                    break;
                case 'm':
                    e.preventDefault();
                    toggleMute();
                    break;
                case 'arrowleft':
                    e.preventDefault();
                    seek(currentTime - 10);
                    break;
                case 'arrowright':
                    e.preventDefault();
                    seek(currentTime + 10);
                    break;
                case 'arrowup':
                    e.preventDefault();
                    if (videoRef.current) {
                        videoRef.current.volume = Math.min(1, volume + 0.1);
                    }
                    break;
                case 'arrowdown':
                    e.preventDefault();
                    if (videoRef.current) {
                        videoRef.current.volume = Math.max(0, volume - 0.1);
                    }
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentTime, duration, volume, isPlaying]);

    // Render
    if (loading) {
        return (
            <div className="watch-page">
                <div className="loading-overlay">
                    <Loader2 className="spinner" size={48} />
                    <p>Chargement de l'épisode...</p>
                    {episodeData && (
                        <p className="loading-info">{episodeData.series_title} - {episodeData.title}</p>
                    )}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="watch-page">
                <div className="error-overlay">
                    <div className="error-icon">⚠️</div>
                    <h2>Erreur de lecture</h2>
                    <p>{error}</p>
                    <div className="error-actions">
                        <button onClick={() => loadEpisodeData(id!)} className="retry-btn">
                            <RefreshCw size={18} />
                            Réessayer
                        </button>
                        <button onClick={() => navigate(-1)} className="back-btn">
                            <ArrowLeft size={18} />
                            Retour
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            className={`watch-page ${showControls ? 'show-controls' : 'hide-controls'}`}
            ref={containerRef}
            onMouseMove={showControlsTemporarily}
            onClick={showControlsTemporarily}
        >
            {/* Video Element */}
            <video
                ref={videoRef}
                className="video-element"
                onClick={togglePlay}
                autoPlay
            />

            {/* Buffering Indicator */}
            {isBuffering && (
                <div className="buffering-overlay">
                    <Loader2 className="spinner" size={48} />
                </div>
            )}

            {/* Episode Info Overlay */}
            <div className={`episode-info-overlay ${showControls ? 'visible' : ''}`}>
                <button className="back-button" onClick={() => navigate(-1)}>
                    <ArrowLeft size={24} />
                </button>
                <div className="episode-info">
                    <h3>{episodeData?.series_title}</h3>
                    <p>
                        {episodeData?.season_number && `S${episodeData.season_number}`}
                        {episodeData?.episode_number && ` E${episodeData.episode_number}`}
                        {episodeData?.title && ` - ${episodeData.title}`}
                    </p>
                </div>
            </div>

            {/* Skip Button */}
            {showSkipButton && (
                <button className="skip-button" onClick={handleSkip}>
                    <FastForward size={18} />
                    {getSkipLabel(showSkipButton.type)}
                </button>
            )}

            {/* Controls */}
            <div className={`controls-overlay ${showControls ? 'visible' : ''}`}>
                {/* Progress Bar */}
                <div className="progress-container" onClick={handleProgressClick}>
                    <div className="progress-bar">
                        <div
                            className="progress-buffered"
                            style={{ width: `${(buffered / duration) * 100}%` }}
                        />
                        <div
                            className="progress-played"
                            style={{ width: `${(currentTime / duration) * 100}%` }}
                        />
                        {/* Skip markers */}
                        {skipEvents.map((event, idx) => (
                            <div
                                key={idx}
                                className="skip-marker"
                                style={{
                                    left: `${(event.start / duration) * 100}%`,
                                    width: `${((event.end - event.start) / duration) * 100}%`
                                }}
                            />
                        ))}
                    </div>
                </div>

                {/* Control Buttons */}
                <div className="controls-bar">
                    <div className="controls-left">
                        <button onClick={togglePlay} className="control-btn">
                            {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                        </button>
                        <button onClick={() => seek(currentTime + 10)} className="control-btn">
                            <SkipForward size={20} />
                        </button>
                        <div className="volume-control">
                            <button onClick={toggleMute} className="control-btn">
                                {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                            </button>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={isMuted ? 0 : volume}
                                onChange={handleVolumeChange}
                                className="volume-slider"
                            />
                        </div>
                        <span className="time-display">
                            {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                    </div>
                    <div className="controls-right">
                        {stream && stream.subtitles.length > 0 && (
                            <button
                                className="control-btn"
                                onClick={() => setShowSettings(!showSettings)}
                            >
                                <Subtitles size={20} />
                            </button>
                        )}
                        <button className="control-btn" onClick={() => setShowSettings(!showSettings)}>
                            <Settings size={20} />
                        </button>
                        <button onClick={toggleFullscreen} className="control-btn">
                            {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Settings Panel */}
            {showSettings && (
                <div className="settings-panel">
                    <h4>Sous-titres</h4>
                    <div className="settings-options">
                        <button
                            className={!selectedSubtitle ? 'active' : ''}
                            onClick={() => setSelectedSubtitle(null)}
                        >
                            Désactivés
                        </button>
                        {stream?.subtitles.map(sub => (
                            <button
                                key={sub.locale}
                                className={selectedSubtitle === sub.locale ? 'active' : ''}
                                onClick={() => setSelectedSubtitle(sub.locale)}
                            >
                                {sub.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default WatchShaka;

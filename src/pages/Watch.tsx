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
    ChevronRight,
    Loader2,
    List,
    FastForward,
    ChevronDown,
    X
} from 'lucide-react';
import { ensureCrunchyApi } from '../utils/apiInstance';
import './Watch.scss';

// Types
interface EpisodeData {
    id: string;
    title: string;
    description?: string;
    episode_number?: number;
    season_number?: number;
    series_id?: string;
    series_title?: string;
    season_id?: string;
    season_title?: string;
    duration_ms?: number;
    images?: {
        thumbnail?: Array<Array<{ source: string }>>;
    };
}

interface SkipEvent {
    type: string;
    start: number;
    end: number;
}

// Skip Events API base
const SKIP_EVENTS_BASE = 'https://static.crunchyroll.com/skip-events/production/';

const Watch = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    // Refs
    const containerRef = useRef<HTMLDivElement>(null);
    const nativeVideoRef = useRef<HTMLVideoElement | null>(null);
    const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // State
    const [loading, setLoading] = useState(true);
    const [episodeData, setEpisodeData] = useState<EpisodeData | null>(null);
    const [nextEpisode, setNextEpisode] = useState<EpisodeData | null>(null);
    const [skipEvents, setSkipEvents] = useState<SkipEvent[]>([]);
    const [episodes, setEpisodes] = useState<EpisodeData[]>([]);

    // Playback state (synced with native player)
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [buffered, setBuffered] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);

    // UI state
    const [showSkipButton, setShowSkipButton] = useState<SkipEvent | null>(null);
    const [showNextEpisodeCard, setShowNextEpisodeCard] = useState(false);
    const [showEpisodeList, setShowEpisodeList] = useState(false);

    // Find and bind to native Crunchyroll video player
    const findNativePlayer = useCallback(() => {
        // Try to find video element in page
        let video = document.querySelector('video') as HTMLVideoElement | null;

        // Try iframes
        if (!video) {
            const iframes = document.querySelectorAll('iframe');
            for (const iframe of iframes) {
                try {
                    video = iframe.contentDocument?.querySelector('video') as HTMLVideoElement | null;
                    if (video) break;
                } catch (e) {
                    // Cross-origin
                }
            }
        }

        if (video && video !== nativeVideoRef.current) {
            nativeVideoRef.current = video;
            bindToNativePlayer(video);
        }

        return video;
    }, []);

    // Bind event listeners to native player
    const bindToNativePlayer = (video: HTMLVideoElement) => {
        console.log('[Watch] Binding to native video player');

        const updatePlayState = () => {
            setIsPlaying(!video.paused);
        };

        const updateTime = () => {
            setCurrentTime(video.currentTime);
            if (video.buffered.length > 0) {
                setBuffered(video.buffered.end(video.buffered.length - 1));
            }
        };

        const updateDuration = () => {
            setDuration(video.duration);
        };

        const updateVolume = () => {
            setVolume(video.volume);
            setIsMuted(video.muted);
        };

        video.addEventListener('play', updatePlayState);
        video.addEventListener('pause', updatePlayState);
        video.addEventListener('timeupdate', updateTime);
        video.addEventListener('durationchange', updateDuration);
        video.addEventListener('volumechange', updateVolume);
        video.addEventListener('loadedmetadata', updateDuration);

        // Initial state
        updatePlayState();
        updateTime();
        updateDuration();
        updateVolume();

        setLoading(false);
    };

    // Load episode data
    const loadEpisodeData = async (episodeId: string) => {
        try {
            const api = await ensureCrunchyApi();

            // Load episode info
            const episode = await api.getEpisode(episodeId);
            if (episode) {
                setEpisodeData(episode);

                // Load episodes from same season
                if (episode.season_id) {
                    const seasonEpisodes = await api.getEpisodes(episode.season_id);
                    if (seasonEpisodes?.items) {
                        setEpisodes(seasonEpisodes.items);
                    }
                }
            }

            // Load next episode
            const upNext = await api.getUpNext(episodeId);
            if (upNext?.data?.[0]?.panel) {
                setNextEpisode(upNext.data[0].panel);
            }

            // Load skip events
            loadSkipEvents(episodeId);

        } catch (error) {
            console.error('[Watch] Error loading episode data:', error);
        }
    };

    // Load skip events
    const loadSkipEvents = async (episodeId: string) => {
        try {
            const response = await fetch(`${SKIP_EVENTS_BASE}${episodeId}.json`);
            if (!response.ok) return;

            const data = await response.json();
            const events: SkipEvent[] = [];

            if (data.intro) events.push({ type: 'intro', start: data.intro.start, end: data.intro.end });
            if (data.credits) events.push({ type: 'credits', start: data.credits.start, end: data.credits.end });
            if (data.preview) events.push({ type: 'preview', start: data.preview.start, end: data.preview.end });

            setSkipEvents(events);
            console.log('[Watch] Skip events loaded:', events);
        } catch (e) {
            console.log('[Watch] No skip events available');
        }
    };

    // Initialize
    useEffect(() => {
        if (id) {
            loadEpisodeData(id);
        }

        // Keep looking for native player
        const interval = setInterval(() => {
            const video = findNativePlayer();
            if (video) {
                clearInterval(interval);
            }
        }, 500);

        // Stop after 30 seconds
        setTimeout(() => clearInterval(interval), 30000);

        return () => clearInterval(interval);
    }, [id, findNativePlayer]);

    // Fullscreen listener
    useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Check skip events
    useEffect(() => {
        const activeSkip = skipEvents.find(
            event => currentTime >= event.start && currentTime < event.end
        );
        setShowSkipButton(activeSkip || null);

        // Show next episode card near end
        if (duration > 0 && currentTime >= duration - 30) {
            setShowNextEpisodeCard(true);
        } else {
            setShowNextEpisodeCard(false);
        }
    }, [currentTime, duration, skipEvents]);

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
        if (nativeVideoRef.current) {
            if (nativeVideoRef.current.paused) {
                nativeVideoRef.current.play();
            } else {
                nativeVideoRef.current.pause();
            }
        }
    };

    const toggleMute = () => {
        if (nativeVideoRef.current) {
            nativeVideoRef.current.muted = !nativeVideoRef.current.muted;
        }
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = parseFloat(e.target.value);
        if (nativeVideoRef.current) {
            nativeVideoRef.current.volume = newVolume;
            nativeVideoRef.current.muted = newVolume === 0;
        }
    };

    const seek = (time: number) => {
        if (nativeVideoRef.current) {
            nativeVideoRef.current.currentTime = Math.max(0, Math.min(time, duration));
        }
    };

    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        seek(pos * duration);
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };

    const handleSkip = () => {
        if (showSkipButton && nativeVideoRef.current) {
            nativeVideoRef.current.currentTime = showSkipButton.end;
        }
    };

    const goToNextEpisode = () => {
        if (nextEpisode) {
            navigate(`/watch/${nextEpisode.id}`);
        }
    };

    const goToEpisode = (episodeId: string) => {
        navigate(`/watch/${episodeId}`);
        setShowEpisodeList(false);
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
                    if (nativeVideoRef.current) {
                        nativeVideoRef.current.volume = Math.min(1, volume + 0.1);
                    }
                    break;
                case 'arrowdown':
                    e.preventDefault();
                    if (nativeVideoRef.current) {
                        nativeVideoRef.current.volume = Math.max(0, volume - 0.1);
                    }
                    break;
                case 'escape':
                    setShowEpisodeList(false);
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentTime, duration, volume]);

    // Formatters
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

    return (
        <div
            className={`watch-page ${showControls ? 'show-controls' : 'hide-controls'}`}
            ref={containerRef}
            onMouseMove={showControlsTemporarily}
            onClick={showControlsTemporarily}
        >
            {/* Native video player is positioned behind via CSS z-index */}
            <div className="native-player-container">
                {/* The native Crunchyroll player renders here via CSS positioning */}
            </div>

            {/* Loading overlay */}
            {loading && (
                <div className="loading-overlay">
                    <Loader2 className="spinner" size={48} />
                    <p>Chargement...</p>
                </div>
            )}

            {/* Episode info overlay (top) */}
            <div className={`episode-info-overlay ${showControls ? 'visible' : ''}`}>
                <button className="back-button" onClick={() => navigate(-1)}>
                    <ArrowLeft size={24} />
                </button>
                <div className="episode-info">
                    <h3>{episodeData?.series_title || 'Chargement...'}</h3>
                    <p>
                        {episodeData?.season_number && `S${episodeData.season_number}`}
                        {episodeData?.episode_number && ` E${episodeData.episode_number}`}
                        {episodeData?.title && ` - ${episodeData.title}`}
                    </p>
                </div>
                <div className="header-actions">
                    <button
                        className="action-button"
                        onClick={() => setShowEpisodeList(!showEpisodeList)}
                    >
                        <List size={20} />
                        <span>Épisodes</span>
                        <ChevronDown size={16} />
                    </button>
                </div>
            </div>

            {/* Skip button */}
            {showSkipButton && (
                <button className="skip-button" onClick={handleSkip}>
                    <FastForward size={18} />
                    {getSkipLabel(showSkipButton.type)}
                </button>
            )}

            {/* Next episode card */}
            {showNextEpisodeCard && nextEpisode && (
                <div className="next-episode-card">
                    <div className="next-label">Épisode suivant</div>
                    <div className="next-content">
                        <div className="next-info">
                            <span className="next-number">
                                E{nextEpisode.episode_number}
                            </span>
                            <span className="next-title">{nextEpisode.title}</span>
                        </div>
                        <button className="next-button" onClick={goToNextEpisode}>
                            <Play size={16} />
                            Lecture
                        </button>
                    </div>
                </div>
            )}

            {/* Controls overlay (bottom) */}
            <div className={`controls-overlay ${showControls ? 'visible' : ''}`}>
                {/* Progress bar */}
                <div
                    className="progress-container"
                    onClick={handleProgressClick}
                >
                    <div className="progress-bar">
                        <div
                            className="progress-buffered"
                            style={{ width: `${duration ? (buffered / duration) * 100 : 0}%` }}
                        />
                        <div
                            className="progress-played"
                            style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                        />
                        {/* Skip markers */}
                        {skipEvents.map((event, idx) => (
                            <div
                                key={idx}
                                className="skip-marker"
                                style={{
                                    left: `${duration ? (event.start / duration) * 100 : 0}%`,
                                    width: `${duration ? ((event.end - event.start) / duration) * 100 : 0}%`
                                }}
                            />
                        ))}
                        <div
                            className="progress-thumb"
                            style={{ left: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                        />
                    </div>
                </div>

                {/* Control buttons */}
                <div className="controls-bar">
                    <div className="controls-left">
                        <button onClick={togglePlay} className="control-btn play-btn">
                            {isPlaying ? <Pause size={28} /> : <Play size={28} />}
                        </button>
                        <button onClick={() => seek(currentTime - 10)} className="control-btn">
                            <span className="skip-label">-10</span>
                        </button>
                        <button onClick={() => seek(currentTime + 10)} className="control-btn">
                            <span className="skip-label">+10</span>
                        </button>
                        <div className="volume-control">
                            <button onClick={toggleMute} className="control-btn">
                                {isMuted || volume === 0 ? <VolumeX size={22} /> : <Volume2 size={22} />}
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
                        {nextEpisode && (
                            <button className="control-btn next-btn" onClick={goToNextEpisode}>
                                <SkipForward size={22} />
                            </button>
                        )}
                        <button className="control-btn" onClick={() => setShowEpisodeList(!showEpisodeList)}>
                            <List size={22} />
                        </button>
                        <button onClick={toggleFullscreen} className="control-btn">
                            {isFullscreen ? <Minimize size={22} /> : <Maximize size={22} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Episode list sidebar */}
            {showEpisodeList && (
                <div className="episode-sidebar">
                    <div className="sidebar-header">
                        <h3>Épisodes</h3>
                        <button onClick={() => setShowEpisodeList(false)}>
                            <X size={20} />
                        </button>
                    </div>
                    <div className="episode-list">
                        {episodes.map((ep) => (
                            <div
                                key={ep.id}
                                className={`episode-item ${ep.id === id ? 'active' : ''}`}
                                onClick={() => goToEpisode(ep.id)}
                            >
                                <div className="episode-thumb">
                                    {ep.images?.thumbnail?.[0]?.[0]?.source && (
                                        <img
                                            src={ep.images.thumbnail[0][0].source}
                                            alt={ep.title}
                                        />
                                    )}
                                    <span className="episode-number">E{ep.episode_number}</span>
                                </div>
                                <div className="episode-details">
                                    <span className="episode-title">{ep.title}</span>
                                    {ep.duration_ms && (
                                        <span className="episode-duration">
                                            {Math.floor(ep.duration_ms / 60000)} min
                                        </span>
                                    )}
                                </div>
                                {ep.id === id && <ChevronRight size={16} className="playing-icon" />}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Watch;

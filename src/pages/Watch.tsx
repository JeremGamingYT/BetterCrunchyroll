import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Maximize, Minimize } from 'lucide-react';
import { ensureCrunchyApi } from '../utils/apiInstance';
import './Watch.scss';

type StreamInfo = {
    url: string | null;
    type: 'hls' | 'dash' | 'unknown';
};

declare global {
    interface Window {
        Hls?: any;
        dashjs?: any;
    }
}

const hideCrunchyNativePlayers = () => {
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
    selectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => {
            const elem = el as HTMLElement;
            elem.style.opacity = '0';
            elem.style.pointerEvents = 'none';
            elem.style.visibility = 'hidden';
        });
    });
};

const Watch = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const containerRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const playerInstance = useRef<any>(null); // hls.js or dash.js instance

    const [showControls, setShowControls] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [episodeInfo, setEpisodeInfo] = useState<any>(null);
    const [stream, setStream] = useState<StreamInfo>({ url: null, type: 'unknown' });
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (id) loadEpisodeAndStream(id);

        const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        hideCrunchyNativePlayers();

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            destroyPlayer();
        };
    }, [id]);

    useEffect(() => {
        attachStreamToVideo();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stream.url]);

    const destroyPlayer = () => {
        if (playerInstance.current?.destroy) {
            playerInstance.current.destroy();
        } else if (playerInstance.current?.reset) {
            playerInstance.current.reset();
        }
        playerInstance.current = null;
        if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.src = '';
        }
    };

    const loadEpisodeAndStream = async (episodeId: string) => {
        setErrorMsg(null);
        destroyPlayer();
        hideCrunchyNativePlayers();

        try {
            const api = await ensureCrunchyApi();
            const response = await api.get(`/content/v2/cms/objects/${episodeId}`);
            if (response?.data?.[0]) {
                setEpisodeInfo(response.data[0]);
            }

            const streamData = await api.getPlayStream(episodeId);
            const url =
                streamData?.data?.[0]?.streams?.adaptive_hls?.[0]?.url ||
                streamData?.streams?.adaptive_hls?.[0]?.url ||
                streamData?.data?.[0]?.streams?.adaptive_dash?.[0]?.url ||
                streamData?.url ||
                null;

            const type: StreamInfo['type'] = url?.includes('.m3u8')
                ? 'hls'
                : url?.includes('.mpd')
                    ? 'dash'
                    : 'unknown';

            if (!url) {
                setStream({ url: null, type: 'unknown' });
                setErrorMsg('Flux vidéo introuvable.');
                return;
            }

            setStream({ url, type });
        } catch (error) {
            console.error('Error loading episode/stream:', error);
            setErrorMsg('Impossible de charger la vidéo.');
            setStream({ url: null, type: 'unknown' });
        }
    };

    const attachStreamToVideo = async () => {
        if (!stream.url || !videoRef.current) return;
        hideCrunchyNativePlayers();
        const video = videoRef.current;

        // HLS native (Safari)
        if (stream.type === 'hls' && video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = stream.url;
            video.play().catch(() => {});
            return;
        }

        // HLS via hls.js
        if (stream.type === 'hls') {
            try {
                const Hls = await loadHlsLibrary();
                if (Hls?.isSupported && Hls.isSupported()) {
                    playerInstance.current = new Hls();
                    playerInstance.current.loadSource(stream.url);
                    playerInstance.current.attachMedia(video);
                    return;
                }
            } catch (e) {
                console.warn('HLS.js failed, fallback to direct src', e);
            }
        }

        // DASH via dash.js
        if (stream.type === 'dash') {
            try {
                const dashjs = await loadDashLibrary();
                playerInstance.current = dashjs?.MediaPlayer?.().create();
                playerInstance.current.initialize(video, stream.url, true);
                return;
            } catch (e) {
                console.warn('dash.js failed, fallback to direct src', e);
            }
        }

        // Fallback: direct src
        video.src = stream.url;
        video.play().catch(() => {});
    };

    const loadScriptOnce = (src: string, globalKey: string) => {
        if ((window as any)[globalKey]) return Promise.resolve((window as any)[globalKey]);
        return new Promise((resolve, reject) => {
            const existing = document.querySelector(`script[data-lib="${globalKey}"]`);
            if (existing) {
                existing.addEventListener('load', () => resolve((window as any)[globalKey]));
                existing.addEventListener('error', reject);
                return;
            }
            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            script.dataset.lib = globalKey;
            script.onload = () => resolve((window as any)[globalKey]);
            script.onerror = reject;
            document.head.appendChild(script);
        });
    };

    const loadHlsLibrary = async () => {
        if (window.Hls) return window.Hls;
        await loadScriptOnce('https://cdn.jsdelivr.net/npm/hls.js@1.5.15/dist/hls.min.js', 'Hls');
        return window.Hls;
    };

    const loadDashLibrary = async () => {
        if (window.dashjs) return window.dashjs;
        await loadScriptOnce('https://cdn.jsdelivr.net/npm/dashjs@4.7.1/dist/dash.all.min.js', 'dashjs');
        return window.dashjs;
    };

    const handleMouseMove = () => {
        setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
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
        navigate(-1);
    };

    const episodeMeta = episodeInfo?.episode_metadata || episodeInfo;

    return (
        <div
            className="watch-page-player embedded"
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setShowControls(false)}
        >
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
                            {episodeMeta.series_title && <p>{episodeMeta.series_title}</p>}
                        </>
                    )}
                </div>

                <div className="top-right-controls">
                    <button onClick={toggleFullscreen} title="Plein écran">
                        {isFullscreen ? <Minimize size={22} /> : <Maximize size={22} />}
                    </button>
                </div>
            </div>

            <div className="embedded-video">
                <video ref={videoRef} controls autoPlay playsInline />
            </div>

            {!episodeInfo && (
                <div className="loading-indicator">
                    <div className="spinner"></div>
                </div>
            )}

            {errorMsg && (
                <div className="fallback-banner">
                    {errorMsg}
                </div>
            )}
        </div>
    );
};

export default Watch;

/**
 * BetterCrunchyroll - Watch Page Hybrid Controller
 * 
 * This script injects into watch pages and enhances the native Crunchyroll player
 * with our custom UI overlay while keeping the native player for DRM content.
 */

(function () {
    'use strict';

    // Skip if not on watch page
    if (!window.location.pathname.includes('/watch/')) return;

    console.log('[BC-Watch] Initializing hybrid player controller...');

    // State
    let nativeVideo = null;
    let isInitialized = false;
    let skipEvents = [];
    let currentEpisodeId = '';

    // Extract episode ID from URL
    function getEpisodeId() {
        const match = window.location.pathname.match(/\/watch\/([^\/]+)/);
        return match ? match[1] : null;
    }

    // Create our custom overlay UI
    function createOverlayUI() {
        if (document.getElementById('bc-custom-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'bc-custom-overlay';
        overlay.innerHTML = `
            <div class="bc-top-bar" id="bc-top-bar">
                <button class="bc-back-btn" id="bc-back">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="m12 19-7-7 7-7"/>
                        <path d="M19 12H5"/>
                    </svg>
                </button>
                <div class="bc-episode-info" id="bc-episode-info">
                    <span class="bc-series-title" id="bc-series-title"></span>
                    <span class="bc-episode-title" id="bc-episode-title"></span>
                </div>
            </div>
            
            <div class="bc-center-controls" id="bc-center-controls">
                <button class="bc-play-btn" id="bc-play-pause">
                    <svg class="bc-icon-play" xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="5,3 19,12 5,21"/>
                    </svg>
                    <svg class="bc-icon-pause" xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="currentColor" style="display:none">
                        <rect x="6" y="4" width="4" height="16"/>
                        <rect x="14" y="4" width="4" height="16"/>
                    </svg>
                </button>
            </div>
            
            <div class="bc-skip-container" id="bc-skip-container" style="display:none">
                <button class="bc-skip-btn" id="bc-skip-btn">
                    <span id="bc-skip-text">Passer</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polygon points="5,4 15,12 5,20"/>
                        <line x1="19" y1="5" x2="19" y2="19"/>
                    </svg>
                </button>
            </div>
            
            <div class="bc-bottom-bar" id="bc-bottom-bar">
                <div class="bc-progress-container" id="bc-progress-container">
                    <div class="bc-progress-bar">
                        <div class="bc-progress-buffered" id="bc-progress-buffered"></div>
                        <div class="bc-progress-played" id="bc-progress-played"></div>
                        <div class="bc-progress-markers" id="bc-progress-markers"></div>
                    </div>
                    <div class="bc-progress-thumb" id="bc-progress-thumb"></div>
                </div>
                
                <div class="bc-controls-row">
                    <div class="bc-controls-left">
                        <button class="bc-ctrl-btn" id="bc-play-pause-small">
                            <svg class="bc-icon-play-s" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                <polygon points="5,3 19,12 5,21"/>
                            </svg>
                            <svg class="bc-icon-pause-s" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style="display:none">
                                <rect x="6" y="4" width="4" height="16"/>
                                <rect x="14" y="4" width="4" height="16"/>
                            </svg>
                        </button>
                        <button class="bc-ctrl-btn" id="bc-skip-back">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M12 20V4"/>
                                <polyline points="4,12 12,4 20,12"/>
                            </svg>
                            <span>-10s</span>
                        </button>
                        <button class="bc-ctrl-btn" id="bc-skip-forward">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M12 4v16"/>
                                <polyline points="20,12 12,20 4,12"/>
                            </svg>
                            <span>+10s</span>
                        </button>
                        <div class="bc-volume-control">
                            <button class="bc-ctrl-btn" id="bc-mute">
                                <svg class="bc-icon-volume" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polygon points="11,5 6,9 2,9 2,15 6,15 11,19"/>
                                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
                                </svg>
                                <svg class="bc-icon-muted" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:none">
                                    <polygon points="11,5 6,9 2,9 2,15 6,15 11,19"/>
                                    <line x1="23" y1="9" x2="17" y2="15"/>
                                    <line x1="17" y1="9" x2="23" y2="15"/>
                                </svg>
                            </button>
                            <input type="range" class="bc-volume-slider" id="bc-volume" min="0" max="1" step="0.05" value="1">
                        </div>
                        <span class="bc-time" id="bc-time">0:00 / 0:00</span>
                    </div>
                    
                    <div class="bc-controls-right">
                        <button class="bc-ctrl-btn" id="bc-settings">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="3"/>
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                            </svg>
                        </button>
                        <button class="bc-ctrl-btn" id="bc-fullscreen">
                            <svg class="bc-icon-fs" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="15,3 21,3 21,9"/>
                                <polyline points="9,21 3,21 3,15"/>
                                <line x1="21" y1="3" x2="14" y2="10"/>
                                <line x1="3" y1="21" x2="10" y2="14"/>
                            </svg>
                            <svg class="bc-icon-fs-exit" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:none">
                                <polyline points="4,14 10,14 10,20"/>
                                <polyline points="20,10 14,10 14,4"/>
                                <line x1="14" y1="10" x2="21" y2="3"/>
                                <line x1="3" y1="21" x2="10" y2="14"/>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        injectStyles();
        setupEventListeners();
    }

    // Inject CSS styles
    function injectStyles() {
        if (document.getElementById('bc-custom-styles')) return;

        const style = document.createElement('style');
        style.id = 'bc-custom-styles';
        style.textContent = `
            #bc-custom-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                z-index: 999999;
                pointer-events: none;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                transition: opacity 0.3s ease;
            }
            
            #bc-custom-overlay.hidden {
                opacity: 0;
            }
            
            #bc-custom-overlay.hidden .bc-top-bar,
            #bc-custom-overlay.hidden .bc-bottom-bar,
            #bc-custom-overlay.hidden .bc-center-controls {
                opacity: 0;
                pointer-events: none;
            }
            
            .bc-top-bar {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                padding: 20px;
                display: flex;
                align-items: center;
                gap: 16px;
                background: linear-gradient(to bottom, rgba(0,0,0,0.7), transparent);
                pointer-events: auto;
                transition: opacity 0.3s ease;
            }
            
            .bc-back-btn {
                background: rgba(255,255,255,0.1);
                border: none;
                color: white;
                width: 44px;
                height: 44px;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
                backdrop-filter: blur(10px);
            }
            
            .bc-back-btn:hover {
                background: rgba(244, 117, 33, 0.8);
                transform: scale(1.05);
            }
            
            .bc-episode-info {
                display: flex;
                flex-direction: column;
                color: white;
            }
            
            .bc-series-title {
                font-size: 14px;
                color: #f47521;
                font-weight: 600;
            }
            
            .bc-episode-title {
                font-size: 16px;
                font-weight: 500;
            }
            
            .bc-center-controls {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                pointer-events: auto;
                transition: opacity 0.3s ease;
            }
            
            .bc-play-btn {
                background: rgba(0,0,0,0.5);
                border: none;
                color: white;
                width: 80px;
                height: 80px;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
                backdrop-filter: blur(10px);
            }
            
            .bc-play-btn:hover {
                background: rgba(244, 117, 33, 0.8);
                transform: scale(1.1);
            }
            
            .bc-skip-container {
                position: absolute;
                bottom: 120px;
                right: 20px;
                pointer-events: auto;
            }
            
            .bc-skip-btn {
                background: linear-gradient(135deg, #f47521 0%, #ff9a56 100%);
                border: none;
                color: white;
                padding: 14px 28px;
                border-radius: 10px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 10px;
                box-shadow: 0 4px 20px rgba(244, 117, 33, 0.4);
                transition: all 0.2s ease;
            }
            
            .bc-skip-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 25px rgba(244, 117, 33, 0.6);
            }
            
            .bc-bottom-bar {
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                padding: 0 20px 20px;
                background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
                pointer-events: auto;
                transition: opacity 0.3s ease;
            }
            
            .bc-progress-container {
                position: relative;
                width: 100%;
                height: 24px;
                cursor: pointer;
                display: flex;
                align-items: center;
            }
            
            .bc-progress-bar {
                position: relative;
                width: 100%;
                height: 4px;
                background: rgba(255,255,255,0.2);
                border-radius: 2px;
                overflow: hidden;
                transition: height 0.2s ease;
            }
            
            .bc-progress-container:hover .bc-progress-bar {
                height: 6px;
            }
            
            .bc-progress-buffered {
                position: absolute;
                top: 0;
                left: 0;
                height: 100%;
                background: rgba(255,255,255,0.3);
            }
            
            .bc-progress-played {
                position: absolute;
                top: 0;
                left: 0;
                height: 100%;
                background: #f47521;
            }
            
            .bc-progress-markers {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
            }
            
            .bc-skip-marker {
                position: absolute;
                top: 0;
                height: 100%;
                background: rgba(255, 215, 0, 0.5);
            }
            
            .bc-progress-thumb {
                position: absolute;
                width: 14px;
                height: 14px;
                background: #f47521;
                border-radius: 50%;
                top: 50%;
                transform: translate(-50%, -50%);
                opacity: 0;
                transition: opacity 0.2s ease;
            }
            
            .bc-progress-container:hover .bc-progress-thumb {
                opacity: 1;
            }
            
            .bc-controls-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-top: 12px;
            }
            
            .bc-controls-left,
            .bc-controls-right {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .bc-ctrl-btn {
                background: transparent;
                border: none;
                color: white;
                padding: 8px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 4px;
                border-radius: 6px;
                transition: all 0.2s ease;
            }
            
            .bc-ctrl-btn:hover {
                background: rgba(255,255,255,0.1);
            }
            
            .bc-ctrl-btn span {
                font-size: 12px;
                font-weight: 500;
            }
            
            .bc-volume-control {
                display: flex;
                align-items: center;
                gap: 4px;
            }
            
            .bc-volume-slider {
                width: 0;
                opacity: 0;
                transition: all 0.2s ease;
                -webkit-appearance: none;
                background: rgba(255,255,255,0.2);
                height: 4px;
                border-radius: 2px;
                cursor: pointer;
            }
            
            .bc-volume-control:hover .bc-volume-slider {
                width: 80px;
                opacity: 1;
            }
            
            .bc-volume-slider::-webkit-slider-thumb {
                -webkit-appearance: none;
                width: 12px;
                height: 12px;
                background: white;
                border-radius: 50%;
                cursor: pointer;
            }
            
            .bc-time {
                color: rgba(255,255,255,0.8);
                font-size: 14px;
                font-weight: 500;
                padding: 0 8px;
            }
            
            /* Animations */
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            .bc-skip-container {
                animation: fadeIn 0.3s ease;
            }
        `;

        document.head.appendChild(style);
    }

    // Setup event listeners
    function setupEventListeners() {
        // Back button
        document.getElementById('bc-back')?.addEventListener('click', () => {
            window.location.href = 'https://www.crunchyroll.com/';
        });

        // Play/Pause
        ['bc-play-pause', 'bc-play-pause-small'].forEach(id => {
            document.getElementById(id)?.addEventListener('click', () => {
                if (nativeVideo) {
                    if (nativeVideo.paused) {
                        nativeVideo.play();
                    } else {
                        nativeVideo.pause();
                    }
                }
            });
        });

        // Skip back/forward
        document.getElementById('bc-skip-back')?.addEventListener('click', () => {
            if (nativeVideo) nativeVideo.currentTime -= 10;
        });

        document.getElementById('bc-skip-forward')?.addEventListener('click', () => {
            if (nativeVideo) nativeVideo.currentTime += 10;
        });

        // Volume
        document.getElementById('bc-mute')?.addEventListener('click', () => {
            if (nativeVideo) nativeVideo.muted = !nativeVideo.muted;
        });

        document.getElementById('bc-volume')?.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            if (nativeVideo) {
                nativeVideo.volume = value;
                nativeVideo.muted = value === 0;
            }
        });

        // Fullscreen
        document.getElementById('bc-fullscreen')?.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
            } else {
                document.exitFullscreen();
            }
        });

        // Progress bar
        document.getElementById('bc-progress-container')?.addEventListener('click', (e) => {
            if (!nativeVideo) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            nativeVideo.currentTime = pos * nativeVideo.duration;
        });

        // Skip button
        document.getElementById('bc-skip-btn')?.addEventListener('click', () => {
            if (!nativeVideo) return;
            const currentTime = nativeVideo.currentTime;
            const activeSkip = skipEvents.find(e => currentTime >= e.start && currentTime < e.end);
            if (activeSkip) {
                nativeVideo.currentTime = activeSkip.end;
            }
        });

        // Controls visibility
        let hideTimeout = null;
        const overlay = document.getElementById('bc-custom-overlay');

        document.addEventListener('mousemove', () => {
            overlay?.classList.remove('hidden');
            if (hideTimeout) clearTimeout(hideTimeout);
            hideTimeout = setTimeout(() => {
                if (nativeVideo && !nativeVideo.paused) {
                    overlay?.classList.add('hidden');
                }
            }, 3000);
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (!nativeVideo) return;
            if (e.target.tagName === 'INPUT') return;

            switch (e.key.toLowerCase()) {
                case ' ':
                case 'k':
                    e.preventDefault();
                    nativeVideo.paused ? nativeVideo.play() : nativeVideo.pause();
                    break;
                case 'f':
                    e.preventDefault();
                    document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
                    break;
                case 'm':
                    e.preventDefault();
                    nativeVideo.muted = !nativeVideo.muted;
                    break;
                case 'arrowleft':
                    e.preventDefault();
                    nativeVideo.currentTime -= 10;
                    break;
                case 'arrowright':
                    e.preventDefault();
                    nativeVideo.currentTime += 10;
                    break;
            }
        });
    }

    // Bind to native video element
    function bindToVideo(video) {
        if (nativeVideo === video) return;
        nativeVideo = video;

        console.log('[BC-Watch] Bound to native video element');

        video.addEventListener('timeupdate', updateProgress);
        video.addEventListener('durationchange', updateProgress);
        video.addEventListener('play', updatePlayState);
        video.addEventListener('pause', updatePlayState);
        video.addEventListener('volumechange', updateVolumeState);

        updateProgress();
        updatePlayState();
        updateVolumeState();
    }

    // Update progress bar
    function updateProgress() {
        if (!nativeVideo) return;

        const played = (nativeVideo.currentTime / nativeVideo.duration) * 100;
        document.getElementById('bc-progress-played').style.width = `${played}%`;
        document.getElementById('bc-progress-thumb').style.left = `${played}%`;

        // Buffered
        if (nativeVideo.buffered.length > 0) {
            const buffered = (nativeVideo.buffered.end(nativeVideo.buffered.length - 1) / nativeVideo.duration) * 100;
            document.getElementById('bc-progress-buffered').style.width = `${buffered}%`;
        }

        // Time display
        const timeEl = document.getElementById('bc-time');
        if (timeEl) {
            timeEl.textContent = `${formatTime(nativeVideo.currentTime)} / ${formatTime(nativeVideo.duration)}`;
        }

        // Check skip events
        checkSkipEvents();
    }

    // Update play/pause state
    function updatePlayState() {
        if (!nativeVideo) return;
        const isPlaying = !nativeVideo.paused;

        document.querySelector('.bc-icon-play').style.display = isPlaying ? 'none' : 'block';
        document.querySelector('.bc-icon-pause').style.display = isPlaying ? 'block' : 'none';
        document.querySelector('.bc-icon-play-s').style.display = isPlaying ? 'none' : 'block';
        document.querySelector('.bc-icon-pause-s').style.display = isPlaying ? 'block' : 'none';
    }

    // Update volume state
    function updateVolumeState() {
        if (!nativeVideo) return;

        document.querySelector('.bc-icon-volume').style.display = nativeVideo.muted ? 'none' : 'block';
        document.querySelector('.bc-icon-muted').style.display = nativeVideo.muted ? 'block' : 'none';
        document.getElementById('bc-volume').value = nativeVideo.muted ? 0 : nativeVideo.volume;
    }

    // Format time
    function formatTime(seconds) {
        if (!isFinite(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    // Load skip events
    async function loadSkipEvents() {
        const episodeId = getEpisodeId();
        if (!episodeId || episodeId === currentEpisodeId) return;
        currentEpisodeId = episodeId;

        try {
            const response = await fetch(`https://static.crunchyroll.com/skip-events/production/${episodeId}.json`);
            if (!response.ok) return;

            const data = await response.json();
            skipEvents = [];

            if (data.intro) skipEvents.push({ type: 'intro', start: data.intro.start, end: data.intro.end });
            if (data.credits) skipEvents.push({ type: 'credits', start: data.credits.start, end: data.credits.end });
            if (data.preview) skipEvents.push({ type: 'preview', start: data.preview.start, end: data.preview.end });

            console.log('[BC-Watch] Skip events loaded:', skipEvents);
            renderSkipMarkers();
        } catch (e) {
            console.log('[BC-Watch] No skip events available');
        }
    }

    // Render skip markers on progress bar
    function renderSkipMarkers() {
        const container = document.getElementById('bc-progress-markers');
        if (!container || !nativeVideo) return;

        container.innerHTML = '';
        skipEvents.forEach(event => {
            const marker = document.createElement('div');
            marker.className = 'bc-skip-marker';
            marker.style.left = `${(event.start / nativeVideo.duration) * 100}%`;
            marker.style.width = `${((event.end - event.start) / nativeVideo.duration) * 100}%`;
            container.appendChild(marker);
        });
    }

    // Check if we're in a skip event
    function checkSkipEvents() {
        if (!nativeVideo) return;

        const currentTime = nativeVideo.currentTime;
        const activeSkip = skipEvents.find(e => currentTime >= e.start && currentTime < e.end);

        const container = document.getElementById('bc-skip-container');
        const textEl = document.getElementById('bc-skip-text');

        if (activeSkip) {
            container.style.display = 'block';
            const labels = {
                'intro': 'Passer l\'intro',
                'credits': 'Passer le générique',
                'preview': 'Passer la preview'
            };
            textEl.textContent = labels[activeSkip.type] || 'Passer';
        } else {
            container.style.display = 'none';
        }
    }

    // Get episode info from page
    function updateEpisodeInfo() {
        setTimeout(() => {
            const seriesTitle = document.querySelector('[data-t="show-title"], .show-title-link, .erc-show-title')?.textContent || '';
            const episodeTitle = document.querySelector('[data-t="episode-title"], .playback-title, .erc-current-media-info')?.textContent || '';

            const seriesEl = document.getElementById('bc-series-title');
            const episodeEl = document.getElementById('bc-episode-title');

            if (seriesEl) seriesEl.textContent = seriesTitle;
            if (episodeEl) episodeEl.textContent = episodeTitle;
        }, 2000);
    }

    // Find and bind to video element
    function findVideo() {
        // Try direct video element
        let video = document.querySelector('video');

        // Try inside iframes
        if (!video) {
            const iframes = document.querySelectorAll('iframe');
            for (const iframe of iframes) {
                try {
                    video = iframe.contentDocument?.querySelector('video');
                    if (video) break;
                } catch (e) {
                    // Cross-origin, can't access
                }
            }
        }

        if (video && !isInitialized) {
            isInitialized = true;
            createOverlayUI();
            bindToVideo(video);
            loadSkipEvents();
            updateEpisodeInfo();
        }

        return video;
    }

    // Initialize
    function init() {
        // Keep trying to find the video
        const checkInterval = setInterval(() => {
            const video = findVideo();
            if (video) {
                clearInterval(checkInterval);
            }
        }, 500);

        // Stop after 30 seconds
        setTimeout(() => clearInterval(checkInterval), 30000);
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();

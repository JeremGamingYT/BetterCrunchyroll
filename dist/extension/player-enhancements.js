// BetterCrunchyroll - Player Enhancements
// MIT (Improve-Crunchyroll by ThomasTavernier) + AGPL-3.0 (CrOptix by stratumadev)
// Injected on Crunchyroll watch pages to add:
//   • Keyboard shortcuts (seek, pause, fullscreen, theater, next/prev ep, PiP, speed)
//   • Playback speed selector
//   • Theater mode
//   • Picture-in-Picture
//   • Resolution/quality selector overlay

(function () {
  'use strict';

  if (window.__BCR_PLAYER_ENHANCED__) return;
  window.__BCR_PLAYER_ENHANCED__ = true;

  // ─── Constants ───────────────────────────────────────────────────────────────
  const SEEK_SECONDS = 10;
  const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];
  let currentSpeedIndex = SPEEDS.indexOf(1);
  let isTheaterMode = false;
  let controlsVisible = false;
  let hideControlsTimer = null;

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  function getVideo() {
    return document.querySelector('video');
  }

  function getNextEpisodeLink() {
    // Crunchyroll DOM selectors for next episode
    return (
      document.querySelector('[data-testid="next-episode-button"] a') ||
      document.querySelector('a[href*="/watch/"][aria-label*="suivant"]') ||
      document.querySelector('a[href*="/watch/"][aria-label*="next"]') ||
      null
    );
  }

  function getPrevEpisodeLink() {
    return (
      document.querySelector('[data-testid="prev-episode-button"] a') ||
      document.querySelector('a[href*="/watch/"][aria-label*="précédent"]') ||
      document.querySelector('a[href*="/watch/"][aria-label*="prev"]') ||
      null
    );
  }

  function showToast(message) {
    const existing = document.getElementById('bcr-player-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'bcr-player-toast';
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.85);
      color: #fff;
      padding: 8px 18px;
      border-radius: 6px;
      font-size: 14px;
      font-family: sans-serif;
      z-index: 99999;
      pointer-events: none;
      backdrop-filter: blur(6px);
      border: 1px solid rgba(255,255,255,0.15);
      transition: opacity 0.3s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 1500);
  }

  // ─── Keyboard Shortcuts ───────────────────────────────────────────────────────

  document.addEventListener('keydown', (e) => {
    // Skip when typing in inputs
    const tag = document.activeElement?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || document.activeElement?.isContentEditable) return;

    // Only on watch pages
    if (!/\/watch\//.test(window.location.pathname)) return;

    const video = getVideo();
    if (!video) return;

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        video.currentTime = Math.max(0, video.currentTime - SEEK_SECONDS);
        showToast(`⏪ -${SEEK_SECONDS}s`);
        break;

      case 'ArrowRight':
        e.preventDefault();
        video.currentTime = Math.min(video.duration || 0, video.currentTime + SEEK_SECONDS);
        showToast(`⏩ +${SEEK_SECONDS}s`);
        break;

      case ' ':
        e.preventDefault();
        if (video.paused) {
          video.play();
          showToast('▶ Lecture');
        } else {
          video.pause();
          showToast('⏸ Pause');
        }
        break;

      case 'f':
      case 'F':
        e.preventDefault();
        if (!document.fullscreenElement) {
          (document.querySelector('.video-player__container') || video.parentElement || document.documentElement)
            .requestFullscreen?.();
        } else {
          document.exitFullscreen?.();
        }
        break;

      case 'p':
      case 'P':
        e.preventDefault();
        if (getPrevEpisodeLink()) {
          window.location.href = getPrevEpisodeLink().href;
        } else {
          showToast('Premier épisode');
        }
        break;

      case 'n':
      case 'N':
        e.preventDefault();
        if (getNextEpisodeLink()) {
          window.location.href = getNextEpisodeLink().href;
        } else {
          showToast('Dernier épisode');
        }
        break;

      case 'm':
      case 'M':
        e.preventDefault();
        video.muted = !video.muted;
        showToast(video.muted ? '🔇 Son coupé' : '🔊 Son activé');
        break;

      case 't':
      case 'T':
        e.preventDefault();
        toggleTheaterMode();
        break;

      case 'i':
      case 'I':
        e.preventDefault();
        togglePiP(video);
        break;

      case '>':
        e.preventDefault();
        changeSpeed(1);
        break;

      case '<':
        e.preventDefault();
        changeSpeed(-1);
        break;
    }
  });

  // ─── Speed Control ────────────────────────────────────────────────────────────

  function changeSpeed(delta) {
    const video = getVideo();
    if (!video) return;
    currentSpeedIndex = Math.max(0, Math.min(SPEEDS.length - 1, currentSpeedIndex + delta));
    video.playbackRate = SPEEDS[currentSpeedIndex];
    updateSpeedDisplay();
    showToast(`Vitesse : ${SPEEDS[currentSpeedIndex]}×`);
  }

  function setSpeedDirect(speed) {
    const video = getVideo();
    if (!video) return;
    currentSpeedIndex = SPEEDS.indexOf(speed);
    video.playbackRate = speed;
    updateSpeedDisplay();
    showToast(`Vitesse : ${speed}×`);
  }

  function updateSpeedDisplay() {
    const btn = document.getElementById('bcr-speed-btn');
    if (btn) btn.textContent = `${SPEEDS[currentSpeedIndex]}×`;
    document.querySelectorAll('.bcr-speed-option').forEach(el => {
      el.classList.toggle('bcr-speed-option--active', parseFloat(el.dataset.speed) === SPEEDS[currentSpeedIndex]);
    });
  }

  // ─── Theater Mode ────────────────────────────────────────────────────────────

  function toggleTheaterMode() {
    isTheaterMode = !isTheaterMode;

    let style = document.getElementById('bcr-theater-style');
    if (!style) {
      style = document.createElement('style');
      style.id = 'bcr-theater-style';
      document.head.appendChild(style);
    }

    if (isTheaterMode) {
      style.textContent = `
        /* BetterCrunchyroll - Theater Mode */
        header, nav, [class*="header"], [class*="nav-bar"], [class*="sidebar"],
        [class*="recommendations"], [class*="related"], footer { display: none !important; }
        [class*="video-player"], [class*="player-container"] {
          width: 100vw !important;
          max-width: 100vw !important;
        }
        body { overflow: hidden !important; }
      `;
      showToast('🎭 Mode théâtre activé  (T pour désactiver)');
    } else {
      style.textContent = '';
      showToast('Mode théâtre désactivé');
    }

    const btn = document.getElementById('bcr-theater-btn');
    if (btn) btn.classList.toggle('bcr-ctrl-btn--active', isTheaterMode);
  }

  // ─── Picture-in-Picture ───────────────────────────────────────────────────────

  function togglePiP(video) {
    if (!document.pictureInPictureEnabled) {
      showToast('PiP non supporté par ce navigateur');
      return;
    }
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(() => {});
      showToast('PiP désactivé');
    } else {
      video.requestPictureInPicture().then(() => {
        showToast('📺 Picture-in-Picture');
      }).catch(() => {
        showToast('Impossible d\'activer le PiP');
      });
    }
  }

  // ─── Controls Overlay ─────────────────────────────────────────────────────────

  const CONTROLS_CSS = `
    #bcr-player-controls {
      position: fixed;
      top: 16px;
      right: 16px;
      z-index: 9999;
      display: flex;
      align-items: center;
      gap: 6px;
      background: rgba(0,0,0,0.75);
      padding: 6px 10px;
      border-radius: 8px;
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255,255,255,0.12);
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      transition: opacity 0.3s ease;
      user-select: none;
    }
    #bcr-player-controls.bcr-hidden { opacity: 0; pointer-events: none; }
    .bcr-ctrl-btn {
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.18);
      color: #fff;
      padding: 4px 8px;
      border-radius: 5px;
      font-size: 12px;
      cursor: pointer;
      transition: background 0.2s, color 0.2s;
      white-space: nowrap;
    }
    .bcr-ctrl-btn:hover { background: rgba(255,255,255,0.25); }
    .bcr-ctrl-btn--active { background: #f47521; border-color: #f47521; }
    .bcr-separator { width: 1px; height: 16px; background: rgba(255,255,255,0.2); }

    /* Speed popup */
    #bcr-speed-popup {
      position: fixed;
      top: 56px;
      right: 16px;
      z-index: 9999;
      background: rgba(10,10,10,0.96);
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 8px;
      overflow: hidden;
      display: none;
      flex-direction: column;
      min-width: 90px;
      backdrop-filter: blur(10px);
    }
    #bcr-speed-popup.bcr-open { display: flex; }
    .bcr-speed-option {
      padding: 8px 14px;
      font-size: 13px;
      color: rgba(255,255,255,0.8);
      cursor: pointer;
      font-family: sans-serif;
      transition: background 0.15s;
    }
    .bcr-speed-option:hover { background: rgba(255,255,255,0.1); }
    .bcr-speed-option--active { color: #f47521; font-weight: 700; }

    /* Quality popup */
    #bcr-quality-popup {
      position: fixed;
      top: 56px;
      right: 120px;
      z-index: 9999;
      background: rgba(10,10,10,0.96);
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 8px;
      overflow: hidden;
      display: none;
      flex-direction: column;
      min-width: 90px;
      backdrop-filter: blur(10px);
    }
    #bcr-quality-popup.bcr-open { display: flex; }
    .bcr-quality-option {
      padding: 8px 14px;
      font-size: 13px;
      color: rgba(255,255,255,0.8);
      cursor: pointer;
      font-family: sans-serif;
      transition: background 0.15s;
    }
    .bcr-quality-option:hover { background: rgba(255,255,255,0.1); }
    .bcr-quality-option--active { color: #f47521; font-weight: 700; }
  `;

  function injectControls() {
    if (document.getElementById('bcr-player-controls')) return;
    if (!/\/watch\//.test(window.location.pathname)) return;

    // Inject CSS
    const style = document.createElement('style');
    style.textContent = CONTROLS_CSS;
    document.head.appendChild(style);

    // Build controls bar
    const bar = document.createElement('div');
    bar.id = 'bcr-player-controls';
    bar.innerHTML = `
      <button class="bcr-ctrl-btn" id="bcr-pip-btn" title="Picture-in-Picture (I)">PiP</button>
      <div class="bcr-separator"></div>
      <button class="bcr-ctrl-btn" id="bcr-theater-btn" title="Mode théâtre (T)">Théâtre</button>
      <div class="bcr-separator"></div>
      <button class="bcr-ctrl-btn" id="bcr-quality-btn" title="Qualité vidéo">Auto ▾</button>
      <div class="bcr-separator"></div>
      <button class="bcr-ctrl-btn" id="bcr-speed-btn" title="Vitesse (&lt; &gt;)">1×</button>
    `;
    document.body.appendChild(bar);

    // Speed popup
    const speedPopup = document.createElement('div');
    speedPopup.id = 'bcr-speed-popup';
    SPEEDS.slice().reverse().forEach(s => {
      const opt = document.createElement('div');
      opt.className = 'bcr-speed-option' + (s === 1 ? ' bcr-speed-option--active' : '');
      opt.dataset.speed = String(s);
      opt.textContent = `${s}×`;
      opt.addEventListener('click', () => {
        setSpeedDirect(s);
        speedPopup.classList.remove('bcr-open');
      });
      speedPopup.appendChild(opt);
    });
    document.body.appendChild(speedPopup);

    // Quality popup (populated dynamically)
    const qualityPopup = document.createElement('div');
    qualityPopup.id = 'bcr-quality-popup';
    document.body.appendChild(qualityPopup);

    // Wire buttons
    document.getElementById('bcr-pip-btn').addEventListener('click', () => {
      const video = getVideo();
      if (video) togglePiP(video);
    });

    document.getElementById('bcr-theater-btn').addEventListener('click', () => {
      toggleTheaterMode();
    });

    document.getElementById('bcr-speed-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      speedPopup.classList.toggle('bcr-open');
      qualityPopup.classList.remove('bcr-open');
    });

    document.getElementById('bcr-quality-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      refreshQualityPopup(qualityPopup);
      qualityPopup.classList.toggle('bcr-open');
      speedPopup.classList.remove('bcr-open');
    });

    // Close popups on outside click
    document.addEventListener('click', () => {
      speedPopup.classList.remove('bcr-open');
      qualityPopup.classList.remove('bcr-open');
    });

    // Auto-hide controls when not on watch page (SPA navigation)
    observeNavigation();
  }

  // ─── Quality Selector ─────────────────────────────────────────────────────────
  // Crunchyroll uses Bitmovin player. We look for quality levels via their internal
  // player API exposed at player.getAvailableVideoQualities().

  function getBitmovinPlayer() {
    // CR exposes bitmovin on window in some versions
    if (window.bitmovin?.player) return window.bitmovin.player('video-player');
    // Fallback: look for instance stored on the video element
    const video = getVideo();
    if (video?.__player) return video.__player;
    return null;
  }

  function refreshQualityPopup(popup) {
    popup.innerHTML = '';
    const player = getBitmovinPlayer();

    if (!player) {
      const noPlayer = document.createElement('div');
      noPlayer.className = 'bcr-quality-option';
      noPlayer.textContent = 'Non disponible';
      noPlayer.style.color = 'rgba(255,255,255,0.4)';
      popup.appendChild(noPlayer);
      return;
    }

    let qualities = [];
    try {
      qualities = player.getAvailableVideoQualities?.() || [];
    } catch (e) {
      qualities = [];
    }

    if (qualities.length === 0) {
      const noQ = document.createElement('div');
      noQ.className = 'bcr-quality-option';
      noQ.textContent = 'Auto uniquement';
      noQ.style.color = 'rgba(255,255,255,0.4)';
      popup.appendChild(noQ);
      return;
    }

    // Sort descending by bitrate/height
    qualities.sort((a, b) => (b.height || b.bitrate || 0) - (a.height || a.bitrate || 0));

    const currentQuality = player.getVideoQuality?.();

    qualities.forEach(q => {
      const label = q.label || (q.height ? `${q.height}p` : q.id);
      const opt = document.createElement('div');
      opt.className = 'bcr-quality-option' + (currentQuality?.id === q.id ? ' bcr-quality-option--active' : '');
      opt.textContent = label;
      opt.addEventListener('click', () => {
        try {
          player.setVideoQuality?.(q.id);
          document.getElementById('bcr-quality-btn').textContent = label + ' ▾';
          showToast(`Qualité : ${label}`);
        } catch (e) {
          showToast('Impossible de changer la qualité');
        }
        popup.classList.remove('bcr-open');
      });
      popup.appendChild(opt);
    });
  }

  // ─── SPA Navigation Observer ──────────────────────────────────────────────────

  function observeNavigation() {
    let lastPath = window.location.pathname;

    const observer = new MutationObserver(() => {
      const currentPath = window.location.pathname;
      if (currentPath !== lastPath) {
        lastPath = currentPath;
        // Remove controls if navigated away from watch page
        const wasWatchPage = !/\/watch\//.test(currentPath);
        if (wasWatchPage) {
          document.getElementById('bcr-player-controls')?.remove();
          document.getElementById('bcr-speed-popup')?.remove();
          document.getElementById('bcr-quality-popup')?.remove();
          window.__BCR_PLAYER_ENHANCED__ = false;
        } else if (/\/watch\//.test(currentPath)) {
          setTimeout(injectControls, 1500);
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  // ─── Init ─────────────────────────────────────────────────────────────────────

  // Wait for page to settle before injecting
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(injectControls, 1500));
  } else {
    setTimeout(injectControls, 1500);
  }
})();

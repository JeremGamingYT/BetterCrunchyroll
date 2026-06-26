/**
 * On Crunchyroll's `/watch` pages, BetterCR shows its own page in the overlay
 * iframe (Header + episode info + up-next + Footer). The native Crunchyroll
 * player (Widevine DRM) must keep working — a custom player can't play the DRM
 * stream — so instead of replacing it, we **relocate** the native player on top
 * of the overlay and position it exactly over the WatchPage's `.player` slot
 * (whose viewport rect the app reports via the bridge). The player keeps its own
 * native controls (incl. Crunchyroll's own skip-intro/credits buttons); we only
 * reframe it and tint its controls to the BetterCR accent.
 */
import type { PlayerRect } from '@shared/messages';

const PLAYER_SELECTOR = '.video-player-wrapper';
/** Above the overlay root (which sits at 2147483000). */
const PLAYER_Z = '2147483600';
const POLL_MS = 350;
/**
 * The overlay's fixed header lives inside the iframe (below the relocated
 * player in the stacking order). Clip the player's top by this many pixels of
 * header so that, when the watch page is scrolled, the player slides *under*
 * the header instead of painting over it.
 */
const HEADER_CLEAR_PX = 64;

export class WatchSkin {
  private active = false;
  private rect: PlayerRect | null = null;
  private player: HTMLElement | null = null;
  private origParent: HTMLElement | null = null;
  private origNext: ChildNode | null = null;
  private origStyle = '';
  private poll = 0;
  private accent = '#ff8133';
  /**
   * Set once relocating/skinning the native player threw — most likely because
   * Crunchyroll changed the player DOM. We then leave the native player exactly
   * where it is (working, just unstyled) instead of risking a broken page.
   */
  private broken = false;

  /** Begin skinning the watch page (adopt the player as soon as it appears). */
  enable(): void {
    if (this.active) {
      return;
    }
    this.active = true;
    this.broken = false; // give a fresh watch session another attempt
    this.poll = window.setInterval(() => this.tick(), POLL_MS);
    this.tick();
  }

  /** Stop skinning and return the player to its original place. */
  disable(): void {
    if (!this.active) {
      return;
    }
    this.active = false;
    window.clearInterval(this.poll);
    this.rect = null;
    this.restorePlayer();
  }

  /** Latest player-slot rect from the app (null releases/hides the player). */
  setRect(rect: PlayerRect | null): void {
    this.rect = rect;
    try {
      this.apply();
    } catch (error) {
      this.failSafe(error);
    }
  }

  /** Accent colour used to frame the player + tint its controls. */
  setAccent(color: string): void {
    this.accent = color || this.accent;
    this.player?.style.setProperty('--bcr-acc', this.accent);
  }

  private tick(): void {
    if (!this.active || this.broken) {
      return;
    }
    try {
      const el = document.querySelector<HTMLElement>(PLAYER_SELECTOR);
      if (el && el !== this.player && el.isConnected) {
        this.adopt(el);
      }
      this.apply();
    } catch (error) {
      this.failSafe(error);
    }
  }

  /**
   * Last-resort guard for the only DOM-coupled surface in BetterCR. If adopting
   * or framing the native player ever throws (e.g. Crunchyroll reshaped the
   * player), stop skinning and hand the native player back untouched — a plain
   * working player beats a broken one.
   */
  private failSafe(error: unknown): void {
    this.broken = true;
    window.clearInterval(this.poll);
    console.warn(
      '[BetterCR] watch-player skinning failed — leaving the native Crunchyroll player untouched',
      error,
    );
    try {
      this.restorePlayer();
    } catch {
      /* nothing more we can safely do */
    }
  }

  private adopt(el: HTMLElement): void {
    this.restorePlayer();
    this.ensureStyle();
    this.player = el;
    this.origParent = el.parentElement;
    this.origNext = el.nextSibling;
    this.origStyle = el.getAttribute('style') ?? '';
    el.classList.add('bcr-adopted');
    el.style.position = 'fixed';
    el.style.zIndex = PLAYER_Z;
    el.style.margin = '0';
    el.style.maxWidth = 'none';
    el.style.background = '#000';
    el.style.setProperty('--bcr-acc', this.accent);
    document.body.appendChild(el);
    this.apply();
  }

  /** Frames the player + sizes its inner containers + tints the controls. */
  private ensureStyle(): void {
    if (document.getElementById('bcr-watch-fill')) {
      return;
    }
    const style = document.createElement('style');
    style.id = 'bcr-watch-fill';
    style.textContent = `
      /* Frame the relocated native player like a BetterCR card. */
      .bcr-adopted {
        border-radius: 16px;
        overflow: hidden;
        box-shadow:
          0 28px 80px rgba(0, 0, 0, 0.6),
          0 0 0 1.5px color-mix(in srgb, var(--bcr-acc, #ff8133) 42%, transparent);
      }
      /* The spacer creates CR's aspect-ratio; we size the wrapper ourselves. */
      .bcr-adopted .video-player-spacer { display: none !important; }
      .bcr-adopted .player-container {
        position: absolute !important;
        inset: 0 !important;
        width: 100% !important;
        height: 100% !important;
      }
      .bcr-adopted .bitmovinplayer-container,
      .bcr-adopted .bitmovinplayer-poster,
      .bcr-adopted video {
        width: 100% !important;
        height: 100% !important;
        left: 0 !important;
        top: 0 !important;
        max-height: none !important;
      }
      .bcr-adopted video { object-fit: contain; background: #000; }

      /* ── Tint the native player controls to the BetterCR accent ── */
      /* Seek bar: recolour only the thin native track (the element itself is a
         tall hit-area — leave it transparent so the bar stays thin). */
      .bcr-adopted .timeline-slider { background: transparent !important; }
      .bcr-adopted .timeline-slider::-webkit-slider-runnable-track {
        background-image: linear-gradient(
          to right,
          var(--bcr-acc, #ff8133) 0,
          var(--bcr-acc, #ff8133) var(--timeline-progress-percent, 0%),
          rgba(255, 255, 255, 0.5) var(--timeline-progress-percent, 0%),
          rgba(255, 255, 255, 0.5) var(--moz-progress-gradient-percent, 0%),
          rgba(255, 255, 255, 0.2) var(--moz-progress-gradient-percent, 0%),
          rgba(255, 255, 255, 0.2) 100%
        ) !important;
      }
      .bcr-adopted .timeline-slider::-webkit-slider-thumb {
        background: var(--bcr-acc, #ff8133) !important;
      }
      .bcr-adopted .volume-slider { accent-color: var(--bcr-acc, #ff8133) !important; }
      .bcr-adopted .volume-slider::-webkit-slider-thumb {
        background: var(--bcr-acc, #ff8133) !important;
      }
      /* Round the hover preview (trickplay) thumbnails. */
      .bcr-adopted [data-testid="trickplay-container"] { border-radius: 10px !important; overflow: hidden !important; }
      .bcr-adopted [data-testid="trickplay-image"] {
        border-radius: 10px !important;
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.45) !important;
      }
      /* Buttons: accent on hover/focus + the primary play/pause always accent. */
      .bcr-adopted [data-testid="bottom-controls-autohide"] button:hover,
      .bcr-adopted [data-testid="bottom-controls-autohide"] button:focus-visible,
      .bcr-adopted [data-testid="volume-slider-container"]:hover {
        color: var(--bcr-acc, #ff8133) !important;
        fill: var(--bcr-acc, #ff8133) !important;
        opacity: 1 !important;
      }
      .bcr-adopted [data-testid="play-pause-button"] {
        color: var(--bcr-acc, #ff8133) !important;
        fill: var(--bcr-acc, #ff8133) !important;
        opacity: 1 !important;
      }`;
    (document.head ?? document.documentElement).appendChild(style);
  }

  private apply(): void {
    if (!this.player) {
      return;
    }
    const r = this.rect;
    const s = this.player.style;
    if (!r || r.width < 2 || r.height < 2) {
      s.display = 'none';
      return;
    }
    s.display = 'block';
    s.left = `${String(Math.round(r.x))}px`;
    s.top = `${String(Math.round(r.y))}px`;
    s.width = `${String(Math.round(r.width))}px`;
    s.height = `${String(Math.round(r.height))}px`;
    // Clip whatever scrolls above the header line so the player never paints
    // over the fixed overlay header.
    const clipTop = Math.max(0, HEADER_CLEAR_PX - r.y);
    s.clipPath = clipTop > 0 ? `inset(${String(Math.round(clipTop))}px 0 0 0)` : '';
  }

  private restorePlayer(): void {
    if (!this.player) {
      return;
    }
    // Stop playback when leaving /watch — we only pushState (no reload), so the
    // native player would otherwise keep playing audio in the background.
    this.player.querySelectorAll('video, audio').forEach((media) => {
      try {
        (media as HTMLMediaElement).pause();
      } catch {
        /* ignore */
      }
    });
    this.player.classList.remove('bcr-adopted');
    this.player.setAttribute('style', this.origStyle);
    if (this.origParent?.isConnected) {
      this.origParent.insertBefore(this.player, this.origNext);
    }
    this.player = null;
    this.origParent = null;
    this.origNext = null;
  }
}

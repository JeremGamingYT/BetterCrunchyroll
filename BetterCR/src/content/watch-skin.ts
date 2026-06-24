/**
 * On Crunchyroll's `/watch` pages, BetterCR shows its own page in the overlay
 * iframe (Header + episode info + up-next + Footer). The native Crunchyroll
 * player (Bitmovin `<video>`, Widevine DRM) must keep working — a custom player
 * can't play the DRM stream — so instead of replacing it, we **relocate** the
 * native player on top of the overlay and position it exactly over the
 * WatchPage's `.player` slot (whose viewport rect the app reports via the
 * bridge). The player keeps its own native controls.
 *
 * On top of that we add a purely additive "Skip intro / recap / credits"
 * button driven by Crunchyroll's skip-event markers: it only reads the
 * `<video>`'s currentTime and seeks on click — the player itself is untouched,
 * so this degrades to nothing if markers are missing or the video can't be
 * found.
 */
import type { PlayerRect } from '@shared/messages';

const PLAYER_SELECTOR = '.video-player-wrapper';
/** Above the overlay root (which sits at 2147483000). */
const PLAYER_Z = '2147483600';
const POLL_MS = 350;
/** Hide the skip button this many seconds before a segment ends. */
const SKIP_TAIL_S = 1.5;
/**
 * The overlay's fixed header lives inside the iframe (below the relocated
 * player in the stacking order). Clip the player's top by this many pixels of
 * header so that, when the watch page is scrolled, the player slides *under*
 * the header instead of painting over it.
 */
const HEADER_CLEAR_PX = 64;

export type SkipKind = 'recap' | 'intro' | 'credits';

export interface SkipSegment {
  readonly kind: SkipKind;
  readonly start: number;
  readonly end: number;
}

const SKIP_LABELS: Record<SkipKind, { fr: string; en: string }> = {
  recap: { fr: 'Passer le récap', en: 'Skip recap' },
  intro: { fr: "Passer l'intro", en: 'Skip intro' },
  credits: { fr: 'Passer le générique', en: 'Skip credits' },
};

const isFrench = (): boolean =>
  (document.documentElement.lang || 'fr').toLowerCase().startsWith('fr');

export class WatchSkin {
  private active = false;
  private rect: PlayerRect | null = null;
  private player: HTMLElement | null = null;
  private origParent: HTMLElement | null = null;
  private origNext: ChildNode | null = null;
  private origStyle = '';
  private poll = 0;

  private segments: readonly SkipSegment[] = [];
  private video: HTMLVideoElement | null = null;
  private skipBtn: HTMLButtonElement | null = null;
  private skipTarget = 0;
  private accent = '#ff8133';
  private readonly onTime = (): void => this.updateSkip();

  /** Begin skinning the watch page (adopt the player as soon as it appears). */
  enable(): void {
    if (this.active) {
      return;
    }
    this.active = true;
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
    this.apply();
  }

  /** Skip markers (intro/recap/credits) for the current episode. */
  setSkipEvents(segments: readonly SkipSegment[]): void {
    this.segments = segments;
    this.updateSkip();
  }

  /** Accent colour used to frame the player so it matches the BetterCR theme. */
  setAccent(color: string): void {
    this.accent = color || this.accent;
    this.player?.style.setProperty('--bcr-acc', this.accent);
  }

  private tick(): void {
    if (!this.active) {
      return;
    }
    const el = document.querySelector<HTMLElement>(PLAYER_SELECTOR);
    if (el && el !== this.player && el.isConnected) {
      this.adopt(el);
    }
    this.apply();
    this.ensureSkipUi();
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

  /** Forces the native player's inner containers/video to fill the slot. */
  private ensureStyle(): void {
    if (document.getElementById('bcr-watch-fill')) {
      return;
    }
    const style = document.createElement('style');
    style.id = 'bcr-watch-fill';
    style.textContent = `
      /* Frame the relocated native player like a BetterCR card: rounded, a deep
         soft shadow, and a thin accent ring that matches the SPA theme. */
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
      .bcr-skip-btn {
        position: absolute;
        right: 28px;
        bottom: 82px;
        z-index: 40;
        display: none;
        align-items: center;
        gap: 8px;
        padding: 11px 20px;
        border: 0;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.92);
        color: #0a0a0d;
        font: 700 14px/1 -apple-system, system-ui, sans-serif;
        cursor: pointer;
        box-shadow: 0 6px 24px rgba(0, 0, 0, 0.45);
        transition: background 0.15s, transform 0.15s;
      }
      .bcr-skip-btn.is-on { display: inline-flex; }
      .bcr-skip-btn:hover { background: #fff; transform: translateY(-1px); }`;
    (document.head ?? document.documentElement).appendChild(style);
  }

  /** Attach the skip button + currentTime listener once the video exists. */
  private ensureSkipUi(): void {
    if (!this.player) {
      return;
    }
    if (!this.skipBtn) {
      const btn = document.createElement('button');
      btn.className = 'bcr-skip-btn';
      btn.type = 'button';
      btn.addEventListener('click', () => {
        if (this.video) {
          this.video.currentTime = this.skipTarget;
          this.hideSkip();
        }
      });
      this.player.appendChild(btn);
      this.skipBtn = btn;
    } else if (this.skipBtn.parentElement !== this.player) {
      this.player.appendChild(this.skipBtn);
    }

    const video = this.player.querySelector('video');
    if (video && video !== this.video) {
      this.video?.removeEventListener('timeupdate', this.onTime);
      this.video = video;
      video.addEventListener('timeupdate', this.onTime);
    }
  }

  /** Show/hide the skip button based on the video's current time. */
  private updateSkip(): void {
    if (!this.skipBtn || !this.video) {
      return;
    }
    const t = this.video.currentTime;
    const seg = this.segments.find((s) => t >= s.start && t < s.end - SKIP_TAIL_S);
    if (!seg) {
      this.hideSkip();
      return;
    }
    this.skipTarget = seg.end;
    this.skipBtn.textContent = isFrench() ? SKIP_LABELS[seg.kind].fr : SKIP_LABELS[seg.kind].en;
    this.skipBtn.classList.add('is-on');
  }

  private hideSkip(): void {
    this.skipBtn?.classList.remove('is-on');
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
    this.video?.removeEventListener('timeupdate', this.onTime);
    this.video = null;
    this.skipBtn?.remove();
    this.skipBtn = null;
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

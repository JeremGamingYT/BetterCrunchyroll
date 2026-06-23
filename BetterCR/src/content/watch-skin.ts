/**
 * On Crunchyroll's `/watch` pages, BetterCR shows its own page in the overlay
 * iframe (Header + episode info + up-next + Footer). The native Crunchyroll
 * player (Bitmovin `<video>`, Widevine DRM) must keep working — a custom player
 * can't play the DRM stream — so instead of replacing it, we **relocate** the
 * native player on top of the overlay and position it exactly over the
 * WatchPage's `.player` slot (whose viewport rect the app reports via the
 * bridge). The player keeps its own native controls.
 */
import type { PlayerRect } from '@shared/messages';

const PLAYER_SELECTOR = '.video-player-wrapper';
/** Above the overlay root (which sits at 2147483000). */
const PLAYER_Z = '2147483600';
const POLL_MS = 350;

export class WatchSkin {
  private active = false;
  private rect: PlayerRect | null = null;
  private player: HTMLElement | null = null;
  private origParent: HTMLElement | null = null;
  private origNext: ChildNode | null = null;
  private origStyle = '';
  private poll = 0;

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

  private tick(): void {
    if (!this.active) {
      return;
    }
    const el = document.querySelector<HTMLElement>(PLAYER_SELECTOR);
    if (el && el !== this.player && el.isConnected) {
      this.adopt(el);
    }
    this.apply();
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
      .bcr-adopted { border-radius: 16px; overflow: hidden; }
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
      .bcr-adopted video { object-fit: contain; background: #000; }`;
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
  }

  private restorePlayer(): void {
    if (!this.player) {
      return;
    }
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

/**
 * Manages the full-viewport iframe overlay that hosts the redesigned SPA.
 * The iframe is served from inside the extension (`chrome.runtime.getURL`),
 * so no dev server is involved.
 */
import { APP_PAGE_PATH } from '@shared/config';
import { serializeRoute, type AppRoute } from '@shared/routing';

const ROOT_ID = 'bettercr-root';
const FRAME_ID = 'bcr-frame';
// Just below the relocated native player (2147483600) so the player shows over
// the watch page's slot, while the overlay still covers all of Crunchyroll.
const COVER_STYLE =
  'position:fixed;inset:0;z-index:2147483000;width:100vw;height:100vh;background:#0a0a0d;';
const FRAME_STYLE = 'width:100%;height:100%;border:0;display:block;background:#0a0a0d;';

export class Overlay {
  /** Origin of the bundled SPA — used to validate/post bridge messages. */
  readonly appOrigin: string = new URL(chrome.runtime.getURL('')).origin;

  private frame(): HTMLIFrameElement | null {
    return document.getElementById(FRAME_ID) as HTMLIFrameElement | null;
  }

  isMounted(): boolean {
    return this.frame() !== null;
  }

  /** Mounts the overlay once at `route`; idempotent afterwards (the SPA routes itself). */
  mount(route: AppRoute): void {
    if (!document.body) {
      return;
    }
    if (this.isMounted()) {
      document.documentElement.style.overflow = 'hidden';
      return;
    }

    const root = document.createElement('div');
    root.id = ROOT_ID;
    root.style.cssText = COVER_STYLE;

    const frame = document.createElement('iframe');
    frame.id = FRAME_ID;
    frame.allow = 'fullscreen; autoplay; encrypted-media; picture-in-picture; clipboard-write';
    frame.style.cssText = FRAME_STYLE;
    frame.src = chrome.runtime.getURL(APP_PAGE_PATH) + serializeRoute(route);

    root.appendChild(frame);
    document.body.appendChild(root);
    document.documentElement.style.overflow = 'hidden';
  }

  unmount(): void {
    document.getElementById(ROOT_ID)?.remove();
    document.documentElement.style.overflow = '';
  }
}

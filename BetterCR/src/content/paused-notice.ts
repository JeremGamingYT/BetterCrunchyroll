/**
 * Small, self-contained banner shown on the *native* Crunchyroll page while the
 * redesign is paused (kill switch / version floor / self-detected breakage).
 *
 * It lives in the page DOM (not the overlay iframe, which is torn down while
 * paused), so it carries its own scoped styles and never depends on the SPA. It
 * tells the user why they're seeing plain Crunchyroll and links to the releases
 * page; a dismiss remembers that exact message so it doesn't nag.
 */
import { GITHUB_RELEASES_URL } from '@shared/config';
import { noticeText, type PauseNotice, type PauseReason } from '@shared/health';

const HOST_ID = 'bcr-paused-notice';
const STYLE_ID = 'bcr-paused-style';
const DISMISS_KEY = 'bcr_paused_dismissed';
/** Just below the overlay root so it never fights the redesign for the top. */
const HOST_CSS =
  'position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:2147482000;max-width:calc(100vw - 32px);';

function lang(): 'fr' | 'en' {
  return navigator.language.toLowerCase().startsWith('fr') ? 'fr' : 'en';
}

function detailsLabel(l: 'fr' | 'en'): string {
  return l === 'fr' ? 'Détails' : 'Details';
}

function dismissLabel(l: 'fr' | 'en'): string {
  return l === 'fr' ? 'Masquer' : 'Dismiss';
}

export class PausedNotice {
  /** Shows the banner for `reason` (idempotent). Dismissed messages stay hidden. */
  show(reason: PauseReason, notice: PauseNotice | undefined): void {
    const l = lang();
    const text = noticeText(notice, reason, l);
    const key = `${reason}:${text}`;
    if (this.isDismissed(key)) {
      this.hide();
      return;
    }
    const existing = document.getElementById(HOST_ID);
    if (existing) {
      if (existing.dataset.key === key) {
        return;
      }
      existing.remove();
    }
    if (!document.body) {
      return;
    }
    this.injectStyle();
    const host = document.createElement('div');
    host.id = HOST_ID;
    host.dataset.key = key;
    host.style.cssText = HOST_CSS;
    host.innerHTML = this.template(text, l);
    document.body.appendChild(host);
    host.querySelector('.bcr-pn-x')?.addEventListener('click', () => this.dismiss(key));
  }

  /** Removes the banner from the page (used when the redesign resumes). */
  hide(): void {
    document.getElementById(HOST_ID)?.remove();
  }

  private dismiss(key: string): void {
    try {
      localStorage.setItem(DISMISS_KEY, key);
    } catch {
      /* private mode — fall through, banner just won't persist its dismissal */
    }
    this.hide();
  }

  private isDismissed(key: string): boolean {
    try {
      return localStorage.getItem(DISMISS_KEY) === key;
    } catch {
      return false;
    }
  }

  private template(text: string, l: 'fr' | 'en'): string {
    return `
      <div class="bcr-pn-card" role="status">
        <span class="bcr-pn-dot" aria-hidden="true"></span>
        <span class="bcr-pn-txt">${escapeHtml(text)}</span>
        <a class="bcr-pn-go" href="${GITHUB_RELEASES_URL}" target="_blank" rel="noopener noreferrer">${detailsLabel(l)}</a>
        <button class="bcr-pn-x" type="button" aria-label="${dismissLabel(l)}">✕</button>
      </div>`;
  }

  private injectStyle(): void {
    if (document.getElementById(STYLE_ID)) {
      return;
    }
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${HOST_ID} .bcr-pn-card {
        display: flex; align-items: center; gap: 12px;
        padding: 11px 12px 11px 16px; border-radius: 14px;
        font: 600 13.5px/1.4 'Inter', -apple-system, system-ui, sans-serif;
        color: #f4f4f6; background: rgba(18, 18, 24, 0.96);
        border: 1px solid rgba(224, 83, 61, 0.55);
        box-shadow: 0 16px 50px rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(12px);
        animation: bcrPnIn 0.3s ease;
      }
      @keyframes bcrPnIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
      #${HOST_ID} .bcr-pn-dot { width: 9px; height: 9px; border-radius: 50%; background: #e0533d; flex: none; }
      #${HOST_ID} .bcr-pn-txt { max-width: 460px; }
      #${HOST_ID} .bcr-pn-go {
        flex: none; padding: 6px 12px; border-radius: 8px; text-decoration: none;
        font-weight: 800; color: #160a02; background: #ff8133;
      }
      #${HOST_ID} .bcr-pn-x {
        flex: none; width: 30px; height: 30px; border: 0; border-radius: 8px; cursor: pointer;
        background: rgba(255, 255, 255, 0.06); color: #9aa0ac; font-size: 13px;
      }
      #${HOST_ID} .bcr-pn-x:hover { background: rgba(255, 255, 255, 0.12); color: #f4f4f6; }`;
    (document.head ?? document.documentElement).appendChild(style);
  }
}

/** Escapes the (maintainer-authored) notice before injecting it as HTML. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

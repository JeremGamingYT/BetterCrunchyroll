/**
 * BetterCR toolbar popup (the extension "menu").
 *
 * Lets the user toggle the whole redesign on/off (the content script reacts
 * live via chrome.storage), and surfaces an update notice by comparing the
 * installed version with the latest GitHub release. A self-hosted/unpacked
 * build can't silently auto-install, so this is a check-and-prompt notifier.
 */
import {
  ENABLED_STORAGE_KEY,
  GITHUB_LATEST_API,
  GITHUB_RELEASES_URL,
  GITHUB_REPO,
  HEALTH_STORAGE_KEY,
  UPDATE_STORAGE_KEY,
} from '@shared/config';
import { isNewer } from '@shared/version';
import { noticeText, type HealthVerdict } from '@shared/health';
import './popup.css';

type Lang = 'fr' | 'en';
const lang: Lang = navigator.language.toLowerCase().startsWith('fr') ? 'fr' : 'en';
const T = {
  fr: {
    tagline: 'Refonte de Crunchyroll',
    enabled: 'Extension activée',
    onHint: 'Le design BetterCR est actif sur Crunchyroll.',
    offHint: 'Crunchyroll s’affiche normalement.',
    checking: 'Vérification des mises à jour…',
    upToDate: 'À jour',
    update: 'Mise à jour disponible',
    download: 'Télécharger',
    github: 'Code source',
    bug: 'Signaler un bug',
    paused: 'BetterCR en pause',
  },
  en: {
    tagline: 'Crunchyroll redesign',
    enabled: 'Extension enabled',
    onHint: 'The BetterCR design is active on Crunchyroll.',
    offHint: 'Crunchyroll shows normally.',
    checking: 'Checking for updates…',
    upToDate: 'Up to date',
    update: 'Update available',
    download: 'Download',
    github: 'Source code',
    bug: 'Report a bug',
    paused: 'BetterCR paused',
  },
}[lang];

const version = chrome.runtime.getManifest().version;

function getLocal<T>(key: string): Promise<T | undefined> {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get(key, (result) => resolve(result[key] as T | undefined));
    } catch {
      resolve(undefined);
    }
  });
}

function openTab(url: string): void {
  try {
    void chrome.tabs.create({ url });
  } catch {
    window.open(url, '_blank', 'noopener');
  }
}

const root = document.getElementById('root');
if (root) {
  root.innerHTML = `
    <header class="pop-head">
      <span class="pop-wordmark">better<b>CR</b></span>
      <span class="pop-ver">v${version}</span>
    </header>
    <p class="pop-tag">${T.tagline}</p>

    <button class="pop-toggle" id="toggle" role="switch">
      <span class="pop-toggle-txt">
        <b>${T.enabled}</b>
        <span class="pop-toggle-hint" id="hint"></span>
      </span>
      <span class="pop-switch"><i></i></span>
    </button>

    <button class="pop-paused" id="paused" hidden>
      <span class="pop-paused-dot" aria-hidden="true"></span>
      <span class="pop-paused-txt">
        <b id="paused-title"></b>
        <span class="pop-paused-hint" id="paused-hint"></span>
      </span>
    </button>

    <div class="pop-update" id="update">
      <span class="pop-dot" aria-hidden="true"></span>
      <span id="update-txt">${T.checking}</span>
      <a class="pop-dl" id="dl" hidden>${T.download}</a>
    </div>

    <footer class="pop-foot">
      <a id="gh">${T.github}</a>
      <span class="pop-sep">·</span>
      <a id="bug">${T.bug}</a>
    </footer>
  `;

  const toggle = root.querySelector<HTMLButtonElement>('#toggle');
  const hint = root.querySelector<HTMLElement>('#hint');
  const updateBox = root.querySelector<HTMLElement>('#update');
  const updateTxt = root.querySelector<HTMLElement>('#update-txt');
  const dl = root.querySelector<HTMLAnchorElement>('#dl');

  const renderToggle = (on: boolean): void => {
    toggle?.classList.toggle('is-on', on);
    toggle?.setAttribute('aria-checked', String(on));
    if (hint) hint.textContent = on ? T.onHint : T.offHint;
  };

  // Master on/off (defaults to enabled).
  void getLocal<boolean>(ENABLED_STORAGE_KEY).then((value) => renderToggle(value !== false));
  toggle?.addEventListener('click', () => {
    const next = !toggle.classList.contains('is-on');
    renderToggle(next);
    try {
      void chrome.storage.local.set({ [ENABLED_STORAGE_KEY]: next });
    } catch {
      /* ignore */
    }
  });

  // Compatibility kill switch: when paused, explain it here too (the redesign is
  // standing aside for the native site) and link to the releases page.
  const pausedBox = root.querySelector<HTMLButtonElement>('#paused');
  const pausedTitle = root.querySelector<HTMLElement>('#paused-title');
  const pausedHint = root.querySelector<HTMLElement>('#paused-hint');
  void getLocal<HealthVerdict>(HEALTH_STORAGE_KEY).then((verdict) => {
    if (!verdict?.paused || !verdict.reason || !pausedBox || !pausedTitle || !pausedHint) {
      return;
    }
    pausedTitle.textContent = T.paused;
    pausedHint.textContent = noticeText(verdict.notice, verdict.reason, lang);
    pausedBox.hidden = false;
    pausedBox.addEventListener('click', () => openTab(GITHUB_RELEASES_URL));
  });

  // Update notice: show cached state instantly, then refresh from GitHub.
  const showUpdate = (latest: string | null): void => {
    const available = latest !== null && isNewer(latest, version);
    if (available && updateTxt && dl && updateBox) {
      updateBox.classList.add('is-available');
      updateTxt.textContent = `${T.update} (v${latest})`;
      dl.hidden = false;
    } else if (updateTxt && updateBox) {
      updateBox.classList.remove('is-available');
      updateTxt.textContent = `✓ ${T.upToDate}`;
    }
  };

  void getLocal<{ latest?: string }>(UPDATE_STORAGE_KEY).then((cached) => {
    if (cached?.latest) showUpdate(cached.latest);
  });

  void (async (): Promise<void> => {
    try {
      const response = await fetch(GITHUB_LATEST_API, {
        headers: { Accept: 'application/vnd.github+json' },
      });
      if (!response.ok) {
        return;
      }
      const data = (await response.json()) as { tag_name?: string };
      const latest = data.tag_name ?? null;
      if (latest) {
        try {
          void chrome.storage.local.set({ [UPDATE_STORAGE_KEY]: { latest, at: Date.now() } });
        } catch {
          /* ignore */
        }
      }
      showUpdate(latest);
    } catch {
      /* offline / rate-limited — keep cached state */
    }
  })();

  dl?.addEventListener('click', () => openTab(GITHUB_RELEASES_URL));
  root
    .querySelector('#gh')
    ?.addEventListener('click', () => openTab(`https://github.com/${GITHUB_REPO}`));
  root
    .querySelector('#bug')
    ?.addEventListener('click', () => openTab(`https://github.com/${GITHUB_REPO}/issues`));
}

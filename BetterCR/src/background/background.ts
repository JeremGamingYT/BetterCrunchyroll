/**
 * Background service worker (MV3).
 *
 * Installs a dynamic `declarativeNetRequest` rule that strips the
 * `Content-Security-Policy` and `X-Frame-Options` response headers from
 * Crunchyroll document responses. Without this, the page CSP (`frame-src`)
 * would block the extension's overlay iframe, so the redesigned UI could not
 * be embedded. Scoped to crunchyroll.com documents only.
 */
import { GITHUB_LATEST_API, TOKEN_STORAGE_KEY, UPDATE_STORAGE_KEY } from '@shared/config';
import { isNewer } from '@shared/version';

const LOG_PREFIX = '[BetterCR:bg]';
const CSP_RULE_ID = 1;
const UPDATE_ALARM = 'bcr-update-check';
const UPDATE_PERIOD_MIN = 720; // twice a day

/**
 * Checks GitHub for a newer release and reflects it as a toolbar badge + a
 * cached record the popup reads. A self-hosted/unpacked build can't silently
 * auto-install, so this is a check-and-notify mechanism.
 */
async function checkForUpdate(): Promise<void> {
  try {
    const response = await fetch(GITHUB_LATEST_API, {
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (!response.ok) {
      return;
    }
    const data = (await response.json()) as { tag_name?: string };
    const latest = data.tag_name;
    if (!latest) {
      return;
    }
    const available = isNewer(latest, chrome.runtime.getManifest().version);
    await chrome.storage.local.set({ [UPDATE_STORAGE_KEY]: { latest, available, at: Date.now() } });
    await chrome.action.setBadgeBackgroundColor({ color: '#ff8133' });
    await chrome.action.setBadgeText({ text: available ? '•' : '' });
  } catch {
    // Offline or rate-limited — keep the last known state.
  }
}

/** Real logout: drop the cached token and clear Crunchyroll's session cookies. */
async function clearCrunchyrollSession(): Promise<void> {
  try {
    await chrome.storage.local.remove(TOKEN_STORAGE_KEY);
  } catch {
    // Best-effort.
  }
  try {
    const cookies = await chrome.cookies.getAll({ domain: 'crunchyroll.com' });
    await Promise.all(
      cookies.map((cookie) => {
        const host = cookie.domain.replace(/^\./, '');
        return chrome.cookies.remove({ url: `https://${host}${cookie.path}`, name: cookie.name });
      }),
    );
    console.info(`${LOG_PREFIX} cleared ${String(cookies.length)} cookies`);
  } catch (error) {
    console.warn(`${LOG_PREFIX} cookie clear failed`, error);
  }
}

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if ((message as { type?: unknown })?.type === 'BCR_LOGOUT') {
    void clearCrunchyrollSession().then(() => sendResponse({ ok: true }));
    return true; // keep the channel open for the async response
  }
  return undefined;
});

async function installCspRelaxRule(): Promise<void> {
  try {
    await chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: [CSP_RULE_ID],
      addRules: [
        {
          id: CSP_RULE_ID,
          priority: 1,
          action: {
            type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
            responseHeaders: [
              {
                header: 'content-security-policy',
                operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE,
              },
              {
                header: 'content-security-policy-report-only',
                operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE,
              },
              {
                header: 'x-frame-options',
                operation: chrome.declarativeNetRequest.HeaderOperation.REMOVE,
              },
            ],
          },
          condition: {
            urlFilter: '||crunchyroll.com',
            resourceTypes: [
              chrome.declarativeNetRequest.ResourceType.MAIN_FRAME,
              chrome.declarativeNetRequest.ResourceType.SUB_FRAME,
            ],
          },
        },
      ],
    });
    console.info(`${LOG_PREFIX} CSP relax rule installed`);
  } catch (error) {
    console.warn(`${LOG_PREFIX} failed to install CSP rule`, error);
  }
}

chrome.runtime.onInstalled.addListener((details) => {
  console.info(`${LOG_PREFIX} installed (${details.reason})`);
  void installCspRelaxRule();
  void checkForUpdate();
  try {
    chrome.alarms.create(UPDATE_ALARM, { periodInMinutes: UPDATE_PERIOD_MIN });
  } catch {
    /* alarms unavailable */
  }
});

chrome.runtime.onStartup.addListener(() => {
  void installCspRelaxRule();
  void checkForUpdate();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === UPDATE_ALARM) {
    void checkForUpdate();
  }
});

// Session rules are cleared when the worker's session ends; (re)install on load.
// (Update checks only run on install/startup/alarm — not on every worker wake —
// to avoid hammering the GitHub API, which is rate-limited.)
void installCspRelaxRule();

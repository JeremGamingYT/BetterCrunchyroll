/**
 * Background service worker (MV3).
 *
 * Installs a dynamic `declarativeNetRequest` rule that strips the
 * `Content-Security-Policy` and `X-Frame-Options` response headers from
 * Crunchyroll document responses. Without this, the page CSP (`frame-src`)
 * would block the extension's overlay iframe, so the redesigned UI could not
 * be embedded. Scoped to crunchyroll.com documents only.
 */
import { TOKEN_STORAGE_KEY } from '@shared/config';

const LOG_PREFIX = '[BetterCR:bg]';
const CSP_RULE_ID = 1;

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
});

chrome.runtime.onStartup.addListener(() => {
  void installCspRelaxRule();
});

// Session rules are cleared when the worker's session ends; (re)install on load.
void installCspRelaxRule();

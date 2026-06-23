import { defineManifest } from '@crxjs/vite-plugin';
import pkg from './package.json';

/**
 * MV3 manifest for BetterCR.
 *
 * The content script runs at `document_start` on Crunchyroll, injects the
 * page-context token interceptor, and mounts the redesigned SPA in an iframe
 * overlay. All API calls are proxied through the content script (which holds
 * the intercepted Bearer token), so the SPA itself ships statically — no
 * backend server is involved.
 */
export default defineManifest({
  manifest_version: 3,
  name: 'BetterCR',
  version: pkg.version,
  description: pkg.description,
  icons: {
    16: 'icons/logo.png',
    32: 'icons/logo.png',
    48: 'icons/logo.png',
    128: 'icons/logo.png',
  },
  action: {
    default_title: 'BetterCR',
    default_icon: 'icons/logo.png',
  },
  permissions: ['storage', 'activeTab', 'declarativeNetRequest', 'cookies'],
  host_permissions: [
    'https://www.crunchyroll.com/*',
    'https://beta-api.crunchyroll.com/*',
    'https://cr-play-service.prd.crunchyrollsvc.com/*',
    'https://static.crunchyroll.com/*',
    'https://graphql.anilist.co/*',
    'https://api.jikan.moe/*',
    'https://kitsu.io/*',
    'https://*.vercel.app/*',
  ],
  background: {
    service_worker: 'src/background/background.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: ['https://www.crunchyroll.com/*'],
      js: ['src/content/content-script.ts'],
      run_at: 'document_start',
      all_frames: false,
    },
  ],
  web_accessible_resources: [
    {
      resources: ['src/app/index.html', 'assets/*', 'icons/*', 'inject/*'],
      matches: ['https://www.crunchyroll.com/*'],
    },
  ],
});

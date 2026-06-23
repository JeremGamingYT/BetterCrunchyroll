/**
 * Route model shared by the content script (which maps Crunchyroll URLs to an
 * initial route and reflects SPA navigation back into the address bar) and the
 * SPA router. Routes serialize to a URL hash so the overlay iframe can be
 * deep-linked via `chrome.runtime.getURL(...) + '#/...'`.
 */
export type PageId =
  | 'home'
  | 'series'
  | 'films'
  | 'simulcast'
  | 'watchlist'
  | 'upcoming'
  | 'discover'
  | 'search'
  | 'detail'
  | 'watch'
  | 'notfound'
  | 'auth'
  | 'settings'
  | 'category';

export type AppRoute =
  | { readonly page: 'home' }
  | { readonly page: 'series' }
  | { readonly page: 'films' }
  | { readonly page: 'simulcast' }
  | { readonly page: 'watchlist' }
  | { readonly page: 'upcoming' }
  | { readonly page: 'discover' }
  | { readonly page: 'search' }
  | { readonly page: 'notfound' }
  | { readonly page: 'auth' }
  | { readonly page: 'settings' }
  | { readonly page: 'category'; readonly categoryId: string; readonly title?: string }
  | { readonly page: 'detail'; readonly seriesId: string }
  | { readonly page: 'watch'; readonly seriesId: string; readonly episodeId?: string };

export const HOME_ROUTE: AppRoute = { page: 'home' };

/** Serializes a route to a hash fragment, e.g. `#/detail/GRDV0019R`. */
export function serializeRoute(route: AppRoute): string {
  switch (route.page) {
    case 'category':
      return `#/category/${route.categoryId}`;
    case 'detail':
      return `#/detail/${route.seriesId}`;
    case 'watch':
      return route.episodeId
        ? `#/watch/${route.seriesId || '_'}/${route.episodeId}`
        : `#/watch/${route.seriesId}`;
    default:
      return `#/${route.page}`;
  }
}

/** Parses a hash fragment back into a route, defaulting to home. */
export function parseRoute(hash: string): AppRoute {
  const segments = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const page = segments[0];
  switch (page) {
    case 'series':
    case 'films':
    case 'simulcast':
    case 'watchlist':
    case 'upcoming':
    case 'discover':
    case 'search':
    case 'notfound':
    case 'auth':
    case 'settings':
      return { page };
    case 'category': {
      const categoryId = segments[1];
      return categoryId ? { page: 'category', categoryId } : HOME_ROUTE;
    }
    case 'detail': {
      const seriesId = segments[1];
      return seriesId ? { page: 'detail', seriesId } : HOME_ROUTE;
    }
    case 'watch': {
      const rawSeries = segments[1];
      const episodeId = segments[2];
      const seriesId = rawSeries === '_' ? '' : (rawSeries ?? '');
      if (!seriesId && !episodeId) {
        return HOME_ROUTE;
      }
      return episodeId ? { page: 'watch', seriesId, episodeId } : { page: 'watch', seriesId };
    }
    default:
      return HOME_ROUTE;
  }
}

/** True when a Crunchyroll pathname is a native watch page (kept as-is). */
export function isWatchPath(pathname: string): boolean {
  return /\/watch\//.test(pathname);
}

/**
 * Maps a Crunchyroll pathname to the SPA route the overlay should open with.
 * Locale prefixes (e.g. `/fr/`) are stripped first.
 */
export function mapCrPathToRoute(pathname: string): AppRoute {
  const clean = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, '');

  const watchMatch = /^\/watch\/([A-Za-z0-9]+)/.exec(clean);
  if (watchMatch?.[1]) {
    return { page: 'watch', seriesId: '', episodeId: watchMatch[1] };
  }

  const seriesMatch = /^\/series\/([A-Z0-9]+)/.exec(clean);
  if (seriesMatch?.[1]) {
    return { page: 'detail', seriesId: seriesMatch[1] };
  }

  if (/^\/?$/.test(clean) || /^\/discover/.test(clean)) {
    return HOME_ROUTE;
  }
  if (/^\/(videos\/movies|movies|films)/.test(clean)) {
    return { page: 'films' };
  }
  if (/^\/(simulcast|seasonal)/.test(clean)) {
    return { page: 'simulcast' };
  }
  if (/^\/watchlist/.test(clean)) {
    return { page: 'watchlist' };
  }
  return HOME_ROUTE;
}

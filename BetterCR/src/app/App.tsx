import { useCallback, useEffect, useMemo, useState } from 'react';
import { bridge } from '@core/api/transport';
import { parseRoute, serializeRoute, type AppRoute } from '@shared/routing';
import { RouterContext, type Router } from '@app/router';
import { ProfileProvider } from '@app/profile';
import { Header } from '@app/components/Header';
import { Footer } from '@app/components/Footer';
import { SearchOverlay } from '@app/components/SearchOverlay';
import { TweaksPanel } from '@app/tweaks/TweaksPanel';
import { useTweaks, type TweaksController } from '@app/tweaks/useTweaks';
import { HomePage } from '@app/pages/HomePage';
import { GridPage } from '@app/pages/GridPage';
import { DetailPage } from '@app/pages/DetailPage';
import { WatchlistPage } from '@app/pages/WatchlistPage';
import { NotFoundPage } from '@app/pages/NotFoundPage';
import { SettingsPage } from '@app/pages/SettingsPage';
import { CategoryPage } from '@app/pages/CategoryPage';
import { WatchPage } from '@app/pages/WatchPage';
import { AuthPage, GoodbyeOverlay } from '@app/pages/AuthPage';

const GOODBYE_DURATION_MS = 2300;
/** While shown the login page, keep re-checking so we auto-recover a session. */
const GUEST_RECHECK_MS = 4000;

type AuthState = 'checking' | 'authed' | 'guest';

/** Crunchyroll URL a route should reflect in the address bar (null = leave as-is). */
function routeToCrPath(route: AppRoute): string | null {
  if (route.page === 'detail') {
    return `/series/${route.seriesId}`;
  }
  if (route.page === 'watch') {
    return `/watch/${route.episodeId ?? route.seriesId}`;
  }
  return null;
}

function renderPage(route: AppRoute): React.JSX.Element {
  switch (route.page) {
    case 'series':
      return <GridPage variant="series" />;
    case 'films':
      return <GridPage variant="films" />;
    case 'simulcast':
      return <GridPage variant="simulcast" />;
    case 'watchlist':
      return <WatchlistPage />;
    case 'settings':
      return <SettingsPage />;
    case 'category':
      return <CategoryPage categoryId={route.categoryId} title={route.title} />;
    case 'notfound':
      return <NotFoundPage />;
    case 'detail':
      return <DetailPage seriesId={route.seriesId} />;
    case 'watch':
      return <WatchPage seriesId={route.seriesId} episodeId={route.episodeId} />;
    case 'auth':
    case 'home':
    default:
      return <HomePage />;
  }
}

function AuthSplash(): React.JSX.Element {
  return (
    <div className="state-view">
      <span className="hdr-wordmark state-mark">
        better<b>CR</b>
      </span>
      <span className="bye-spinner" aria-hidden="true" />
    </div>
  );
}

interface AuthedAppProps {
  readonly tweaks: TweaksController;
  readonly goodbye: boolean;
  readonly onLogout: () => void;
}

function AuthedApp({ tweaks, goodbye, onLogout }: AuthedAppProps): React.JSX.Element {
  const [route, setRoute] = useState<AppRoute>(() => parseRoute(window.location.hash));
  const [searchOpen, setSearchOpen] = useState(false);
  const [transitionKey, setTransitionKey] = useState(0);

  const go = useCallback((next: AppRoute) => {
    setRoute(next);
    setTransitionKey((key) => key + 1);
    window.scrollTo(0, 0);
    window.location.hash = serializeRoute(next);
    const crPath = routeToCrPath(next);
    if (crPath) {
      bridge.navigate(crPath);
    }
  }, []);

  useEffect(() => {
    const onHashChange = (): void => setRoute(parseRoute(window.location.hash));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const router = useMemo<Router>(() => ({ route, go }), [route, go]);

  return (
    <ProfileProvider>
      <RouterContext.Provider value={router}>
        <Header onSearch={() => setSearchOpen(true)} onLogout={onLogout} />
        <div className="page-wrap" key={transitionKey}>
          {renderPage(route)}
          <Footer />
        </div>
        <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
        <TweaksPanel tweaks={tweaks.tweaks} setTweak={tweaks.setTweak} />
        <GoodbyeOverlay show={goodbye} />
      </RouterContext.Provider>
    </ProfileProvider>
  );
}

export function App(): React.JSX.Element {
  const tweaks = useTweaks();
  const [auth, setAuth] = useState<AuthState>('checking');
  const [goodbye, setGoodbye] = useState(false);

  // Gate: the user must be signed into Crunchyroll. `checkToken` makes the
  // content script proactively acquire a token from the session cookie, so a
  // valid session is detected reliably (no spurious login screen). If none is
  // found we show the login, but keep re-checking to auto-recover later.
  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    const tick = async (): Promise<void> => {
      if (cancelled) {
        return;
      }
      const status = await bridge.checkToken();
      if (cancelled) {
        return;
      }
      if (status.hasToken) {
        setAuth('authed');
        return; // session found — stop polling
      }
      setAuth('guest');
      timer = window.setTimeout(() => void tick(), GUEST_RECHECK_MS);
    };
    void tick();
    return () => {
      cancelled = true;
      if (timer !== undefined) {
        clearTimeout(timer);
      }
    };
  }, []);

  const logout = useCallback(() => {
    setGoodbye(true);
    window.setTimeout(() => bridge.logout(), GOODBYE_DURATION_MS);
  }, []);

  if (auth === 'checking') {
    return <AuthSplash />;
  }
  if (auth === 'guest') {
    return <AuthPage onAuthenticated={() => setAuth('authed')} />;
  }
  return <AuthedApp tweaks={tweaks} goodbye={goodbye} onLogout={logout} />;
}

import { createContext, useContext } from 'react';
import type { AppRoute } from '@shared/routing';

export interface Router {
  readonly route: AppRoute;
  readonly go: (route: AppRoute) => void;
}

export const RouterContext = createContext<Router | null>(null);

export function useRouter(): Router {
  const router = useContext(RouterContext);
  if (!router) {
    throw new Error('useRouter must be used within a RouterContext provider');
  }
  return router;
}

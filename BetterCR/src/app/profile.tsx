import { createContext, useContext, type ReactNode } from 'react';
import { getProfile, type Profile } from '@core/api/client';
import { retryAsync } from '@shared/async';
import { useAsync } from '@app/hooks/useAsync';

interface ProfileState {
  readonly profile: Profile | null;
}

const ProfileContext = createContext<ProfileState>({ profile: null });

const RETRY_ATTEMPTS = 5;

export function ProfileProvider({ children }: { readonly children: ReactNode }): React.JSX.Element {
  // Retry while the result looks like a token/race failure (null profile) so the
  // name/avatar aren't stuck empty on first paint. Watch statistics are fetched
  // lazily on the settings page (by then the token is reliably warm).
  const profile = useAsync(
    () =>
      retryAsync(
        () => getProfile(),
        RETRY_ATTEMPTS,
        1000,
        (result) => result === null,
      ),
    [],
  );
  return (
    <ProfileContext.Provider value={{ profile: profile.data }}>{children}</ProfileContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- provider + hook colocated by design
export function useProfile(): ProfileState {
  return useContext(ProfileContext);
}

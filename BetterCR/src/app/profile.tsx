import { createContext, useContext, type ReactNode } from 'react';
import { getProfile, getWatchStats, type Profile, type WatchStats } from '@core/api/client';
import { retryAsync } from '@shared/async';
import { useAsync } from '@app/hooks/useAsync';

interface ProfileState {
  readonly profile: Profile | null;
  readonly stats: WatchStats | null;
}

const ProfileContext = createContext<ProfileState>({ profile: null, stats: null });

const RETRY_ATTEMPTS = 5;

export function ProfileProvider({ children }: { readonly children: ReactNode }): React.JSX.Element {
  // Retry while the result looks like a token/race failure (null profile, or
  // zero stats) so the profile and statistics aren't stuck empty.
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
  const stats = useAsync(
    () =>
      retryAsync(
        () => getWatchStats(),
        RETRY_ATTEMPTS,
        1200,
        (result) => result.episodes === 0,
      ),
    [],
  );
  return (
    <ProfileContext.Provider value={{ profile: profile.data, stats: stats.data }}>
      {children}
    </ProfileContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- provider + hook colocated by design
export function useProfile(): ProfileState {
  return useContext(ProfileContext);
}

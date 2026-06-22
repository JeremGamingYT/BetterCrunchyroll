import { createContext, useContext, type ReactNode } from 'react';
import { getProfile, getWatchStats, type Profile, type WatchStats } from '@core/api/client';
import { useAsync } from '@app/hooks/useAsync';

interface ProfileState {
  readonly profile: Profile | null;
  readonly stats: WatchStats | null;
}

const ProfileContext = createContext<ProfileState>({ profile: null, stats: null });

export function ProfileProvider({ children }: { readonly children: ReactNode }): React.JSX.Element {
  const profile = useAsync(() => getProfile(), []);
  const stats = useAsync(() => getWatchStats(), []);
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

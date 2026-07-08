import { useEffect, useState } from 'react';
import { getProfiles, type CrProfile } from '@core/api/client';
import { bridge } from '@core/api/transport';
import { useAsync } from '@app/hooks/useAsync';
import { useI18n } from '@app/i18n/i18n';
import { Icon } from '@app/components/Icon';

/** sessionStorage flag: the gate was answered for this browser session. */
const PROFILE_GATE_KEY = 'bcr_profile_gate_v1';

// eslint-disable-next-line react-refresh/only-export-components -- gate page + its session helpers colocated by design
export function markProfileGateDone(): void {
  try {
    sessionStorage.setItem(PROFILE_GATE_KEY, '1');
  } catch {
    /* best-effort */
  }
}

// eslint-disable-next-line react-refresh/only-export-components -- gate page + its session helpers colocated by design
export function isProfileGateDone(): boolean {
  try {
    return sessionStorage.getItem(PROFILE_GATE_KEY) === '1';
  } catch {
    return true; // storage unavailable — never block the app on the gate
  }
}

/**
 * Switches the Crunchyroll session to `profile` and reloads the app so every
 * surface (watchlist, history, playheads…) reloads as that profile. No-op
 * reload-wise when the profile is already the active one.
 */
// eslint-disable-next-line react-refresh/only-export-components -- gate page + its session helpers colocated by design
export async function activateProfile(profile: CrProfile, activeId?: string): Promise<void> {
  markProfileGateDone();
  if (profile.profileId === activeId) {
    return;
  }
  const switched = await bridge.switchProfile(profile.profileId);
  if (switched) {
    window.location.reload();
  }
}

export interface ProfileGatePageProps {
  readonly onDone: () => void;
}

/**
 * "Who's watching?" gate shown once per session, before the home page, when
 * the account has several Crunchyroll profiles. Single-profile accounts (or
 * an unreachable profiles API) fall through instantly.
 */
export function ProfileGatePage({ onDone }: ProfileGatePageProps): React.JSX.Element | null {
  const { t } = useI18n();
  const profilesState = useAsync(() => getProfiles(), []);
  const statusState = useAsync(() => bridge.checkToken(), []);
  const [busy, setBusy] = useState(false);

  const profiles = profilesState.data;
  const loading = profilesState.loading || statusState.loading;
  const activeId = statusState.data?.profileId;

  // Nothing to choose from → mark done and fall through to the app.
  useEffect(() => {
    if (!loading && (profiles?.length ?? 0) <= 1) {
      markProfileGateDone();
      onDone();
    }
  }, [loading, profiles, onDone]);

  if (loading || (profiles?.length ?? 0) <= 1) {
    return (
      <div className="state-view">
        <span className="hdr-wordmark state-mark">
          better<b>CR</b>
        </span>
        <span className="bye-spinner" aria-hidden="true" />
      </div>
    );
  }

  const pick = (profile: CrProfile): void => {
    if (busy) {
      return;
    }
    setBusy(true);
    void activateProfile(profile, activeId).then(() => {
      // Same profile (no reload happened) — just enter the app.
      if (profile.profileId === activeId || activeId === undefined) {
        onDone();
      } else {
        setBusy(false); // switch failed (no reload) — allow another try
      }
    });
  };

  return (
    <div className="pgate" data-screen-label="Profils">
      <h1 className="pgate-title">{t('profile.who')}</h1>
      <div className="pgate-grid">
        {(profiles ?? []).map((profile, index) => (
          <button
            key={profile.profileId}
            className={`pgate-item${profile.profileId === activeId ? ' is-active' : ''}`}
            style={{ animationDelay: `${String(index * 70)}ms` }}
            onClick={() => pick(profile)}
            disabled={busy}
          >
            <span className="pgate-avatar">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="" />
              ) : (
                <Icon name="user" size={34} />
              )}
            </span>
            <span className="pgate-name">{profile.name}</span>
            {profile.isPrimary && <Icon name="star" size={12} solid className="pgate-primary" />}
          </button>
        ))}
      </div>
    </div>
  );
}

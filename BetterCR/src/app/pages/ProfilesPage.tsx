import { useEffect, useState } from 'react';
import {
  createProfile,
  deleteProfile,
  getAvatarOptions,
  getMultiprofile,
  updateProfile,
  type CrProfile,
} from '@core/api/client';
import { bridge } from '@core/api/transport';
import { useAsync } from '@app/hooks/useAsync';
import { useI18n } from '@app/i18n/i18n';
import { activateProfile } from '@app/pages/ProfileGatePage';
import { Icon } from '@app/components/Icon';

/** Known-good avatar asset (verified live) — creation fallback when the
 *  avatar catalogue can't be loaded/parsed, so the form never dead-ends. */
const DEFAULT_AVATAR = '1046-dr-stone-senku.png';

/**
 * Derives a Crunchyroll-safe username from the display name: usernames must be
 * unique and (unlike profile names) reject accents/spaces/punctuation — the
 * live-verified format is pure alphanumeric (`TestBCR12345`). Accents are
 * folded (Léa → Lea) and a random suffix keeps it unique.
 */
function deriveUsername(profileName: string): string {
  const base = profileName
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '');
  return `${base || 'BCR'}${Math.random().toString(36).slice(2, 8)}`;
}

interface AvatarGridProps {
  readonly avatars: readonly { readonly asset: string; readonly url: string }[];
  readonly selected: string;
  readonly onPick: (asset: string) => void;
}

function AvatarGrid({ avatars, selected, onPick }: AvatarGridProps): React.JSX.Element | null {
  if (avatars.length === 0) {
    return null;
  }
  return (
    <div className="pfm-avatars">
      {avatars.map((option) => (
        <button
          key={option.asset}
          className={`pfm-avatar-opt${option.asset === selected ? ' is-on' : ''}`}
          onClick={() => onPick(option.asset)}
          type="button"
        >
          <img src={option.url} alt="" loading="lazy" decoding="async" />
        </button>
      ))}
    </div>
  );
}

/**
 * In-app Crunchyroll profile management: create (with avatar picker), rename,
 * change avatar, delete, and switch — all against the real account, no
 * redirect to the native site. Every mutation refetches the list; Crunchyroll's
 * own error message is surfaced verbatim when a call is refused.
 */
export function ProfilesPage(): React.JSX.Element {
  const { t } = useI18n();
  const [version, setVersion] = useState(0);
  const infoState = useAsync(() => getMultiprofile(), [version]);
  const statusState = useAsync(() => bridge.checkToken(), [version]);
  const avatarsState = useAsync(() => getAvatarOptions(), []);
  const info = infoState.data;
  const profiles = info?.profiles ?? [];
  const maxProfiles = info?.maxProfiles ?? 0;
  const activeId = statusState.data?.profileId;
  const avatars = avatarsState.data ?? [];

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  // Inline edit state (one profile at a time).
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [draftAvatar, setDraftAvatar] = useState('');
  // Two-step delete confirmation.
  const [armedDeleteId, setArmedDeleteId] = useState<string | null>(null);
  // Create form.
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAvatar, setNewAvatar] = useState('');

  // If the avatar catalogue is unavailable, fall back to a known-good asset so
  // the create button never stays dead for want of a pickable avatar.
  useEffect(() => {
    if (creating && !avatarsState.loading && avatars.length === 0 && !newAvatar) {
      setNewAvatar(DEFAULT_AVATAR);
    }
  }, [creating, avatarsState.loading, avatars.length, newAvatar]);

  const refresh = (): void => {
    setVersion((v) => v + 1);
    setEditingId(null);
    setArmedDeleteId(null);
    setCreating(false);
    setNewName('');
    setNewAvatar('');
  };

  const run = (action: () => Promise<{ ok: boolean; error?: string }>): void => {
    if (busy) {
      return;
    }
    setBusy(true);
    setMessage('');
    void action().then((result) => {
      setBusy(false);
      if (result.ok) {
        refresh();
      } else {
        console.warn('[BetterCR] profile mutation failed:', result.error);
        setMessage(result.error ?? t('profiles.error'));
      }
    });
  };

  const startEdit = (profile: CrProfile): void => {
    setEditingId(profile.profileId);
    setDraftName(profile.name);
    setDraftAvatar('');
    setArmedDeleteId(null);
    setCreating(false);
  };

  const saveEdit = (profile: CrProfile): void => {
    const name = draftName.trim();
    run(() =>
      updateProfile(profile.profileId, {
        ...(name && name !== profile.name ? { profileName: name } : {}),
        ...(draftAvatar ? { avatar: draftAvatar } : {}),
      }),
    );
  };

  const submitCreate = (): void => {
    const name = newName.trim();
    if (!name || !newAvatar) {
      return;
    }
    run(() =>
      createProfile({
        profileName: name,
        username: deriveUsername(name),
        avatar: newAvatar,
      }),
    );
  };

  const canCreate = maxProfiles > 0 && profiles.length < maxProfiles;

  return (
    <div className="page-pad" data-screen-label="Profils">
      <div className="page-head">
        <h1 className="page-title">{t('profile.manage')}</h1>
        <p className="page-sub">
          {t('profiles.sub')}
          {maxProfiles > 0 && (
            <span className="page-count">
              {' '}
              · {t('profiles.slots', { n: profiles.length, max: maxProfiles })}
            </span>
          )}
        </p>
      </div>

      {message && <p className="pfm-error">{message}</p>}

      <div className="pfm-grid">
        {profiles.map((profile) => {
          const isActive = profile.profileId === activeId;
          const isEditing = editingId === profile.profileId;
          const isArmed = armedDeleteId === profile.profileId;
          return (
            <div key={profile.profileId} className={`pfm-card${isActive ? ' is-active' : ''}`}>
              <span className="pfm-card-avatar">
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="" />
                ) : (
                  <Icon name="user" size={30} />
                )}
              </span>
              {isEditing ? (
                <input
                  className="pfm-input"
                  value={draftName}
                  maxLength={50}
                  onChange={(event) => setDraftName(event.target.value)}
                  autoFocus
                />
              ) : (
                <p className="pfm-card-name">
                  {profile.name}
                  {profile.isPrimary && (
                    <span className="pfm-badge">
                      <Icon name="star" size={10} solid /> {t('profiles.primary')}
                    </span>
                  )}
                </p>
              )}

              {isEditing && (
                <AvatarGrid avatars={avatars} selected={draftAvatar} onPick={setDraftAvatar} />
              )}

              <div className="pfm-actions">
                {isEditing ? (
                  <>
                    <button
                      className="btn btn-acc pfm-btn"
                      disabled={busy}
                      onClick={() => saveEdit(profile)}
                    >
                      {t('comments.save')}
                    </button>
                    <button className="pfm-link" onClick={() => setEditingId(null)}>
                      {t('comments.cancel')}
                    </button>
                  </>
                ) : (
                  <>
                    {!isActive && (
                      <button
                        className="pfm-link pfm-link-acc"
                        disabled={busy}
                        onClick={() => void activateProfile(profile, activeId)}
                      >
                        {t('profile.switch')}
                      </button>
                    )}
                    <button className="pfm-link" disabled={busy} onClick={() => startEdit(profile)}>
                      {t('comments.edit')}
                    </button>
                    {!profile.isPrimary && !isActive && (
                      <button
                        className={`pfm-link pfm-link-danger${isArmed ? ' is-armed' : ''}`}
                        disabled={busy}
                        onClick={() =>
                          isArmed
                            ? run(() => deleteProfile(profile.profileId))
                            : setArmedDeleteId(profile.profileId)
                        }
                        onBlur={() => setArmedDeleteId(null)}
                      >
                        {isArmed ? t('profiles.confirmDelete') : t('comments.delete')}
                      </button>
                    )}
                  </>
                )}
              </div>
              {isActive && <Icon name="check" size={15} className="pfm-active-check" />}
            </div>
          );
        })}

        {canCreate && !creating && (
          <button className="pfm-card pfm-card-new" onClick={() => setCreating(true)}>
            <span className="pfm-card-avatar pfm-card-plus">
              <Icon name="plus" size={26} />
            </span>
            <p className="pfm-card-name">{t('profiles.create')}</p>
          </button>
        )}
      </div>

      {creating && (
        <div className="pfm-create">
          <p className="pfm-create-title">{t('profiles.create')}</p>
          <input
            className="pfm-input"
            value={newName}
            maxLength={50}
            placeholder={t('profiles.name')}
            onChange={(event) => setNewName(event.target.value)}
            autoFocus
          />
          <AvatarGrid avatars={avatars} selected={newAvatar} onPick={setNewAvatar} />
          <div className="pfm-actions">
            <button
              className="btn btn-acc pfm-btn"
              disabled={busy || !newName.trim() || !newAvatar}
              onClick={submitCreate}
            >
              {t('profiles.create')}
            </button>
            <button className="pfm-link" onClick={() => setCreating(false)}>
              {t('comments.cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

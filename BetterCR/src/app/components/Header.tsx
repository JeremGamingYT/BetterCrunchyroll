import { useEffect, useRef, useState } from 'react';
import type { AppRoute, PageId } from '@shared/routing';
import { getNewEpisodesToday, getProfiles, type NewEpisode } from '@core/api/client';
import { getReplyNotifications, type ReplyNotif } from '@core/api/notifications';
import { bridge } from '@core/api/transport';
import { useAsync } from '@app/hooks/useAsync';
import { useRouter } from '@app/router';
import { useI18n } from '@app/i18n/i18n';
import { useProfile } from '@app/profile';
import { activateProfile } from '@app/pages/ProfileGatePage';
import { releasePlayer, suppressPlayer } from '@app/lib/playerGate';
import { Icon } from './Icon';
import { NotificationsPanel } from './NotificationsPanel';

const NOTIF_SEEN_KEY = 'bcr_notif_seen';

interface NavItem {
  readonly key: string;
  readonly page: PageId;
}

const NAV: readonly NavItem[] = [
  { key: 'nav.home', page: 'home' },
  { key: 'nav.discover', page: 'discover' },
  { key: 'nav.series', page: 'series' },
  { key: 'nav.films', page: 'films' },
  { key: 'nav.simulcast', page: 'simulcast' },
  { key: 'nav.upcoming', page: 'upcoming' },
  { key: 'nav.watchlist', page: 'watchlist' },
];

const SCROLL_THRESHOLD_PX = 30;

export interface HeaderProps {
  readonly onLogout: () => void;
}

export function Header({ onLogout }: HeaderProps): React.JSX.Element {
  const { route, go } = useRouter();
  const { t } = useI18n();
  const { profile } = useProfile();
  const displayName = profile?.username || t('menu.user');
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const notifRef = useRef<HTMLDivElement | null>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0, on: false });

  const avatarUrl = profile?.avatarUrl || '';
  // Account profiles for the in-menu switcher (section hidden when single).
  const profilesState = useAsync(() => getProfiles(), []);
  const statusState = useAsync(() => bridge.checkToken(), []);
  const accountProfiles = profilesState.data ?? [];
  const activeProfileId = statusState.data?.profileId;
  const [notifOpen, setNotifOpen] = useState(false);
  const [replies, setReplies] = useState<readonly ReplyNotif[]>([]);
  const [episodes, setEpisodes] = useState<readonly NewEpisode[]>([]);
  const [lastSeen, setLastSeen] = useState<number>(() => {
    try {
      return Number(localStorage.getItem(NOTIF_SEEN_KEY)) || 0;
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    const onScroll = (): void => setScrolled(window.scrollY > SCROLL_THRESHOLD_PX);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const place = (): void => {
      const nav = navRef.current;
      if (!nav) {
        return;
      }
      const active = nav.querySelector<HTMLElement>('[data-active="true"]');
      if (active) {
        setIndicator({ left: active.offsetLeft, width: active.offsetWidth, on: true });
      } else {
        setIndicator((prev) => ({ ...prev, on: false }));
      }
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [route]);

  useEffect(() => {
    const close = (event: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  // Poll notifications (replies to my comments) + today's new episodes.
  useEffect(() => {
    let alive = true;
    const load = (): void => {
      void getReplyNotifications().then((items) => {
        if (alive) setReplies(items);
      });
      void getNewEpisodesToday(12).then((items) => {
        if (alive) setEpisodes(items);
      });
    };
    load();
    const timer = window.setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const close = (event: MouseEvent): void => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  // Hide the floating /watch player while a header dropdown is open, so the
  // menu/notifications aren't covered by it.
  useEffect(() => {
    if (!menuOpen && !notifOpen) {
      return;
    }
    suppressPlayer();
    return () => releasePlayer();
  }, [menuOpen, notifOpen]);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const unread =
    replies.filter((notif) => notif.ts > lastSeen).length +
    (lastSeen < startOfToday.getTime() ? episodes.length : 0);

  const toggleNotifs = (): void => {
    const willOpen = !notifOpen;
    setNotifOpen(willOpen);
    if (willOpen) {
      const now = Date.now();
      setLastSeen(now);
      try {
        localStorage.setItem(NOTIF_SEEN_KEY, String(now));
      } catch {
        /* ignore */
      }
    }
  };

  const activePage: PageId | null = NAV.some((item) => item.page === route.page)
    ? route.page
    : null;
  const navigate = (page: PageId): void => go({ page } as AppRoute);

  return (
    <header className={`hdr${scrolled ? ' is-scrolled' : ''}`}>
      <div className="hdr-in">
        <button className="hdr-logo" onClick={() => navigate('home')} aria-label={t('nav.home')}>
          <span className="hdr-wordmark">
            better<b>CR</b>
          </span>
        </button>
        <nav className="hdr-nav" ref={navRef}>
          <span
            className={`hdr-ind${indicator.on ? ' is-on' : ''}`}
            style={{ left: indicator.left, width: indicator.width }}
          />
          {NAV.map((item) => (
            <button
              key={item.page}
              data-active={activePage === item.page}
              className={`hdr-link${activePage === item.page ? ' is-active' : ''}`}
              onClick={() => navigate(item.page)}
            >
              {t(item.key)}
            </button>
          ))}
        </nav>
        <div className="hdr-right" ref={menuRef}>
          <button
            className="hdr-icon"
            onClick={() => go({ page: 'search' })}
            aria-label={t('search.title')}
          >
            <Icon name="search" size={19} />
          </button>
          <div className="hdr-notif" ref={notifRef}>
            <button
              className={`hdr-icon${unread > 0 ? ' has-unread' : ''}`}
              onClick={toggleNotifs}
              aria-label={t('notif.title')}
            >
              <Icon name="bell" size={19} />
              {unread > 0 && (
                <span className="hdr-badge">{unread > 9 ? '9+' : String(unread)}</span>
              )}
            </button>
            <NotificationsPanel
              open={notifOpen}
              replies={replies}
              episodes={episodes}
              name={displayName}
              avatar={avatarUrl}
              onClose={() => setNotifOpen(false)}
            />
          </div>
          <button
            className={`hdr-avatar${menuOpen ? ' is-open' : ''}`}
            onClick={() => setMenuOpen((value) => !value)}
            aria-label={displayName}
          >
            <span className="hdr-avatar-img">
              {profile?.avatarUrl ? (
                <img src={profile.avatarUrl} alt="" />
              ) : (
                <Icon name="user" size={16} />
              )}
            </span>
            <Icon name="chevD" size={14} className="hdr-avatar-chev" />
          </button>
          <div className={`menu${menuOpen ? ' is-open' : ''}`}>
            <div className="menu-id">
              <span className="menu-avatar">
                {profile?.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="" />
                ) : (
                  <Icon name="user" size={20} />
                )}
              </span>
              <div>
                <p className="menu-name">{displayName}</p>
                <p className="menu-prem">
                  <Icon name="star" size={11} /> {t('menu.premium')}
                </p>
              </div>
            </div>
            {accountProfiles.length > 0 && (
              <div className="menu-profiles">
                <p className="menu-profiles-label">{t('profile.switch')}</p>
                {accountProfiles.map((entry) => (
                  <button
                    key={entry.profileId}
                    className={`menu-profile${entry.profileId === activeProfileId ? ' is-active' : ''}`}
                    onClick={() => void activateProfile(entry, activeProfileId)}
                  >
                    <span className="menu-profile-av">
                      {entry.avatarUrl ? (
                        <img src={entry.avatarUrl} alt="" />
                      ) : (
                        <Icon name="user" size={13} />
                      )}
                    </span>
                    <span className="menu-profile-name">{entry.name}</span>
                    {entry.profileId === activeProfileId && (
                      <Icon name="check" size={14} className="menu-profile-check" />
                    )}
                  </button>
                ))}
                <button
                  className="menu-profile menu-profile-manage"
                  onClick={() => go({ page: 'profiles' })}
                >
                  <span className="menu-profile-av">
                    <Icon name="plus" size={13} />
                  </span>
                  <span className="menu-profile-name">{t('profile.manage')}</span>
                  <Icon name="chevR" size={13} className="menu-profile-ext" />
                </button>
              </div>
            )}
            <div className="menu-items">
              <button className="menu-item" onClick={() => go({ page: 'settings' })}>
                <Icon name="user" size={16} /> {t('menu.avatar')}
              </button>
              <button className="menu-item" onClick={() => go({ page: 'settings' })}>
                <Icon name="gear" size={16} /> {t('menu.settings')}
              </button>
              <div className="menu-sep" />
              <button className="menu-item menu-danger" onClick={onLogout}>
                <Icon name="logout" size={16} /> {t('menu.logout')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

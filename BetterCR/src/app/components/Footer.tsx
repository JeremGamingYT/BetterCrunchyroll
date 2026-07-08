import type { MouseEvent } from 'react';
import type { AppRoute, PageId } from '@shared/routing';
import { bridge } from '@core/api/transport';
import { useRouter } from '@app/router';
import { useI18n } from '@app/i18n/i18n';
import { Icon } from './Icon';
import { LangSwitch } from './LangSwitch';

const GITHUB_URL = 'https://github.com/JeremGamingYT/BetterCrunchyroll';

interface FooterLink {
  readonly key: string;
  readonly page?: PageId; // in-app navigation
  readonly url?: string; // external (real Crunchyroll page)
}

interface FooterColumn {
  readonly heading: string;
  readonly links: readonly FooterLink[];
}

const COLUMNS: readonly FooterColumn[] = [
  {
    heading: 'ftr.col.browse',
    links: [
      { key: 'ftr.link.new', page: 'series' },
      { key: 'ftr.link.simulcast', page: 'simulcast' },
      { key: 'ftr.link.genres', page: 'home' },
      { key: 'ftr.link.films', page: 'films' },
    ],
  },
  {
    heading: 'ftr.col.account',
    links: [
      { key: 'ftr.link.profile', page: 'settings' },
      { key: 'ftr.link.watchlist', page: 'watchlist' },
      { key: 'ftr.link.history', page: 'watchlist' },
      { key: 'ftr.link.subscription', url: 'https://www.crunchyroll.com/premium?bcr=native' },
    ],
  },
  {
    heading: 'ftr.col.help',
    links: [
      { key: 'ftr.link.faq', url: 'https://help.crunchyroll.com' },
      { key: 'ftr.link.contact', url: 'https://help.crunchyroll.com' },
      { key: 'ftr.link.status', url: 'https://status.crunchyroll.com' },
    ],
  },
  {
    heading: 'ftr.col.bcr',
    links: [
      { key: 'ftr.link.about', url: 'https://www.crunchyroll.com/about/?bcr=native' },
      { key: 'ftr.link.community', url: 'https://discord.com/invite/crunchyroll' },
    ],
  },
];

const LEGAL: readonly FooterLink[] = [
  { key: 'ftr.terms', url: 'https://www.crunchyroll.com/tos?bcr=native' },
  { key: 'ftr.privacy', url: 'https://www.crunchyroll.com/privacy?bcr=native' },
  { key: 'ftr.cookies', url: 'https://www.crunchyroll.com/cookiepolicy?bcr=native' },
];

export function Footer(): React.JSX.Element {
  const { go } = useRouter();
  const { t } = useI18n();

  const openExternal =
    (url: string) =>
    (event: MouseEvent): void => {
      event.preventDefault();
      bridge.openExternal(url);
    };

  const renderLink = (link: FooterLink): React.JSX.Element => {
    const label = t(link.key);
    if (link.url) {
      return (
        <a
          href={link.url}
          onClick={openExternal(link.url)}
          target="_blank"
          rel="noreferrer noopener"
        >
          {label}
        </a>
      );
    }
    const onClick = (event: MouseEvent): void => {
      event.preventDefault();
      if (link.page) {
        go({ page: link.page } as AppRoute);
      }
    };
    return (
      <a href="#" onClick={onClick}>
        {label}
      </a>
    );
  };

  return (
    <footer className="ftr">
      <div className="ftr-top">
        <div className="ftr-brand">
          <button
            className="hdr-logo"
            onClick={() => go({ page: 'home' })}
            aria-label={t('nav.home')}
          >
            <span className="hdr-wordmark">
              better<b>CR</b>
            </span>
          </button>
          <p className="ftr-tagline">{t('ftr.tagline')}</p>
          <div className="ftr-social">
            <a
              className="ftr-oss"
              href={GITHUB_URL}
              onClick={openExternal(GITHUB_URL)}
              target="_blank"
              rel="noreferrer noopener"
              title="GitHub"
            >
              <Icon name="github" size={17} solid /> {t('ftr.status.oss')}
            </a>
          </div>
        </div>
        {COLUMNS.map((column) => (
          <div key={column.heading} className="ftr-col">
            <h4>{t(column.heading)}</h4>
            <ul>
              {column.links.map((link) => (
                <li key={link.key}>{renderLink(link)}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="ftr-bottom">
        <div className="ftr-bottom-l">
          <span className="lang-label">
            <Icon name="globe" size={14} /> {t('ftr.lang')}
          </span>
          <LangSwitch />
        </div>
        <div className="ftr-legal">
          {LEGAL.map((link) => (
            <a
              key={link.key}
              href={link.url}
              onClick={link.url ? openExternal(link.url) : undefined}
              target="_blank"
              rel="noreferrer noopener"
            >
              {t(link.key)}
            </a>
          ))}
          <button className="ftr-see404" onClick={() => go({ page: 'notfound' })}>
            <Icon name="compass" size={13} /> {t('ftr.see404')}
          </button>
        </div>
        <p className="ftr-note">
          {t('ftr.note')} &nbsp;·&nbsp; {t('ftr.copyright')}
        </p>
      </div>
    </footer>
  );
}

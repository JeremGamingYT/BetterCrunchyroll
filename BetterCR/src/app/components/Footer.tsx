import type { MouseEvent } from 'react';
import type { AppRoute, PageId } from '@shared/routing';
import { useRouter } from '@app/router';
import { useI18n } from '@app/i18n/i18n';
import { Icon } from './Icon';
import { LangSwitch } from './LangSwitch';

interface FooterLink {
  readonly key: string;
  readonly page?: PageId;
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
      { key: 'ftr.link.profile' },
      { key: 'ftr.link.watchlist', page: 'watchlist' },
      { key: 'ftr.link.history' },
      { key: 'ftr.link.subscription' },
    ],
  },
  {
    heading: 'ftr.col.help',
    links: [
      { key: 'ftr.link.faq' },
      { key: 'ftr.link.devices' },
      { key: 'ftr.link.contact' },
      { key: 'ftr.link.status' },
    ],
  },
  {
    heading: 'ftr.col.bcr',
    links: [
      { key: 'ftr.link.about' },
      { key: 'ftr.link.press' },
      { key: 'ftr.link.jobs' },
      { key: 'ftr.link.community' },
    ],
  },
];

export function Footer(): React.JSX.Element {
  const { go } = useRouter();
  const { t } = useI18n();

  const prevent = (event: MouseEvent): void => event.preventDefault();
  const linkTo =
    (page?: PageId) =>
    (event: MouseEvent): void => {
      event.preventDefault();
      if (page) {
        go({ page } as AppRoute);
      }
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
            <a className="ftr-oss" href="#" onClick={prevent} title="Open-source">
              <Icon name="github" size={17} solid /> {t('ftr.status.oss')}
            </a>
          </div>
        </div>
        {COLUMNS.map((column) => (
          <div key={column.heading} className="ftr-col">
            <h4>{t(column.heading)}</h4>
            <ul>
              {column.links.map((link) => (
                <li key={link.key}>
                  <a href="#" onClick={linkTo(link.page)}>
                    {t(link.key)}
                  </a>
                </li>
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
          <a href="#" onClick={prevent}>
            {t('ftr.terms')}
          </a>
          <a href="#" onClick={prevent}>
            {t('ftr.privacy')}
          </a>
          <a href="#" onClick={prevent}>
            {t('ftr.cookies')}
          </a>
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

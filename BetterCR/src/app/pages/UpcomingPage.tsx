import { useMemo } from 'react';
import { fetchUpcomingAnime, type UpcomingItem } from '@core/providers';
import { bridge } from '@core/api/transport';
import { useAsync } from '@app/hooks/useAsync';
import { useI18n } from '@app/i18n/i18n';
import { Chip } from '@app/components/Chip';
import { Icon } from '@app/components/Icon';
import { ErrorState } from '@app/components/StateViews';

const MONTHS_FR = [
  'janv.',
  'févr.',
  'mars',
  'avr.',
  'mai',
  'juin',
  'juil.',
  'août',
  'sept.',
  'oct.',
  'nov.',
  'déc.',
];
const MONTHS_EN = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function monthLabel(item: UpcomingItem, lang: string): string {
  if (!item.month) {
    return lang === 'en' ? 'TBA' : 'À confirmer';
  }
  const month = (lang === 'en' ? MONTHS_EN : MONTHS_FR)[item.month - 1] ?? '';
  return item.year ? `${month} ${String(item.year)}` : month;
}

function UpcomingCard({ item, lang }: { item: UpcomingItem; lang: string }): React.JSX.Element {
  const { t } = useI18n();
  return (
    <button
      className="up-card"
      onClick={() => item.siteUrl && bridge.openExternal(item.siteUrl)}
      title={item.title}
    >
      <div className="up-thumb">
        <img src={item.image} alt="" loading="lazy" />
        <span className="up-date">{monthLabel(item, lang)}</span>
      </div>
      <div className="up-cap">
        <p className="up-title">{item.title}</p>
        <div className="up-meta">
          {item.format && <Chip tone="line">{item.format.replace(/_/g, ' ')}</Chip>}
          {item.episodes ? <span>{t('common.epShort', { n: item.episodes })}</span> : null}
        </div>
        {item.genres.length > 0 && (
          <p className="up-genres">{item.genres.slice(0, 3).join(' · ')}</p>
        )}
      </div>
    </button>
  );
}

export function UpcomingPage(): React.JSX.Element {
  const { t, lang } = useI18n();
  const { data, loading, error } = useAsync(() => fetchUpcomingAnime(50), []);

  const groups = useMemo(() => {
    const items = [...(data ?? [])].sort(
      (a, b) =>
        (a.year ?? 9999) * 100 + (a.month ?? 13) - ((b.year ?? 9999) * 100 + (b.month ?? 13)),
    );
    const year = new Date().getFullYear();
    return [
      { key: 'soon', title: t('up.soon'), items: items.filter((i) => i.year === year) },
      {
        key: 'next',
        title: t('up.nextYear', { y: year + 1 }),
        items: items.filter((i) => i.year === year + 1),
      },
      {
        key: 'later',
        title: t('up.later'),
        items: items.filter((i) => !i.year || i.year > year + 1),
      },
    ].filter((group) => group.items.length > 0);
  }, [data, t]);

  return (
    <div className="page-pad" data-screen-label="Sorties à venir">
      <div className="page-head">
        <h1 className="page-title">{t('up.title')}</h1>
        <p className="page-sub">{t('up.sub')}</p>
      </div>

      {error ? (
        <ErrorState message={error} />
      ) : loading ? (
        <div className="grid-cards">
          {Array.from({ length: 12 }).map((_, index) => (
            <div
              key={index}
              className="sk-pcard"
              style={{ animationDelay: `${String(index * 50)}ms` }}
            >
              <div className="sk sk-thumb" />
              <div className="sk sk-line" />
            </div>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <ErrorState message={t('up.empty')} />
      ) : (
        groups.map((group) => (
          <section key={group.key} className="up-section">
            <h2 className="row-title">
              <Icon name="sparkle" size={16} /> {group.title}
              <span className="up-count">{group.items.length}</span>
            </h2>
            <div className="up-grid">
              {group.items.map((item) => (
                <UpcomingCard key={item.id} item={item} lang={lang} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

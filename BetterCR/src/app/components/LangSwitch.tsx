import { useI18n } from '@app/i18n/i18n';
import type { Lang } from '@app/i18n/strings';

const OPTIONS: ReadonlyArray<{ id: Lang; flag: string; label: string }> = [
  { id: 'fr', flag: '🇫🇷', label: 'FR' },
  { id: 'en', flag: '🇬🇧', label: 'EN' },
];

export function LangSwitch(): React.JSX.Element {
  const { lang, setLang, t } = useI18n();
  return (
    <div className="lang-switch" role="group" aria-label={t('ftr.lang')}>
      {OPTIONS.map((option) => (
        <button
          key={option.id}
          className={`lang-opt${lang === option.id ? ' is-on' : ''}`}
          onClick={() => setLang(option.id)}
          aria-pressed={lang === option.id}
        >
          <span className="lang-flag">{option.flag}</span>
          {option.label}
        </button>
      ))}
    </div>
  );
}

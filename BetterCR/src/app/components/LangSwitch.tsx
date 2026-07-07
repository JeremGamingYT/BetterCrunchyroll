import { useI18n } from '@app/i18n/i18n';
import { UI_LANGS } from '@app/i18n/locales';
import type { Lang } from '@app/i18n/strings';
import { Dropdown } from './Dropdown';

const OPTIONS = UI_LANGS.map((entry) => ({
  value: entry.code,
  label: entry.label,
  icon: entry.flag,
}));

export interface LangSwitchProps {
  readonly align?: 'start' | 'end';
}

export function LangSwitch({ align }: LangSwitchProps): React.JSX.Element {
  const { lang, setLang, t } = useI18n();
  return (
    <Dropdown<Lang>
      className="lang-switch"
      value={lang}
      options={OPTIONS}
      onChange={setLang}
      ariaLabel={t('ftr.lang')}
      align={align}
    />
  );
}

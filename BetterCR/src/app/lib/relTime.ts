/**
 * Short relative time label (e.g. "just now", "3 min", "2 h", "5 d") used by
 * the comments and notifications UIs. Kept tiny and dependency-free.
 */
import type { Lang } from '@app/i18n/strings';

const MS_PER_MIN = 60_000;
const MIN_PER_HOUR = 60;
const HOUR_PER_DAY = 24;

interface RelTimeUnits {
  readonly now: string;
  readonly min: string;
  readonly hour: string;
  readonly day: string;
}

const UNITS: Record<Lang, RelTimeUnits> = {
  en: { now: 'just now', min: 'min', hour: 'h', day: 'd' },
  fr: { now: "à l'instant", min: 'min', hour: 'h', day: 'j' },
  es: { now: 'justo ahora', min: 'min', hour: 'h', day: 'd' },
  pt: { now: 'agora mesmo', min: 'min', hour: 'h', day: 'd' },
  de: { now: 'gerade eben', min: 'Min', hour: 'Std', day: 'T' },
  it: { now: 'proprio ora', min: 'min', hour: 'h', day: 'g' },
  ar: { now: 'الآن', min: 'د', hour: 'س', day: 'ي' },
  ru: { now: 'только что', min: 'мин', hour: 'ч', day: 'д' },
  ja: { now: 'たった今', min: '分', hour: '時間', day: '日' },
  hi: { now: 'अभी अभी', min: 'मि', hour: 'घं', day: 'दि' },
};

export function relTime(ts: number, lang: Lang): string {
  const units = UNITS[lang] ?? UNITS.en;
  const min = Math.floor((Date.now() - ts) / MS_PER_MIN);
  if (min < 1) {
    return units.now;
  }
  if (min < MIN_PER_HOUR) {
    return `${String(min)} ${units.min}`;
  }
  const hours = Math.floor(min / MIN_PER_HOUR);
  if (hours < HOUR_PER_DAY) {
    return `${String(hours)} ${units.hour}`;
  }
  const days = Math.floor(hours / HOUR_PER_DAY);
  return `${String(days)} ${units.day}`;
}

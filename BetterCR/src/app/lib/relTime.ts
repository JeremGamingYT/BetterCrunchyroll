/**
 * Short relative time label (e.g. "à l'instant", "3 min", "2 h", "5 j") used by
 * the comments and notifications UIs. Kept tiny and dependency-free.
 */
const MS_PER_MIN = 60_000;
const MIN_PER_HOUR = 60;
const HOUR_PER_DAY = 24;

export function relTime(ts: number, lang: string): string {
  const min = Math.floor((Date.now() - ts) / MS_PER_MIN);
  if (min < 1) {
    return lang === 'en' ? 'just now' : "à l'instant";
  }
  if (min < MIN_PER_HOUR) {
    return `${String(min)} min`;
  }
  const hours = Math.floor(min / MIN_PER_HOUR);
  if (hours < HOUR_PER_DAY) {
    return `${String(hours)} h`;
  }
  const days = Math.floor(hours / HOUR_PER_DAY);
  return `${String(days)} ${lang === 'en' ? 'd' : 'j'}`;
}

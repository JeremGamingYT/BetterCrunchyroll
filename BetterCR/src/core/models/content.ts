/**
 * View models consumed by the redesigned UI. These intentionally mirror the
 * fields the original BetterCR components already read from the mock
 * `window.BCR_DATA`, so the ported components stay untouched while their data
 * now comes from the live Crunchyroll API.
 */

/** A series/movie tile (poster card, hero, grid). */
export interface Series {
  readonly id: string;
  readonly title: string;
  readonly desc: string;
  readonly poster: string;
  readonly wide: string;
  readonly wideXL: string;
  readonly eps: number;
  readonly seasons: number;
  readonly year: number;
  readonly dub: boolean;
  readonly sub: boolean;
  readonly simulcast: boolean;
  readonly rating: string;
}

/** Extra fields shown on the series detail page. */
export interface SeriesDetail extends Series {
  readonly extDesc: string;
  readonly keywords: readonly string[];
  readonly descriptors: readonly string[];
}

/** A season tab on the detail page. */
export interface Season {
  readonly id: string;
  readonly num: number;
  readonly title: string;
  readonly episodeCount: number;
}

/** An episode card. `watchPath` deep-links to Crunchyroll's native player. */
export interface Episode {
  readonly id: string;
  readonly num: number;
  readonly seasonNum: number;
  readonly title: string;
  readonly desc: string;
  readonly thumb: string;
  readonly durMin: number;
  readonly air: string;
  readonly watchPath: string;
}

/** A "continue watching" card. */
export interface ContinueItem {
  readonly seriesId: string;
  readonly episodeId: string;
  readonly seriesTitle: string;
  readonly epTitle: string;
  readonly epNum: number;
  readonly seasonNum: number;
  readonly thumb: string;
  readonly progress: number;
  readonly durMin: number;
  readonly watchPath: string;
}

/** A genre/category tile. `id` is the slug used in browse's `categories`. */
export interface Genre {
  readonly id: string;
  readonly title: string;
  readonly image: string;
}

/** A horizontal row on the home page. `titleKey`/`subKey` are i18n keys. */
export interface HomeRow {
  readonly id: string;
  readonly titleKey: string;
  readonly subKey?: string;
  readonly items: readonly Series[];
}

/** The composed home page payload. */
export interface HomeFeed {
  readonly hero: readonly Series[];
  readonly rows: readonly HomeRow[];
}

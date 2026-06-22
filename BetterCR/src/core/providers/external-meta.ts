/**
 * Provider-agnostic enrichment metadata. Crunchyroll's catalog is the source of
 * truth for availability; external providers (AniList first) supply richer
 * artwork and information layered on top.
 */
export interface ExternalMeta {
  /** Human-readable provider name, e.g. `AniList`. */
  readonly source: string;
  readonly coverImage?: string;
  readonly bannerImage?: string;
  readonly description?: string;
  /** Community score on a 0–100 scale. */
  readonly score?: number;
  readonly genres?: readonly string[];
  readonly studios?: readonly string[];
  readonly episodes?: number;
  /** Dominant accent colour (hex), when the provider exposes one. */
  readonly color?: string;
}

/** A provider that resolves enrichment for an anime title. */
export type MetaProvider = (title: string, year?: number) => Promise<ExternalMeta | null>;

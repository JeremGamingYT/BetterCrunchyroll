/**
 * Zod schemas validating Crunchyroll API responses at the boundary.
 *
 * The public docs are derived from the Android APK and admittedly incomplete,
 * so every schema is deliberately lenient: unknown keys pass through, all
 * non-essential fields are optional, and image collections accept both the flat
 * (`Item[]`) and nested (`Item[][]`) shapes Crunchyroll uses across endpoints.
 */
import { z } from 'zod';

export const imageItemSchema = z.object({
  source: z.string(),
  width: z.number().optional(),
  height: z.number().optional(),
  type: z.string().optional(),
});
export type ImageItem = z.infer<typeof imageItemSchema>;

/** Crunchyroll image collections are sometimes `Item[]`, sometimes `Item[][]`. */
export const imageListSchema = z.union([
  z.array(imageItemSchema),
  z.array(z.array(imageItemSchema)),
]);

export const imagesSchema = z
  .object({
    poster_tall: imageListSchema.optional(),
    poster_wide: imageListSchema.optional(),
    thumbnail: imageListSchema.optional(),
  })
  .passthrough();
export type Images = z.infer<typeof imagesSchema>;

const seriesMetadataSchema = z
  .object({
    episode_count: z.number().optional(),
    season_count: z.number().optional(),
    series_launch_year: z.number().optional(),
    is_dubbed: z.boolean().optional(),
    is_subbed: z.boolean().optional(),
    is_simulcast: z.boolean().optional(),
    maturity_ratings: z.array(z.string()).optional(),
  })
  .passthrough();

/** A browse/search result tile. */
export const panelSchema = z
  .object({
    id: z.string(),
    type: z.string().optional(),
    title: z.string().optional(),
    slug_title: z.string().optional(),
    description: z.string().optional(),
    images: imagesSchema.optional(),
    series_metadata: seriesMetadataSchema.optional(),
  })
  .passthrough();
export type PanelDto = z.infer<typeof panelSchema>;

/** A CMS series object (metadata at top level, unlike browse panels). */
export const cmsSeriesSchema = z
  .object({
    id: z.string(),
    title: z.string().optional(),
    slug_title: z.string().optional(),
    description: z.string().optional(),
    extended_description: z.string().optional(),
    images: imagesSchema.optional(),
    keywords: z.array(z.string()).optional(),
    content_descriptors: z.array(z.string()).optional(),
    maturity_ratings: z.array(z.string()).optional(),
    episode_count: z.number().optional(),
    season_count: z.number().optional(),
    series_launch_year: z.number().optional(),
    is_dubbed: z.boolean().optional(),
    is_subbed: z.boolean().optional(),
    is_simulcast: z.boolean().optional(),
  })
  .passthrough();
export type CmsSeriesDto = z.infer<typeof cmsSeriesSchema>;

export const seasonSchema = z
  .object({
    id: z.string(),
    title: z.string().optional(),
    slug_title: z.string().optional(),
    season_number: z.number().optional(),
    number_of_episodes: z.number().optional(),
  })
  .passthrough();
export type SeasonDto = z.infer<typeof seasonSchema>;

export const episodeSchema = z
  .object({
    id: z.string(),
    title: z.string().optional(),
    slug_title: z.string().optional(),
    description: z.string().optional(),
    episode_number: z.number().nullable().optional(),
    season_number: z.number().optional(),
    duration_ms: z.number().optional(),
    episode_air_date: z.string().optional(),
    availability_starts: z.string().optional(),
    images: imagesSchema.optional(),
  })
  .passthrough();
export type EpisodeDto = z.infer<typeof episodeSchema>;

/** A browse result of `type=episode`: episode-specific data lives in `episode_metadata`. */
export const episodePanelSchema = z
  .object({
    id: z.string(),
    type: z.string().optional(),
    title: z.string().optional(),
    images: imagesSchema.optional(),
    episode_metadata: z
      .object({
        series_id: z.string().optional(),
        series_title: z.string().optional(),
        season_number: z.number().optional(),
        episode_number: z.number().nullable().optional(),
        episode_air_date: z.string().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();
export type EpisodePanelDto = z.infer<typeof episodePanelSchema>;

/** A watch-progress entry. */
export const playheadSchema = z
  .object({
    content_id: z.string(),
    playhead: z.number().optional(),
    fully_watched: z.boolean().optional(),
  })
  .passthrough();
export type PlayheadDto = z.infer<typeof playheadSchema>;

/** The current account profile (`/accounts/v1/me/profile`). */
export const profileSchema = z
  .object({
    username: z.string().optional(),
    profile_name: z.string().optional(),
    avatar: z.string().optional(),
    email: z.string().optional(),
  })
  .passthrough();
export type ProfileDto = z.infer<typeof profileSchema>;

/** Standard `{ total, data: [...] }` list envelope used across CR endpoints. */
export function envelopeOf<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    total: z.number().optional(),
    data: z.array(item),
  });
}

/**
 * Helpers to extract a usable image URL from Crunchyroll's image collections,
 * which may be flat (`Item[]`) or nested (`Item[][]`).
 */
import type { ImageItem, Images } from '@core/schemas/crunchyroll';

type ImageList = ImageItem[] | ImageItem[][] | undefined;

function flatten(list: ImageList): ImageItem[] {
  if (!list) {
    return [];
  }
  const out: ImageItem[] = [];
  for (const entry of list) {
    if (Array.isArray(entry)) {
      out.push(...entry);
    } else {
      out.push(entry);
    }
  }
  return out;
}

function pickLargest(items: ImageItem[]): string {
  let best: ImageItem | undefined;
  for (const item of items) {
    if (!best || (item.width ?? 0) > (best.width ?? 0)) {
      best = item;
    }
  }
  return best?.source ?? '';
}

export function posterUrl(images: Images | undefined): string {
  return pickLargest(flatten(images?.poster_tall));
}

export function wideUrl(images: Images | undefined): string {
  return pickLargest(flatten(images?.poster_wide));
}

export function thumbUrl(images: Images | undefined): string {
  return pickLargest(flatten(images?.thumbnail)) || wideUrl(images);
}

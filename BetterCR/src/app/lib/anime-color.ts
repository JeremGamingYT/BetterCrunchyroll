/**
 * Deterministic accent colour derived from a seed string (FNV-1a hash → HSL).
 * Mirrors the original BetterCR per-title colour used on cards.
 */
const cache = new Map<string, string>();

export function animeColor(seed: string): string {
  const key = seed || '';
  const cached = cache.get(key);
  if (cached) {
    return cached;
  }

  let hash = 2166136261;
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const hue = (hash >>> 0) % 360;
  const saturation = 60 + ((hash >>> 9) % 16);
  const color = `hsl(${String(hue)} ${String(saturation)}% 61%)`;
  cache.set(key, color);
  return color;
}

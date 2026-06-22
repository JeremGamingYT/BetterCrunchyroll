/** Resolves after `ms` milliseconds. */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Runs `factory`, retrying on a thrown error or when `retryIf(value)` is true,
 * up to `attempts` times with `delayMs` between tries. Returns the last value
 * (or rethrows the last error). Used to absorb transient races (e.g. the
 * Crunchyroll token not being ready yet).
 */
export async function retryAsync<T>(
  factory: () => Promise<T>,
  attempts: number,
  delayMs: number,
  retryIf?: (value: T) => boolean,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const value = await factory();
      if (attempt === attempts - 1 || !retryIf || !retryIf(value)) {
        return value;
      }
    } catch (error) {
      lastError = error;
      if (attempt === attempts - 1) {
        throw error;
      }
    }
    await delay(delayMs);
  }
  throw lastError ?? new Error('retryAsync: exhausted');
}

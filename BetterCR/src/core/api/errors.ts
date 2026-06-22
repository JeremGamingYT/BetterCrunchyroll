/** Error raised when a proxied Crunchyroll request fails or times out. */
export class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Holds the intercepted Crunchyroll session token in the content script,
 * mirrors it to `chrome.storage.local` (so other tabs can reuse it), and
 * exposes a bounded wait used before proxied API calls.
 */
import {
  TOKEN_EXPIRY_MARGIN_MS,
  TOKEN_STORAGE_KEY,
  TOKEN_WAIT_INTERVAL_MS,
  TOKEN_WAIT_TIMEOUT_MS,
} from '@shared/config';
import { delay } from '@shared/async';
import type { BcrTokenDetail } from '@shared/page-bridge';
import type { AuthData, TokenStatus } from '@shared/messages';

interface StoredToken {
  readonly token: string;
  readonly expiry: number;
  readonly accountId?: string;
  readonly profileId?: string;
}

export class TokenStore {
  private token: string | null = null;
  private expiry = 0;
  private accountId: string | undefined;
  private profileId: string | undefined;

  /** Stores a token captured by the page interceptor. */
  ingestDetail(detail: BcrTokenDetail): void {
    this.set(
      detail.token,
      Date.now() + detail.expiresIn * 1000 - TOKEN_EXPIRY_MARGIN_MS,
      detail.accountId,
      detail.profileId,
    );
  }

  /** Stores a token obtained through the password-login fallback. */
  ingestAuth(data: AuthData): void {
    this.set(
      data.accessToken,
      Date.now() + data.expiresIn * 1000 - TOKEN_EXPIRY_MARGIN_MS,
      data.accountId,
      this.profileId,
    );
  }

  private set(
    token: string,
    expiry: number,
    accountId: string | undefined,
    profileId: string | undefined,
  ): void {
    this.token = token;
    this.expiry = expiry;
    this.accountId = accountId;
    this.profileId = profileId;
    void this.persist();
  }

  private async persist(): Promise<void> {
    if (this.token === null) {
      return;
    }
    const stored: StoredToken = {
      token: this.token,
      expiry: this.expiry,
      ...(this.accountId !== undefined ? { accountId: this.accountId } : {}),
      ...(this.profileId !== undefined ? { profileId: this.profileId } : {}),
    };
    try {
      await chrome.storage.local.set({ [TOKEN_STORAGE_KEY]: stored });
    } catch {
      // Storage failures are non-fatal; the in-memory token still works.
    }
  }

  async loadFromStorage(): Promise<boolean> {
    try {
      const result = await chrome.storage.local.get(TOKEN_STORAGE_KEY);
      const stored = result[TOKEN_STORAGE_KEY] as StoredToken | undefined;
      if (stored && Date.now() < stored.expiry) {
        this.token = stored.token;
        this.expiry = stored.expiry;
        this.accountId = stored.accountId;
        this.profileId = stored.profileId;
        return true;
      }
    } catch {
      // Ignore — treated as "no token".
    }
    return false;
  }

  isValid(): boolean {
    return this.token !== null && Date.now() < this.expiry;
  }

  get account(): string | undefined {
    return this.accountId;
  }

  getStatus(): TokenStatus {
    return {
      hasToken: this.isValid(),
      ...(this.accountId !== undefined ? { accountId: this.accountId } : {}),
      ...(this.profileId !== undefined ? { profileId: this.profileId } : {}),
    };
  }

  /** Waits up to `timeoutMs` for a valid token, polling storage meanwhile. */
  async waitForToken(timeoutMs: number = TOKEN_WAIT_TIMEOUT_MS): Promise<string | null> {
    if (this.isValid()) {
      return this.token;
    }
    await this.loadFromStorage();
    const deadline = Date.now() + timeoutMs;
    while (!this.isValid() && Date.now() < deadline) {
      await delay(TOKEN_WAIT_INTERVAL_MS);
      await this.loadFromStorage();
    }
    return this.isValid() ? this.token : null;
  }
}

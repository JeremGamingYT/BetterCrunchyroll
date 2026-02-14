/**
 * Token Management Service
 * Handles automatic token refresh and expiry management
 * Works with both extension-based tokens and user-authenticated tokens
 */

const TOKEN_KEY = "bcr_crunchyroll_token"
const REFRESH_TOKEN_KEY = "bcr_crunchyroll_refresh_token"
const TOKEN_EXPIRY_KEY = "bcr_token_expiry"
const REFRESH_INTERVAL = 30000 // Check every 30 seconds
const REFRESH_BUFFER = 60000 // Refresh 1 minute before expiry

interface StoredToken {
  access_token: string
  refresh_token?: string
  expires_at: number
}

class TokenManager {
  private static instance: TokenManager
  private refreshTimer: NodeJS.Timeout | null = null
  private listeners: Set<(token: string | null) => void> = new Set()
  private isRefreshing = false
  private pendingRefreshPromise: Promise<boolean> | null = null

  private constructor() {}

  static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager()
    }
    return TokenManager.instance
  }

  /**
   * Initialize token management
   */
  initialize() {
    if (typeof window === "undefined") return

    // Listen for token updates from extension
    window.addEventListener("bcr-token", () => {
      this.updateFromExtensionToken()
    })

    // Listen for storage changes
    window.addEventListener("storage", (e) => {
      if (e.key === TOKEN_KEY || e.key === REFRESH_TOKEN_KEY) {
        this.notifyListeners()
      }
    })

    // Start automatic refresh checking
    this.startRefreshTimer()

    // Read extension token if available
    this.updateFromExtensionToken()
  }

  /**
   * Get current access token
   */
  getToken(): string | null {
    if (typeof window === "undefined") return null

    // First check extension token
    const extensionToken = (window as any).__BCR_TOKEN__
    if (extensionToken) {
      return extensionToken
    }

    // Then check localStorage
    try {
      const stored = localStorage.getItem(TOKEN_KEY)
      if (stored) {
        const data: StoredToken = JSON.parse(stored)
        if (data.expires_at > Date.now()) {
          return data.access_token
        } else {
          // Token expired, try to refresh
          if (data.refresh_token) {
            this.refreshToken(data.refresh_token).catch((err) => {
              console.error("[TokenManager] Auto-refresh error:", err)
            })
          } else {
            this.clearToken()
          }
          return null
        }
      }
    } catch (error) {
      console.error("[TokenManager] Error reading token:", error)
    }

    return null
  }

  /**
   * Get time until expiration in milliseconds
   */
  getTimeUntilExpiry(): number {
    if (typeof window === "undefined") return -1

    try {
      const stored = localStorage.getItem(TOKEN_KEY)
      if (stored) {
        const data: StoredToken = JSON.parse(stored)
        return Math.max(0, data.expires_at - Date.now())
      }
    } catch (error) {
      console.error("[TokenManager] Error getting expiry time:", error)
    }

    return -1
  }

  /**
   * Check if token is valid
   */
  isTokenValid(): boolean {
    if (typeof window === "undefined") return false

    try {
      const stored = localStorage.getItem(TOKEN_KEY)
      if (stored) {
        const data: StoredToken = JSON.parse(stored)
        return data.expires_at > Date.now()
      }
    } catch (error) {
      console.error("[TokenManager] Error checking token validity:", error)
    }

    return false
  }

  /**
   * Store token locally
   */
  setToken(accessToken: string, refreshToken?: string, expiresIn?: number) {
    if (typeof window === "undefined") return

    const expiresAt = Date.now() + (expiresIn ? expiresIn * 1000 : 300000) // 5 minutes default

    const data: StoredToken = {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt,
    }

    try {
      localStorage.setItem(TOKEN_KEY, JSON.stringify(data))
      if (refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
      }
      localStorage.setItem(TOKEN_EXPIRY_KEY, expiresAt.toString())

      console.log(
        "[TokenManager] Token stored. Expires in",
        Math.round((expiresAt - Date.now()) / 1000),
        "seconds"
      )

      this.notifyListeners()
      this.startRefreshTimer()
    } catch (error) {
      console.error("[TokenManager] Error storing token:", error)
    }
  }

  /**
   * Refresh token with deduplication
   */
  async refreshToken(refreshTokenValue: string): Promise<boolean> {
    // If already refreshing, wait for the pending promise
    if (this.isRefreshing && this.pendingRefreshPromise) {
      console.log("[TokenManager] Refresh already in progress, waiting...")
      return this.pendingRefreshPromise
    }

    this.isRefreshing = true

    try {
      this.pendingRefreshPromise = this._performRefresh(refreshTokenValue)
      const result = await this.pendingRefreshPromise
      return result
    } finally {
      this.isRefreshing = false
      this.pendingRefreshPromise = null
    }
  }

  /**
   * Perform actual token refresh
   */
  private async _performRefresh(refreshTokenValue: string): Promise<boolean> {
    try {
      console.log("[TokenManager] Attempting to refresh token...")

      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "refresh",
          refresh_token: refreshTokenValue,
        }),
      })

      if (!response.ok) {
        console.error("[TokenManager] Refresh request failed with status", response.status)
        this.clearToken()
        return false
      }

      const data = await response.json()

      if (data.success) {
        console.log("[TokenManager] Token refreshed successfully")
        this.setToken(data.access_token, data.refresh_token, data.expires_in)
        return true
      } else {
        console.error("[TokenManager] Server returned error:", data.error)
        this.clearToken()
        return false
      }
    } catch (error) {
      console.error("[TokenManager] Refresh error:", error)
      return false
    }
  }

  /**
   * Update token from extension
   */
  private updateFromExtensionToken() {
    if (typeof window === "undefined") return

    const extensionToken = (window as any).__BCR_TOKEN__
    if (extensionToken) {
      // Update localStorage with extension token info if available
      const expiryStr = localStorage.getItem(TOKEN_EXPIRY_KEY)
      const expiresAt = expiryStr ? parseInt(expiryStr) : Date.now() + 300000

      try {
        localStorage.setItem(
          TOKEN_KEY,
          JSON.stringify({
            access_token: extensionToken,
            expires_at: expiresAt,
          })
        )
      } catch (error) {
        console.error("[TokenManager] Error updating extension token:", error)
      }

      this.notifyListeners()
    }
  }

  /**
   * Clear token
   */
  clearToken() {
    if (typeof window === "undefined") return

    try {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(REFRESH_TOKEN_KEY)
      localStorage.removeItem(TOKEN_EXPIRY_KEY)
      console.log("[TokenManager] Token cleared")
    } catch (error) {
      console.error("[TokenManager] Error clearing token:", error)
    }

    this.notifyListeners()
  }

  /**
   * Start automatic refresh timer
   */
  private startRefreshTimer() {
    if (typeof window === "undefined") return

    // Clear existing timer
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
    }

    // Check token expiry every 30 seconds
    this.refreshTimer = setInterval(async () => {
      if (typeof window === "undefined") return

      try {
        const stored = localStorage.getItem(TOKEN_KEY)
        if (stored) {
          const data: StoredToken = JSON.parse(stored)
          const timeUntilExpiry = data.expires_at - Date.now()

          // Log token status
          console.log(
            "[TokenManager] Token check:",
            Math.round(timeUntilExpiry / 1000),
            "seconds until expiry"
          )

          // If token expires soon and we have a refresh token, refresh it
          if (timeUntilExpiry < REFRESH_BUFFER && data.refresh_token) {
            console.log("[TokenManager] Token expiring soon, triggering refresh...")
            await this.refreshToken(data.refresh_token)
          } else if (timeUntilExpiry < 0) {
            // Token already expired
            console.log("[TokenManager] Token already expired")
            if (data.refresh_token) {
              await this.refreshToken(data.refresh_token)
            } else {
              this.clearToken()
            }
          }
        }
      } catch (error) {
        console.error("[TokenManager] Timer check error:", error)
      }
    }, REFRESH_INTERVAL)
  }

  /**
   * Subscribe to token changes
   */
  subscribeToTokenChanges(callback: (token: string | null) => void): () => void {
    this.listeners.add(callback)

    // Call immediately with current token
    callback(this.getToken())

    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback)
    }
  }

  /**
   * Notify all listeners
   */
  private notifyListeners() {
    const token = this.getToken()
    this.listeners.forEach((listener) => {
      try {
        listener(token)
      } catch (error) {
        console.error("[TokenManager] Listener error:", error)
      }
    })
  }

  destroy() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
    }
    this.listeners.clear()
  }
}

// Export singleton instance
export const tokenManager = TokenManager.getInstance()

// Initialize on module load if in browser
if (typeof window !== "undefined") {
  tokenManager.initialize()
}


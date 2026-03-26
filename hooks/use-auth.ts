"use client"

import { useState, useCallback, useEffect } from "react"
import { tokenManager } from "@/lib/token-manager"

export interface AuthToken {
  access_token: string
  refresh_token: string
  expires_in: number
  expires_at: number // timestamp
}

export interface AuthUser {
  id: string
  email?: string
  username?: string
  avatar_url?: string
  profile_name?: string
}

export interface AuthState {
  token: AuthToken | null
  user: AuthUser | null
  isLoading: boolean
  error: string | null
  isAuthenticated: boolean
}

const TOKEN_STORAGE_KEY = "bcr_auth_token"
const USER_STORAGE_KEY = "bcr_auth_user"
const TOKEN_REFRESH_BUFFER = 60000 // Refresh 1 minute before expiry

/** True when the app is running inside the extension iframe (parent = crunchyroll.com). */
function isInExtensionIframe(): boolean {
  try {
    return window.self !== window.top
  } catch {
    return true // cross-origin access blocked → definitely in an iframe
  }
}

/**
 * Relay the login request through the content-script which runs on crunchyroll.com
 * and therefore carries the real browser cookies (cf_clearance, __cf_bm, etp_rt…).
 * Resolves in ~100 ms when the extension is loaded; rejects after 3 s otherwise.
 */
function signInViaContentScript(
  username: string,
  password: string
): Promise<{ access_token: string; refresh_token: string; expires_in: number; account_id?: string }> {
  return new Promise((resolve, reject) => {
    const id = crypto.randomUUID()
    const timeout = setTimeout(() => {
      window.removeEventListener("message", handler)
      reject(new Error("PROXY_TIMEOUT"))
    }, 10000) // 10s — auth fetch to crunchyroll.com can take a few seconds

    function handler(event: MessageEvent) {
      if (event.data?.type !== "CRUNCHYROLL_AUTH_RESPONSE") return
      if (event.data?.id !== id) return
      clearTimeout(timeout)
      window.removeEventListener("message", handler)
      if (event.data.success) {
        resolve(event.data.data)
      } else {
        reject(new Error(event.data.error || "Identifiants incorrects"))
      }
    }

    window.addEventListener("message", handler)
    window.parent.postMessage(
      { type: "CRUNCHYROLL_AUTH_REQUEST", id, username, password },
      "*"
    )
  })
}

/** Server-side proxy fallback (used in standalone mode or when extension is not yet reloaded). */
async function signInViaServer(
  username: string,
  password: string
): Promise<{ access_token: string; refresh_token: string; expires_in: number; account?: Record<string, string> }> {
  const response = await fetch("/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ method: "sign_in", username, password }),
  })
  const json = await response.json()
  if (!response.ok) throw new Error(json.error || "Identifiants incorrects")
  return json
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    token: null,
    user: null,
    isLoading: true,
    error: null,
    isAuthenticated: false,
  })

  // Initialize from stored token
  useEffect(() => {
    const initializeAuth = () => {
      try {
        const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY)
        const storedUser = localStorage.getItem(USER_STORAGE_KEY)

        if (storedToken) {
          const token: AuthToken = JSON.parse(storedToken)

          // Check if token is still valid
          if (token.expires_at > Date.now()) {
            setState((prev) => ({
              ...prev,
              token,
              user: storedUser ? JSON.parse(storedUser) : null,
              isAuthenticated: true,
              isLoading: false,
            }))
            return
          } else {
            // Token expired, try to refresh
            refreshToken(token.refresh_token)
          }
        }
      } catch (error) {
        console.error("[Auth] Initialization error:", error)
      }

      setState((prev) => ({ ...prev, isLoading: false }))
    }

    initializeAuth()
  }, [])

  // Check if token needs refresh
  useEffect(() => {
    if (!state.token) return

    const expiresIn = state.token.expires_at - Date.now()
    if (expiresIn < TOKEN_REFRESH_BUFFER) {
      // Token expiring soon, refresh it
      refreshToken(state.token.refresh_token)
    }

    // Set up refresh timer
    const timer = setTimeout(() => {
      refreshToken(state.token!.refresh_token)
    }, expiresIn - TOKEN_REFRESH_BUFFER)

    return () => clearTimeout(timer)
  }, [state.token])

  const signIn = useCallback(
    async (username: string, password: string) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }))

      try {
        let rawData: {
          access_token: string
          refresh_token: string
          expires_in: number
          account?: Record<string, string>
          account_id?: string
        }

        if (isInExtensionIframe()) {
          // ONLY the content-script proxy can work here — the server route will always
          // be blocked by Cloudflare because it has no cf_clearance / etp_rt cookies.
          try {
            const proxyData = await signInViaContentScript(username, password)
            rawData = {
              access_token: proxyData.access_token,
              refresh_token: proxyData.refresh_token,
              expires_in: proxyData.expires_in,
            }
          } catch (proxyErr) {
            if (proxyErr instanceof Error && proxyErr.message === "PROXY_TIMEOUT") {
              throw new Error("__RELOAD_EXTENSION__")
            }
            throw proxyErr // wrong password, network error, etc.
          }
        } else {
          // Standalone localhost:3000 — server route (will fail if Cloudflare blocks)
          rawData = await signInViaServer(username, password)
        }

        const data = rawData

        const token: AuthToken = {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_in: data.expires_in,
          expires_at: Date.now() + data.expires_in * 1000,
        }

        const user: AuthUser = {
          id: data.account?.id || "",
          email: data.account?.email || "",
          username: data.account?.username || "",
          avatar_url: data.account?.avatar_url || "",
          profile_name: data.account?.profile_name || "",
        }

        // Store in localStorage — clear old cache entries on quota exceeded
        try {
          localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(token))
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
        } catch {
          // Storage full: evict Crunchyroll cache and retry
          for (const k of Object.keys(localStorage)) {
            if (k.startsWith("crunchyroll_") || k.startsWith("jikan_") || k.startsWith("cache_")) {
              localStorage.removeItem(k)
            }
          }
          localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(token))
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
        }

        // Sync to tokenManager so AuthGuard (useToken) sees the new token immediately
        tokenManager.setToken(token.access_token, token.refresh_token, token.expires_in)

        setState((prev) => ({
          ...prev,
          token,
          user,
          isAuthenticated: true,
          isLoading: false,
        }))

        return { success: true, token, user }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Sign in failed"
        setState((prev) => ({ ...prev, error: errorMsg, isLoading: false }))
        return { success: false, error: errorMsg }
      }
    },
    []
  )

  const refreshToken = useCallback(async (refreshTokenValue: string) => {
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "refresh",
          refresh_token: refreshTokenValue,
        }),
      })

      if (!response.ok) {
        // Refresh failed, clear auth
        logout()
        return { success: false }
      }

      const data = await response.json()

      const token: AuthToken = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in,
        expires_at: Date.now() + data.expires_in * 1000,
      }

      localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(token))

      // Keep tokenManager in sync
      tokenManager.setToken(token.access_token, token.refresh_token, token.expires_in)

      setState((prev) => ({ ...prev, token, error: null }))

      return { success: true, token }
    } catch (error) {
      console.error("[Auth] Token refresh error:", error)
      logout()
      return { success: false }
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
    localStorage.removeItem(USER_STORAGE_KEY)
    // Clear tokenManager's slot so AuthGuard immediately redirects
    tokenManager.clearToken()

    setState({
      token: null,
      user: null,
      isLoading: false,
      error: null,
      isAuthenticated: false,
    })
  }, [])

  const getToken = useCallback(() => {
    return state.token?.access_token || null
  }, [state.token])

  return {
    ...state,
    signIn,
    refreshToken,
    logout,
    getToken,
  }
}

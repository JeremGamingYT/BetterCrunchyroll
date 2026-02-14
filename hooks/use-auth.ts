"use client"

import { useState, useCallback, useEffect } from "react"

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
        const response = await fetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            method: "sign_in",
            username,
            password,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Sign in failed")
        }

        const data = await response.json()

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

        // Store in localStorage
        localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(token))
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))

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

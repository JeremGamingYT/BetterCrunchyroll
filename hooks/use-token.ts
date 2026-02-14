"use client"

import { useEffect, useState } from "react"
import { tokenManager } from "@/lib/token-manager"

/**
 * Hook to use and monitor current token
 * Automatically updates when token changes
 */
export function useToken() {
  const [token, setToken] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // Subscribe to token changes
    const unsubscribe = tokenManager.subscribeToTokenChanges((newToken) => {
      setToken(newToken)
      setIsReady(true)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  return {
    token,
    isReady,
    hasToken: !!token,
    refreshToken: (refreshTokenValue: string) =>
      tokenManager.refreshToken(refreshTokenValue),
    setToken: (accessToken: string, refreshToken?: string, expiresIn?: number) =>
      tokenManager.setToken(accessToken, refreshToken, expiresIn),
    clearToken: () => tokenManager.clearToken(),
  }
}

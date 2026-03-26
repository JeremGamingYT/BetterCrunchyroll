"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useToken } from "@/hooks/use-token"
import { useAuth } from "@/hooks/use-auth"

interface AuthGuardProps {
  children: React.ReactNode
}

/**
 * Wraps protected pages. Redirects to /connexion when no valid Crunchyroll
 * token is found (neither from the browser extension nor from manual login).
 *
 * Checks TWO sources:
 *  - useToken  → tokenManager (extension token OR bcr_crunchyroll_token OR bcr_auth_token fallback)
 *  - useAuth   → direct localStorage read of bcr_auth_token (form login)
 * Either one being valid is sufficient to grant access.
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const { hasToken, isReady: tokenReady } = useToken()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()

  // Ready when both systems have finished initialising
  const isReady = tokenReady && !authLoading
  const isLoggedIn = hasToken || isAuthenticated

  useEffect(() => {
    if (isReady && !isLoggedIn) {
      router.replace("/connexion")
    }
  }, [isReady, isLoggedIn, router])

  // Still initialising — render spinner to avoid flash of protected content
  if (!isReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Vérification de la connexion…</p>
        </div>
      </div>
    )
  }

  if (isLoggedIn) {
    return <>{children}</>
  }

  return null
}


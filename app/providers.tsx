"use client"

import { useEffect } from "react"
import { WatchlistProvider } from "@/hooks/use-watchlist"
import { tokenManager } from "@/lib/token-manager"

function TokenManagerInitializer() {
  useEffect(() => {
    // Initialize token manager on mount
    tokenManager.initialize()

    return () => {
      // Cleanup if needed
    }
  }, [])

  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <WatchlistProvider>
            <TokenManagerInitializer />
            {children}
        </WatchlistProvider>
    )
}

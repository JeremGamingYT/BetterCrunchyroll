"use client"

import { WatchlistProvider } from "@/hooks/use-watchlist"

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <WatchlistProvider>
            {children}
        </WatchlistProvider>
    )
}

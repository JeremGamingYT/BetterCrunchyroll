"use client"

import { useEffect, useRef, Suspense } from "react"
import { usePathname, useSearchParams } from "next/navigation"

function NavigationSyncContent() {
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const lastNotifiedUrl = useRef<string | null>(null)
    const isInitialMount = useRef(true)

    useEffect(() => {
        const url = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`

        // Skip initial mount to prevent infinite loop on page load
        if (isInitialMount.current) {
            isInitialMount.current = false
            lastNotifiedUrl.current = url
            console.log('[BetterCrunchyroll] NavigationSync: Skipping initial mount')
            return
        }

        // Only run if we are in an iframe
        if (typeof window !== 'undefined' && window.parent !== window) {
            // Only notify if URL actually changed
            if (url === lastNotifiedUrl.current) {
                return
            }
            lastNotifiedUrl.current = url

            console.log('[BetterCrunchyroll] NavigationSync: URL changed, notifying parent:', url)
            // Send message to parent window to update URL
            window.parent.postMessage({
                type: 'BCR_NAVIGATE',
                path: url,
            }, '*')
        }
    }, [pathname, searchParams])

    return null
}

export function NavigationSync() {
    return (
        <Suspense fallback={null}>
            <NavigationSyncContent />
        </Suspense>
    )
}

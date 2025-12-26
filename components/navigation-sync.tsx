"use client"

import { useEffect, Suspense } from "react"
import { usePathname, useSearchParams } from "next/navigation"

function NavigationSyncContent() {
    const pathname = usePathname()
    const searchParams = useSearchParams()

    useEffect(() => {
        // Only run if we are in an iframe
        if (typeof window !== 'undefined' && window.parent !== window) {
            const url = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`

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

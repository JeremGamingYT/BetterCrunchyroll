"use client"

import { useState } from "react"
import { User } from "lucide-react"
import { cn } from "@/lib/utils"

// Default avatar as data URI (simple gradient circle)
const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23f97316'/%3E%3Cstop offset='100%25' style='stop-color:%23fb923c'/%3E%3C/linearGradient%3E%3C/defs%3E%3Ccircle cx='50' cy='50' r='50' fill='url(%23g)'/%3E%3Ccircle cx='50' cy='40' r='18' fill='white' opacity='0.9'/%3E%3Cellipse cx='50' cy='75' rx='28' ry='20' fill='white' opacity='0.9'/%3E%3C/svg%3E"

interface ProfileAvatarProps {
    /** Primary avatar URL (Crunchyroll) */
    src?: string | null
    /** Fallback avatar URL (AniList) */
    fallbackSrc?: string | null
    /** Alt text for the image */
    alt?: string
    /** Size variant */
    size?: "sm" | "md" | "lg"
    /** Additional class names */
    className?: string
    /** Show loading state */
    isLoading?: boolean
}

/**
 * ProfileAvatar Component
 * 
 * Implements a fallback chain for avatar display:
 * 1. Primary source (Crunchyroll avatar)
 * 2. Fallback source (AniList avatar) 
 * 3. Default avatar (built-in SVG)
 * 
 * All fallbacks happen silently without console errors.
 */
export function ProfileAvatar({
    src,
    fallbackSrc,
    alt = "Profile",
    size = "md",
    className,
    isLoading = false,
}: ProfileAvatarProps) {
    const [primaryFailed, setPrimaryFailed] = useState(false)
    const [fallbackFailed, setFallbackFailed] = useState(false)

    // Size classes
    const sizeClasses = {
        sm: "w-8 h-8",
        md: "w-12 h-12",
        lg: "w-16 h-16",
    }

    const iconSizes = {
        sm: "w-4 h-4",
        md: "w-6 h-6",
        lg: "w-8 h-8",
    }

    // Determine which image to show
    const getCurrentSrc = () => {
        if (!primaryFailed && src) return src
        if (!fallbackFailed && fallbackSrc) return fallbackSrc
        return DEFAULT_AVATAR
    }

    const currentSrc = getCurrentSrc()
    const showImage = currentSrc && !isLoading
    const showIcon = !showImage || (primaryFailed && fallbackFailed && !currentSrc)

    return (
        <div
            className={cn(
                "rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center overflow-hidden",
                sizeClasses[size],
                className
            )}
        >
            {isLoading ? (
                <div className={cn("rounded-full bg-primary/30 animate-pulse", sizeClasses[size])} />
            ) : showIcon ? (
                <User className={cn("text-primary", iconSizes[size])} />
            ) : (
                <img
                    src={currentSrc}
                    alt={alt}
                    className="w-full h-full object-cover"
                    onError={() => {
                        if (!primaryFailed && src === currentSrc) {
                            setPrimaryFailed(true)
                        } else if (!fallbackFailed) {
                            setFallbackFailed(true)
                        }
                    }}
                />
            )}
        </div>
    )
}

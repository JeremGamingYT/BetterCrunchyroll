"use client"

import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"

interface LoadingScreenProps {
    isLoading: boolean
    message?: string
}

export function LoadingScreen({ isLoading, message = "Chargement..." }: LoadingScreenProps) {
    const [show, setShow] = useState(isLoading)
    const [fadeOut, setFadeOut] = useState(false)

    useEffect(() => {
        if (!isLoading) {
            // Start fade out animation
            setFadeOut(true)
            // Remove from DOM after animation
            const timer = setTimeout(() => {
                setShow(false)
                setFadeOut(false)
            }, 500)
            return () => clearTimeout(timer)
        } else {
            setShow(true)
            setFadeOut(false)
        }
    }, [isLoading])

    if (!show) return null

    return (
        <div
            className={cn(
                "fixed inset-0 z-[9999] flex items-center justify-center",
                "bg-background transition-all duration-500",
                fadeOut ? "opacity-0" : "opacity-100"
            )}
        >
            <div className="flex flex-col items-center gap-8">
                {/* Logo with animation */}
                <div className="relative">
                    {/* Outer glow ring */}
                    <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />

                    {/* Main logo container */}
                    <div className="relative w-24 h-24 flex items-center justify-center">
                        {/* Spinning ring */}
                        <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                        <div
                            className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin"
                            style={{ animationDuration: '1s' }}
                        />

                        {/* Inner pulsing circle */}
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center animate-pulse">
                            <span className="text-2xl font-bold text-white">BC</span>
                        </div>
                    </div>
                </div>

                {/* Brand name */}
                <div className="text-center">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-primary via-orange-400 to-primary bg-clip-text text-transparent animate-pulse">
                        BetterCrunchyroll
                    </h1>
                    <p className="text-muted-foreground mt-2 text-sm">{message}</p>
                </div>

                {/* Loading dots */}
                <div className="flex gap-1.5">
                    {[0, 1, 2].map((i) => (
                        <div
                            key={i}
                            className="w-2 h-2 rounded-full bg-primary animate-bounce"
                            style={{ animationDelay: `${i * 0.15}s` }}
                        />
                    ))}
                </div>
            </div>
        </div>
    )
}

// Hook to check if all initial data is loaded
export function useInitialLoading(loadingStates: boolean[]) {
    const isAnyLoading = loadingStates.some(Boolean)
    const [hasHadData, setHasHadData] = useState(false)

    useEffect(() => {
        if (!isAnyLoading) {
            setHasHadData(true)
        }
    }, [isAnyLoading])

    // Show loading screen only on initial load
    return !hasHadData && isAnyLoading
}

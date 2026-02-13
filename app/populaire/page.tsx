"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { AnimeCard } from "@/components/anime-card"
import { usePopularAnime } from "@/hooks/use-combined-anime"
import { Loader2, Star, Users } from "lucide-react"
import { useEffect } from "react"

export default function PopulairePage() {
  const { data: popularAnimes, isLoading, error } = usePopularAnime(1, 50)

  useEffect(() => {
    console.log("[v0] PopulairePage - isLoading:", isLoading)
    console.log("[v0] PopulairePage - error:", error)
    console.log("[v0] PopulairePage - data:", popularAnimes)
  }, [isLoading, error, popularAnimes])

  // Sort by score and popularity (combined)
  // Sort by score and popularity (combined)
  const sortedAnimes = popularAnimes
    ? [...popularAnimes].sort((a, b) => {
      const scoreA = (a.score || 0)
      const scoreB = (b.score || 0)
      const popA = (a.popularity || 0)
      const popB = (b.popularity || 0)

      // Weighted Calculation:
      // Score (0-10) is the primary factor.
      // Popularity (Log10) is a secondary bonus.
      // Factor 0.2 means: 10x popularity difference (Log diff = 1) is worth 0.2 score points.
      // Checks:
      // 9.0 (10k) vs 8.5 (1M). 9.0+(4*0.2)=9.8. 8.5+(6*0.2)=9.7. 9.0 wins.
      // 8.3 (1m) vs 9.1 (10k). 8.3+(6*0.2)=9.5. 9.1+(4*0.2)=9.9. 9.1 wins.

      const weightedA = scoreA + (Math.log10(popA + 1) * 0.2)
      const weightedB = scoreB + (Math.log10(popB + 1) * 0.2)

      return weightedB - weightedA
    })
    : []

  return (
    <main className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      <Header />

      <div className="pt-36 pb-16 px-6 md:px-12 lg:px-20 max-w-[2000px] mx-auto">
        {/* Hero Section */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-black font-bangers tracking-wide mb-3">Populaires</h1>
          <p className="text-lg text-muted-foreground flex items-center gap-2 font-medium">
            <Star className="w-5 h-5 text-primary" fill="currentColor" />
            Top Anime (Note + Popularité)
            <Users className="w-5 h-5 text-muted-foreground ml-2" />
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="flex flex-col items-center justify-center py-32 text-muted-foreground">
            <p className="text-lg font-medium">Erreur lors du chargement.</p>
            <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
              Réessayer
            </button>
            <p className="text-sm mt-4 opacity-50">Détail: {error?.message || String(error)}</p>
          </div>
        )}

        {/* Grid of Anime Cards */}
        {!isLoading && !error && sortedAnimes.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-6 gap-y-10 md:gap-x-8 md:gap-y-12">
            {sortedAnimes.map((anime, index) => (
              <div key={anime.id} className="relative group">
                {/* No Rank Badge - Clean Design */}
                <AnimeCard anime={anime} index={index} />
              </div>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </main>
  )
}

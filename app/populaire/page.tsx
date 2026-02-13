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
      const crRatingA = (a as any).crRating || 0
      const crRatingB = (b as any).crRating || 0
      const crCountA = (a as any).crVoteCount || 0
      const crCountB = (b as any).crVoteCount || 0

      // Weighted Calculation: AGGRESSIVE CR BIAS
      // The user wants efficient popularity sorting based on CR votes.
      // We assume CR votes are the most important metric for "Populaire".

      // Normalize scores
      // AL Score (0-10) -> 0-100
      const scoreA_AL = (a.score || 0) * 10
      const scoreB_AL = (b.score || 0) * 10

      // CR Score (0-5) -> 0-100
      const scoreA_CR = crRatingA * 20
      const scoreB_CR = crRatingB * 20

      // If CR data is missing, we penalty heavily if comparing against one that has it?
      // No, just treat as 0.

      // Weights: 
      // If we have CR data, it dominates.
      // Formula: (AL * 0.2) + (CR * 0.8) + (Log10(Votes) * 25)
      // Log10(100k) = 5. Log10(500k) = 5.7. Diff = 0.7 * 25 = 17.5 points.
      // AL Score Diff (9.5 vs 8.5) = 10 points. 
      // So 5x votes beats 1.0 score diff.

      const baseScoreA = (scoreA_AL * 0.2) + (scoreA_CR * 0.8)
      const baseScoreB = (scoreB_AL * 0.2) + (scoreB_CR * 0.8)

      const boostA = Math.log10(crCountA + 1) * 25
      const boostB = Math.log10(crCountB + 1) * 25

      const totalA = baseScoreA + boostA
      const totalB = baseScoreB + boostB

      return totalB - totalA
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

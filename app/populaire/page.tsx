"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { AnimeCard } from "@/components/anime-card"
import { usePopularAnime } from "@/hooks/use-anilist"
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
  const sortedAnimes = popularAnimes
    ? [...popularAnimes].sort((a, b) => {
        // Combine score and popularity for ranking
        const aScore = (a.score || 0) * 10 + (a.popularity ? Math.log10(a.popularity) : 0)
        const bScore = (b.score || 0) * 10 + (b.popularity ? Math.log10(b.popularity) : 0)
        return bScore - aScore
      })
    : []

  return (
    <main className="min-h-screen bg-background">
      <Header />

      <div className="pt-24 pb-16 px-4 md:px-8 lg:px-12">
        {/* Hero Section */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Populaires</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <Star className="w-4 h-4 text-primary" fill="currentColor" />
            Classé par note et popularité
            <Users className="w-4 h-4 text-muted-foreground ml-2" />
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <p>Erreur lors du chargement. Veuillez réessayer.</p>
            <p className="text-sm mt-2">Détail: {error?.message || String(error)}</p>
          </div>
        )}

        {/* Grid of Anime Cards with ranking */}
        {!isLoading && !error && sortedAnimes.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
            {sortedAnimes.map((anime, index) => (
              <div key={anime.id} className="relative">
                {/* Ranking Badge */}
                <div className="absolute -top-2 -left-2 z-10 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shadow-lg">
                  {index + 1}
                </div>
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

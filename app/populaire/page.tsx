"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { AnimeCard } from "@/components/anime-card"
import { usePopularAnime } from "@/hooks/use-combined-anime"
import { Loader2 } from "lucide-react"
import { useEffect } from "react"

export default function PopulairePage() {
  const { data: popularAnimes, isLoading, error } = usePopularAnime(1, 100)

  useEffect(() => {
    console.log("[PopulairePage] isLoading:", isLoading)
    console.log("[PopulairePage] error:", error)
    console.log("[PopulairePage] data:", popularAnimes)
  }, [isLoading, error, popularAnimes])

  return (
    <main className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      <Header />

      <div className="pt-36 pb-16 px-6 md:px-12 lg:px-20 max-w-[2000px] mx-auto">
        {/* Hero Section */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-black font-bangers tracking-wide mb-3">🔥 Populaires</h1>
          <p className="text-lg text-muted-foreground font-medium">
            Combinaison Crunchyroll + AniList pour les vrais populaires
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
            <p className="text-lg font-medium">Erreur lors du chargement. Veuillez réessayer.</p>
            <p className="text-sm mt-2">Détail: {error?.message || String(error)}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Rafraîchir
            </button>
          </div>
        )}

        {/* Grid of Anime Cards */}
        {!isLoading && !error && popularAnimes && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-6 gap-y-10 md:gap-x-8 md:gap-y-12">
            {popularAnimes.map((anime, index) => (
              <div key={anime.id} className="relative group">
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


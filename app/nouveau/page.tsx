"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { AnimeCard } from "@/components/anime-card"
import { useNewAnime } from "@/hooks/use-anilist"
import { Loader2 } from "lucide-react"
import { useEffect } from "react"

export default function NouveauPage() {
  const { data: newAnimes, isLoading, error } = useNewAnime(1, 50)

  useEffect(() => {
    console.log("[v0] NouveauPage - isLoading:", isLoading)
    console.log("[v0] NouveauPage - error:", error)
    console.log("[v0] NouveauPage - data:", newAnimes)
  }, [isLoading, error, newAnimes])

  return (
    <main className="min-h-screen bg-background">
      <Header />

      <div className="pt-24 pb-16 px-4 md:px-8 lg:px-12">
        {/* Hero Section */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Nouveautés</h1>
          <p className="text-muted-foreground">Découvrez les derniers anime de la saison</p>
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

        {/* Grid of Anime Cards */}
        {!isLoading && !error && newAnimes && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
            {newAnimes.map((anime, index) => (
              <AnimeCard key={anime.id} anime={anime} index={index} />
            ))}
          </div>
        )}
      </div>

      <Footer />
    </main>
  )
}

"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { AnimeCard } from "@/components/anime-card"
import { usePopularAnime } from "@/hooks/use-combined-anime"
import { Loader2, ChevronDown } from "lucide-react"
import { useEffect } from "react"

export default function PopulairePage() {
  const [page, setPage] = useState(1)
  const [allAnimes, setAllAnimes] = useState<any[]>([])
  
  const { data: pageAnimes, isLoading, error } = usePopularAnime(page, 20)

  // Accumulate anime as pages load
  useEffect(() => {
    if (pageAnimes && pageAnimes.length > 0) {
      setAllAnimes(prev => {
        // Remove duplicates based on ID
        const existingIds = new Set(prev.map(a => a.id))
        const newAnimes = pageAnimes.filter(a => !existingIds.has(a.id))
        return [...prev, ...newAnimes]
      })
    }
  }, [pageAnimes])

  const handleLoadMore = () => {
    setPage(prev => prev + 1)
  }

  return (
    <main className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      <Header />

      <div className="pt-36 pb-16 px-6 md:px-12 lg:px-20 max-w-[2000px] mx-auto">
        {/* Hero Section */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-black font-bangers tracking-wide mb-3">Populaires</h1>
          <p className="text-lg text-muted-foreground font-medium">
            Combinaison Crunchyroll + AniList pour les vrais populaires
          </p>
        </div>

        {/* Error State */}
        {error && !isLoading && allAnimes.length === 0 && (
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
        {allAnimes.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-6 gap-y-10 md:gap-x-8 md:gap-y-12">
              {allAnimes.map((anime, index) => (
                <div key={anime.id} className="relative group">
                  <AnimeCard anime={anime} index={index} />
                </div>
              ))}
            </div>

            {/* Load More Button */}
            {pageAnimes && pageAnimes.length > 0 && (
              <div className="flex justify-center mt-16">
                <button
                  onClick={handleLoadMore}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Chargement...
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      Charger plus
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}

        {/* Initial Loading State */}
        {isLoading && allAnimes.length === 0 && (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
          </div>
        )}
      </div>

      <Footer />
    </main>
  )
}


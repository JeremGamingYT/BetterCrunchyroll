"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { AnimeCard } from "@/components/anime-card"
import { useNewAnimeCrunchyroll } from "@/hooks/use-new-anime-crunchyroll"
import { Loader2, ChevronDown } from "lucide-react"

export default function NouveauPage() {
  const { data: newAnimes, isLoading, error, enrichmentProgress, loadMore, hasMore, isLoadingMore } = useNewAnimeCrunchyroll(50)

  return (
    <main className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      <Header />

      <div className="pt-36 pb-16 px-6 md:px-12 lg:px-20 max-w-[2000px] mx-auto">
        {/* Hero Section */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-black font-bangers tracking-wide mb-3">Nouveautés</h1>
          <p className="text-lg text-muted-foreground font-medium">Découvrez les derniers anime de l'année 2025 en direct depuis Crunchyroll</p>
          {enrichmentProgress > 0 && enrichmentProgress < 100 && (
            <div className="mt-4 text-sm text-muted-foreground">
              <p className="mb-2">Enrichissement en cours: {enrichmentProgress}%</p>
              <div className="w-full max-w-xs h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${enrichmentProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Error State */}
        {error && !isLoading && newAnimes.length === 0 && (
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
        {newAnimes.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-6 gap-y-10 md:gap-x-8 md:gap-y-12">
              {newAnimes.map((anime, index) => (
                <div key={anime.id} className="relative group">
                  <AnimeCard anime={anime} index={index} />
                </div>
              ))}
            </div>

            {/* Load More Button */}
            {hasMore && (
              <div className="flex justify-center mt-16">
                <button
                  onClick={loadMore}
                  disabled={isLoading || isLoadingMore}
                  className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {isLoading || isLoadingMore ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Chargement...
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      Charger plus ({newAnimes.length} animés chargés)
                    </>
                  )}
                </button>
              </div>
            )}

            {/* End of list message */}
            {!hasMore && newAnimes.length > 0 && (
              <div className="flex justify-center mt-16 text-muted-foreground">
                <p className="text-center">
                  Tous les {newAnimes.length} nouveaux animés de l'année {new Date().getFullYear()} ont été chargés ! 🎉
                </p>
              </div>
            )}
          </>
        )}

        {/* Initial Loading State */}
        {isLoading && newAnimes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32">
            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Chargement des nouveaux animés et enrichissement...</p>
          </div>
        )}
      </div>

      <Footer />
    </main>
  )
}

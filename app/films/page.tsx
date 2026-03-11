"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { AnimeCard } from "@/components/anime-card"
import { useMoviesInfinite } from "@/hooks/use-combined-anime"
import { Loader2, ChevronDown, Film } from "lucide-react"

export default function FilmsPage() {
  const { data: movies, isLoading, isLoadingMore, hasMore, error, loadMore } = useMoviesInfinite(50)

  return (
    <main className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      <Header />

      <div className="pt-36 pb-16 px-6 md:px-12 lg:px-20 max-w-[2000px] mx-auto">
        {/* Hero Section */}
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-3">
            <Film className="w-9 h-9 text-primary" />
            <h1 className="text-4xl md:text-5xl font-black font-bangers tracking-wide">Films</h1>
          </div>
          <p className="text-lg text-muted-foreground font-medium">
            Découvrez les films d'animation disponibles sur Crunchyroll
          </p>
        </div>

        {/* Error State */}
        {error && !isLoading && movies.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32 text-muted-foreground">
            <p className="text-lg font-medium">Erreur lors du chargement. Veuillez réessayer.</p>
            <p className="text-sm mt-2">Détail: {(error as Error)?.message || String(error)}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Rafraîchir
            </button>
          </div>
        )}

        {/* Grid of Movie Cards */}
        {movies.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-6 gap-y-10 md:gap-x-8 md:gap-y-12">
              {movies.map((movie, index) => (
                <div key={movie.id} className="relative group">
                  <AnimeCard anime={movie} index={index} />
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
                      Charger plus ({movies.length} films chargés)
                    </>
                  )}
                </button>
              </div>
            )}

            {/* End of list */}
            {!hasMore && movies.length > 0 && (
              <div className="flex justify-center mt-16 text-muted-foreground">
                <p className="text-center">
                  Tous les {movies.length} films disponibles ont été chargés ! 🎬
                </p>
              </div>
            )}
          </>
        )}

        {/* Initial Loading State */}
        {isLoading && movies.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32">
            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Chargement des films...</p>
          </div>
        )}
      </div>

      <Footer />
    </main>
  )
}

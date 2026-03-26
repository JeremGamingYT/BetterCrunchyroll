"use client"

import { Header } from "@/components/header"
import { HeroCarousel } from "@/components/hero-carousel"
import { AnimeSection } from "@/components/anime-section"
import { ContinueWatching } from "@/components/continue-watching"
import { Footer } from "@/components/footer"
import { LoadingScreen, useInitialLoading } from "@/components/loading-screen"
import { AuthGuard } from "@/components/auth-guard"
import { useTrendingAnime, usePopularAnime, useNewAnime, useSimulcastAnime, useDubbedAnime, useSubbedAnime, useMovieListings } from "@/hooks/use-combined-anime"

function HomeContent() {
  const { data: trendingAnimes, isLoading: loadingTrending, error: errorTrending } = useTrendingAnime(1, 12)
  const { data: popularAnimesData, isLoading: loadingPopular, error: errorPopular } = usePopularAnime(1, 12)
  const { data: newAnimesData, isLoading: loadingNew, error: errorNew } = useNewAnime(1, 12)
  const { data: simulcastAnimesData, isLoading: loadingSimulcast, error: errorSimulcast } = useSimulcastAnime(1, 12)
  const { data: dubbedAnimesData, isLoading: loadingDubbed, error: errorDubbed } = useDubbedAnime(1, 12)
  const { data: subbedAnimesData, isLoading: loadingSubbed, error: errorSubbed } = useSubbedAnime(1, 12)
  const { data: movieListingsData, isLoading: loadingMovies, error: errorMovies } = useMovieListings(1, 12)

  const showInitialLoading = useInitialLoading([loadingTrending, loadingPopular, loadingNew, loadingSimulcast, loadingDubbed, loadingSubbed, loadingMovies])

  return (
    <>
      <LoadingScreen isLoading={showInitialLoading} message="Chargement du contenu..." />
      <main className="min-h-screen bg-background isolate">
        <Header />
        <HeroCarousel />
        <div className="relative z-10 px-4 md:px-8 lg:px-12 pb-16">
          <div className="relative z-20 space-y-8 pt-2">
            {/* Recommandés pour vous — first section right after hero */}
            <AnimeSection
              title="Recommandés pour vous"
              animes={trendingAnimes}
              isLoading={loadingTrending}
              error={errorTrending}
              sectionSlug="/populaire"
            />

            {/* Continuer à regarder */}
            <ContinueWatching />

            {/* Ajouts récents */}
            <AnimeSection
              title="Ajouts récents"
              animes={newAnimesData}
              isLoading={loadingNew}
              error={errorNew}
              sectionSlug="/nouveau"
              showNewBadge
            />

            {/* Populaires */}
            <AnimeSection
              title="Populaires"
              animes={popularAnimesData}
              isLoading={loadingPopular}
              error={errorPopular}
              sectionSlug="/populaire"
            />

            {/* Simulcast */}
            <AnimeSection
              title="Simulcast de la saison"
              animes={simulcastAnimesData}
              isLoading={loadingSimulcast}
              error={errorSimulcast}
              showAiring
              sectionSlug="/simulcast"
            />

            {/* VF */}
            <AnimeSection
              title="Disponible en VF"
              animes={dubbedAnimesData}
              isLoading={loadingDubbed}
              error={errorDubbed}
              hideViewAll
            />

            {/* VOSTFR */}
            <AnimeSection
              title="Version sous-titrée"
              animes={subbedAnimesData}
              isLoading={loadingSubbed}
              error={errorSubbed}
              hideViewAll
            />

            {/* Films */}
            <AnimeSection
              title="Films Crunchyroll"
              animes={movieListingsData}
              isLoading={loadingMovies}
              error={errorMovies}
              sectionSlug="/films"
            />
          </div>
        </div>
        <Footer />
      </main>
    </>
  )
}

export default function Home() {
  return (
    <AuthGuard>
      <HomeContent />
    </AuthGuard>
  )
}

"use client"

import { Header } from "@/components/header"
import { HeroCarousel } from "@/components/hero-carousel"
import { AnimeSection } from "@/components/anime-section"
import { ContinueWatching } from "@/components/continue-watching"
import { Footer } from "@/components/footer"
import { LoadingScreen, useInitialLoading } from "@/components/loading-screen"
import { useTrendingAnime, usePopularAnime, useNewAnime, useSimulcastAnime } from "@/hooks/use-combined-anime"

export default function Home() {
  const { data: trendingAnimes, isLoading: loadingTrending, error: errorTrending } = useTrendingAnime(1, 12)
  const { data: popularAnimesData, isLoading: loadingPopular, error: errorPopular } = usePopularAnime(1, 12)
  const { data: newAnimesData, isLoading: loadingNew, error: errorNew } = useNewAnime(1, 12)
  const { data: simulcastAnimesData, isLoading: loadingSimulcast, error: errorSimulcast } = useSimulcastAnime(1, 12)

  // Show loading screen only on initial load
  const showInitialLoading = useInitialLoading([loadingTrending, loadingPopular, loadingNew, loadingSimulcast])

  return (
    <>
      <LoadingScreen isLoading={showInitialLoading} message="Chargement du contenu..." />
      <main className="min-h-screen bg-background isolate">
        <Header />
        <HeroCarousel />
        <div className="relative z-10 px-4 md:px-8 lg:px-12 pb-16">
          <div className="relative -mt-8 z-20 space-y-8">
            <div className="mt-16">
              <ContinueWatching />
            </div>
            <AnimeSection
              title="Notre sélection pour vous"
              animes={trendingAnimes}
              isLoading={loadingTrending}
              error={errorTrending}
              sectionSlug="/populaire"
            />
            <AnimeSection
              title="Nouveautés"
              animes={newAnimesData}
              isLoading={loadingNew}
              error={errorNew}
              sectionSlug="/nouveau"
            />
            <AnimeSection
              title="Populaires"
              animes={popularAnimesData}
              isLoading={loadingPopular}
              error={errorPopular}
              sectionSlug="/populaire"
            />
            <AnimeSection
              title="Simulcast de la saison"
              animes={simulcastAnimesData}
              isLoading={loadingSimulcast}
              error={errorSimulcast}
              showAiring
              sectionSlug="/simulcast"
            />
          </div>
        </div>
        <Footer />
      </main>
    </>
  )
}

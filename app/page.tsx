"use client"

import { Header } from "@/components/header"
import { HeroCarousel } from "@/components/hero-carousel"
import { AnimeSection } from "@/components/anime-section"
import { ContinueWatching } from "@/components/continue-watching"
import { Footer } from "@/components/footer"
import { useTrendingAnime, usePopularAnime, useNewAnime, useSimulcastAnime } from "@/hooks/use-anilist"

export default function Home() {
  const { data: trendingAnimes, isLoading: loadingTrending, error: errorTrending } = useTrendingAnime(1, 12)
  const { data: popularAnimesData, isLoading: loadingPopular, error: errorPopular } = usePopularAnime(1, 12)
  const { data: newAnimesData, isLoading: loadingNew, error: errorNew } = useNewAnime(1, 12)
  const { data: simulcastAnimesData, isLoading: loadingSimulcast, error: errorSimulcast } = useSimulcastAnime(1, 12)

  return (
    <main className="min-h-screen bg-background isolate">
      <Header />
      <HeroCarousel />
      <div className="relative z-10 px-4 md:px-8 lg:px-12 pb-16">
        <div className="relative -mt-16 z-20 space-y-8">
          <ContinueWatching />
          <AnimeSection
            title="Notre sélection pour vous"
            animes={trendingAnimes}
            isLoading={loadingTrending}
            error={errorTrending}
          />
          <AnimeSection title="Nouveautés" animes={newAnimesData} isLoading={loadingNew} error={errorNew} />
          <AnimeSection title="Populaires" animes={popularAnimesData} isLoading={loadingPopular} error={errorPopular} />
          <AnimeSection
            title="Simulcast de la saison"
            animes={simulcastAnimesData}
            isLoading={loadingSimulcast}
            error={errorSimulcast}
            showAiring
          />
        </div>
      </div>
      <Footer />
    </main>
  )
}

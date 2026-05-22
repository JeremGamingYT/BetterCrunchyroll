"use client"

import { Header } from "@/components/header"
import { HeroCarousel } from "@/components/hero-carousel"
import { AnimeSection } from "@/components/anime-section"
import { ContinueWatching } from "@/components/continue-watching"
import { Footer } from "@/components/footer"
import { LoadingScreen, useInitialLoading } from "@/components/loading-screen"
import { AuthGuard } from "@/components/auth-guard"
import { useTrendingAnime, usePopularAnime, useNewAnime, useSimulcastAnime, useDubbedAnime, useSubbedAnime, useMovieListings } from "@/hooks/use-combined-anime"
import { useI18n } from "@/hooks/use-i18n"

function HomeContent() {
  const { t } = useI18n()
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
      <main className="relative min-h-screen overflow-x-hidden bg-black isolate">
        <div
          className="netflix-app-shell relative z-10 mx-auto min-h-screen w-full overflow-visible bg-black"
          onPointerMove={(event) => {
            const rect = event.currentTarget.getBoundingClientRect()
            event.currentTarget.style.setProperty("--home-x", `${event.clientX - rect.left}px`)
            event.currentTarget.style.setProperty("--home-y", `${event.clientY - rect.top}px`)
          }}
        >
        <Header />
        <HeroCarousel />

        {/* ── Content rows ── */}
        <div className="home-content-shell relative z-20 -mt-32 w-full px-8 pt-36 pb-20 md:px-10 lg:px-12">
          <div className="space-y-1 md:space-y-2">

            {/* Continuer à regarder */}
            <ContinueWatching />

            {/* Recommandés pour vous — poster (affiches verticales comme D+) */}
            <AnimeSection
              title={t("sections.nextWatch")}
              animes={trendingAnimes}
              isLoading={loadingTrending}
              error={errorTrending}
              sectionSlug="/populaire"
              cardLayout="poster"
            />

            {/* Ajouts récents — landscape */}
            <AnimeSection
              title={t("sections.recentAdds")}
              animes={newAnimesData}
              isLoading={loadingNew}
              error={errorNew}
              sectionSlug="/nouveau"
              showNewBadge
              cardLayout="poster"
            />

            {/* Populaires — landscape */}
            <AnimeSection
              title={t("sections.popular")}
              animes={popularAnimesData}
              isLoading={loadingPopular}
              error={errorPopular}
              sectionSlug="/populaire"
              cardLayout="poster"
            />

            {/* Simulcast — landscape */}
            <AnimeSection
              title={t("sections.seasonSimulcast")}
              animes={simulcastAnimesData}
              isLoading={loadingSimulcast}
              error={errorSimulcast}
              showAiring
              sectionSlug="/simulcast"
              cardLayout="poster"
            />

            {/* VF — poster */}
            <AnimeSection
              title={t("sections.dubbed")}
              animes={dubbedAnimesData}
              isLoading={loadingDubbed}
              error={errorDubbed}
              hideViewAll
              cardLayout="poster"
            />

            {/* VOSTFR — poster */}
            <AnimeSection
              title={t("sections.subtitled")}
              animes={subbedAnimesData}
              isLoading={loadingSubbed}
              error={errorSubbed}
              hideViewAll
              cardLayout="poster"
            />

            {/* Films — poster (affiches de films) */}
            <AnimeSection
              title={t("sections.crunchyrollMovies")}
              animes={movieListingsData}
              isLoading={loadingMovies}
              error={errorMovies}
              sectionSlug="/films"
              cardLayout="poster"
            />
          </div>
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

"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { HeroCarousel } from "@/components/hero-carousel"
import { AnimeSection } from "@/components/anime-section"
import { ContinueWatching } from "@/components/continue-watching"
import { Footer } from "@/components/footer"
import { LoadingScreen, useInitialLoading } from "@/components/loading-screen"
import { AuthGuard } from "@/components/auth-guard"
import { useTrendingAnime, usePopularAnime, useNewAnime, useSimulcastAnime, useDubbedAnime, useSubbedAnime, useMovieListings } from "@/hooks/use-combined-anime"
import { cn } from "@/lib/utils"

const TABS = [
  { id: "pour-vous", label: "Pour vous" },
  { id: "simulcast", label: "Simulcast" },
  { id: "films", label: "Films" },
  { id: "vf", label: "VF" },
]

function HomeContent() {
  const [activeTab, setActiveTab] = useState("pour-vous")

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
      <main className="min-h-screen bg-[#040404] isolate">
        <Header />
        <HeroCarousel />

        {/* ── Category tabs ── */}
        <div className="relative z-20 flex items-center gap-2 px-4 md:px-12 lg:px-16 -mt-6 pb-4">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-5 py-1.5 rounded-full text-sm font-semibold border transition-all duration-200",
                activeTab === tab.id
                  ? "bg-white text-black border-white"
                  : "bg-transparent text-white/80 border-white/30 hover:border-white/70 hover:text-white"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Content rows ── */}
        <div className="relative z-10 px-4 md:px-12 lg:px-16 pb-20">
          <div className="space-y-10">

            {/* Continuer à regarder */}
            <ContinueWatching />

            {/* Recommandés pour vous — poster (affiches verticales comme D+) */}
            <AnimeSection
              title="Recommandés pour vous"
              animes={trendingAnimes}
              isLoading={loadingTrending}
              error={errorTrending}
              sectionSlug="/populaire"
              cardLayout="poster"
            />

            {/* Ajouts récents — landscape */}
            <AnimeSection
              title="Ajouts récents"
              animes={newAnimesData}
              isLoading={loadingNew}
              error={errorNew}
              sectionSlug="/nouveau"
              showNewBadge
              cardLayout="landscape"
            />

            {/* Populaires — landscape */}
            <AnimeSection
              title="Populaires"
              animes={popularAnimesData}
              isLoading={loadingPopular}
              error={errorPopular}
              sectionSlug="/populaire"
              cardLayout="landscape"
            />

            {/* Simulcast — landscape */}
            <AnimeSection
              title="Simulcast de la saison"
              animes={simulcastAnimesData}
              isLoading={loadingSimulcast}
              error={errorSimulcast}
              showAiring
              sectionSlug="/simulcast"
              cardLayout="landscape"
            />

            {/* VF — poster */}
            <AnimeSection
              title="Disponible en VF"
              animes={dubbedAnimesData}
              isLoading={loadingDubbed}
              error={errorDubbed}
              hideViewAll
              cardLayout="poster"
            />

            {/* VOSTFR — poster */}
            <AnimeSection
              title="Version sous-titrée"
              animes={subbedAnimesData}
              isLoading={loadingSubbed}
              error={errorSubbed}
              hideViewAll
              cardLayout="poster"
            />

            {/* Films — poster (affiches de films) */}
            <AnimeSection
              title="Films Crunchyroll"
              animes={movieListingsData}
              isLoading={loadingMovies}
              error={errorMovies}
              sectionSlug="/films"
              cardLayout="poster"
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


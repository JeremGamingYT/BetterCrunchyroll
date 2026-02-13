"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Loader2, Star, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTrendingAnime } from "@/hooks/use-combined-anime"
import type { TransformedAnime } from "@/lib/anilist"

interface RandomRecommendationBannerProps {
  className?: string
}

type RecommendedAnime = TransformedAnime & {
  crunchyrollId?: string | null
  crunchyrollSlug?: string | null
}

export function RandomRecommendationBanner({ className }: RandomRecommendationBannerProps) {
  const { data: trendingAnimes, isLoading } = useTrendingAnime(1, 12)
  const [selectedAnime, setSelectedAnime] = useState<RecommendedAnime | null>(null)

  // Select random anime from trending list
  useEffect(() => {
    if (trendingAnimes && trendingAnimes.length > 0) {
      const randomIndex = Math.floor(Math.random() * trendingAnimes.length)
      const anime = trendingAnimes[randomIndex]
      if (anime) {
        setSelectedAnime(anime as RecommendedAnime)
      }
    }
  }, [trendingAnimes])

  if (isLoading && !selectedAnime) {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800",
          "h-64 md:h-80 flex items-center justify-center",
          "border border-border/50",
          "mb-8 shadow-lg",
          className,
        )}
      >
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!selectedAnime) {
    return null
  }

  const animeImage = selectedAnime.bannerImage || selectedAnime.image || "/placeholder.svg"
  const animeScore = selectedAnime.score ? Math.round(selectedAnime.score * 10) / 10 : null
  const crunchyrollId = "crunchyrollId" in selectedAnime ? selectedAnime.crunchyrollId : null
  const linkHref = crunchyrollId ? `/watch/${crunchyrollId}` : "/"

  return (
    <Link href={linkHref} className="block">
      <div
        className={cn(
          "group relative overflow-hidden rounded-2xl",
          "h-64 md:h-80 cursor-pointer",
          "border border-border/50 shadow-lg hover:shadow-2xl",
          "transition-all duration-500",
          "mb-8",
          className,
        )}
      >
        {/* Background Image with Overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
          style={{
            backgroundImage: `url('${animeImage}')`,
          }}
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent group-hover:via-black/60 transition-all duration-300" />

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col justify-between p-6 md:p-8">
          {/* Top - Badge */}
          <div className="flex items-center gap-2 w-fit">
            <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" />
            <span className="text-xs md:text-sm font-bold text-yellow-400 uppercase tracking-wider">
              Recommandé pour toi
            </span>
          </div>

          {/* Bottom - Info */}
          <div className="space-y-3 transform group-hover:-translate-y-1 transition-transform duration-300">
            {/* Title */}
            <h3 className="text-2xl md:text-3xl font-black text-white font-bangers tracking-wide line-clamp-2 group-hover:line-clamp-3 transition-all duration-300">
              {selectedAnime.title}
            </h3>

            {/* Description */}
            {selectedAnime.description && (
              <p className="text-sm md:text-base text-gray-200 line-clamp-2 max-w-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {selectedAnime.description.substring(0, 150)}...
              </p>
            )}

            {/* Score and Info */}
            <div className="flex items-center gap-4 md:gap-6 flex-wrap">
              {animeScore && (
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 md:w-5 md:h-5 fill-yellow-400 text-yellow-400" />
                  <span className="text-yellow-400 font-bold text-sm md:text-base">{animeScore}</span>
                </div>
              )}

              {selectedAnime.genres && selectedAnime.genres.length > 0 && (
                <div className="flex gap-2">
                  {selectedAnime.genres.slice(0, 2).map((genre) => (
                    <span
                      key={genre}
                      className="px-2 py-1 text-xs md:text-sm font-medium bg-primary/20 text-primary rounded-full border border-primary/30"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* CTA Button */}
            <div className="pt-2">
              <div className="inline-flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 bg-primary text-primary-foreground rounded-lg font-semibold text-sm md:text-base hover:bg-primary/90 transition-colors group-hover:scale-105 transform duration-300 active:scale-95">
                Découvrir
                <span className="text-lg">→</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
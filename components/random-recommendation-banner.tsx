"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Loader2, Star, Sparkles, Play } from "lucide-react"
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
          "h-80 md:h-96 flex items-center justify-center",
          "border border-primary/30 shadow-xl",
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
  // Always link to internal watch page
  const linkHref = crunchyrollId ? `/watch/${crunchyrollId}` : "/populaire"

  return (
    <Link href={linkHref} className="block">
      <div
        className={cn(
          "group relative overflow-hidden rounded-2xl",
          "h-80 md:h-96 lg:h-[28rem] cursor-pointer",
          "border border-primary/30 shadow-xl hover:shadow-2xl",
          "transition-all duration-500",
          className,
        )}
      >
        {/* Premium Background Image with Overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
          style={{
            backgroundImage: `url('${animeImage}')`,
          }}
        />

        {/* Advanced Gradient Overlay System */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent group-hover:via-black/50 transition-all duration-300" />
        
        {/* Side gradient for depth */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Secondary gradient for premium feel */}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Shine Effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 transform -skew-x-12 translate-x-full group-hover:translate-x-0" />

        {/* Content Container */}
        <div className="relative z-20 h-full flex flex-col items-start justify-between p-8 md:p-10">
          {/* Top - Premium Badge */}
          <div className="flex items-center gap-3 backdrop-blur-md bg-black/20 px-4 py-3 rounded-full border border-white/20 hover:border-white/40 transition-all duration-300 shadow-xl">
            <Sparkles className="w-5 h-5 text-yellow-300 fill-yellow-300 animate-pulse" />
            <span className="text-xs md:text-sm font-black text-white uppercase tracking-widest">
              Recommandé Pour Toi
            </span>
          </div>

          {/* Bottom - Info Section */}
          <div className="space-y-4 w-full transform group-hover:-translate-y-3 transition-transform duration-300">
            {/* Title */}
            <h3 className="text-3xl md:text-4xl lg:text-5xl font-black text-white font-bangers tracking-wider line-clamp-2 group-hover:line-clamp-3 transition-all duration-300 drop-shadow-lg">
              {selectedAnime.title}
            </h3>

            {/* Description - Shows on Hover */}
            {selectedAnime.description && (
              <p className="text-sm md:text-base text-gray-100 line-clamp-2 max-w-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 leading-relaxed font-medium drop-shadow-md">
                {selectedAnime.description.substring(0, 180)}...
              </p>
            )}

            {/* Info Row */}
            <div className="flex items-center gap-3 md:gap-5 flex-wrap">
              {/* Score Badge */}
              {animeScore && (
                <div className="flex items-center gap-2 bg-black/50 backdrop-blur-md px-4 py-2 rounded-xl border border-yellow-400/40 shadow-lg hover:border-yellow-400/70 transition-all duration-300">
                  <Star className="w-5 h-5 fill-yellow-300 text-yellow-300" />
                  <span className="text-yellow-300 font-black text-sm md:text-base">{animeScore}</span>
                </div>
              )}

              {/* Genres - Shows on Hover */}
              {selectedAnime.genres && selectedAnime.genres.length > 0 && (
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  {selectedAnime.genres.slice(0, 2).map((genre) => (
                    <span
                      key={genre}
                      className="px-4 py-2 text-xs md:text-sm font-bold bg-primary/30 text-primary rounded-lg border border-primary/50 backdrop-blur-sm shadow-lg hover:bg-primary/40 transition-colors duration-300"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Premium CTA Button */}
            <div className="pt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="inline-flex items-center gap-3 px-8 md:px-10 py-4 md:py-5 bg-gradient-to-r from-primary via-primary to-orange-500 text-primary-foreground rounded-xl font-black text-sm md:text-base hover:shadow-2xl hover:scale-110 transition-all transform duration-300 active:scale-95 shadow-xl border border-primary/70 uppercase tracking-wider">
                <Play className="w-6 h-6 fill-current animate-pulse" />
                <span>Regarder Maintenant</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { createPortal } from "react-dom"
import { ChevronLeft, ChevronRight, Play, Info, X, Star, Calendar, Clock, Check, Plus, Volume2, VolumeX } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTrendingAnime } from "@/hooks/use-combined-anime"
import { useWatchlistOptional } from "@/hooks/use-watchlist"
import { useI18n } from "@/hooks/use-i18n"
import { searchAnimeBasicInfo, type TransformedAnime } from "@/lib/anilist"
import Link from "next/link"
import { BetterCrLogo } from "@/components/bettercr-logo"

const YOUTUBE_EMBED_ORIGIN = "https://www.youtube-nocookie.com"
const TRAILER_VOLUME_STORAGE_KEY = "bcr_trailer_volume"
const MAIN_TRAILER_QUALITY = "medium"
const AMBIENT_TRAILER_QUALITY = "tiny"

type HeroPalette = {
  base: string
  left: string
  right: string
  top: string
  bottom: string
}

function extractYoutubeIdFromUrl(url: string) {
  try {
    const parsedUrl = new URL(url)
    const hostname = parsedUrl.hostname.toLowerCase()

    if (hostname.includes("youtu.be")) {
      return parsedUrl.pathname.replace(/^\//, "") || null
    }

    if (hostname.includes("youtube.com")) {
      if (parsedUrl.pathname === "/watch") {
        return parsedUrl.searchParams.get("v")
      }

      const parts = parsedUrl.pathname.split("/").filter(Boolean)
      if (parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "live") {
        return parts[1] || null
      }
    }
  } catch {
    return null
  }

  return null
}

function getYoutubeVideoId(
  anime: {
    trailer?: { id: string; site: string } | null
    externalLinks?: Array<{ site: string; url: string }>
  } | null,
) {
  if (!anime) return null

  if (anime.trailer?.id) {
    const site = anime.trailer.site?.toLowerCase() || ""
    if (site.includes("youtube")) {
      return anime.trailer.id
    }
  }

  const youtubeLink = anime.externalLinks?.find((link) => {
    const site = link.site?.toLowerCase() || ""
    const url = link.url?.toLowerCase() || ""
    return site.includes("youtube") || url.includes("youtube.com") || url.includes("youtu.be")
  })

  if (!youtubeLink?.url) return null
  return extractYoutubeIdFromUrl(youtubeLink.url)
}

function getYoutubeEmbedUrl(videoId: string, origin?: string | null, options?: { quality?: string }) {
  const params = new URLSearchParams({
    autoplay: "1",
    mute: "1",
    controls: "0",
    rel: "0",
    modestbranding: "1",
    playsinline: "1",
    loop: "0",
    iv_load_policy: "3",
    fs: "0",
    disablekb: "1",
    cc_load_policy: "0",
    enablejsapi: "1",
  })

  if (options?.quality) {
    params.set("vq", options.quality)
  }

  if (origin) {
    params.set("origin", origin)
  }

  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`
}

function averageRegion(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const imageData = context.getImageData(x, y, width, height).data
  let r = 0
  let g = 0
  let b = 0
  let count = 0

  for (let index = 0; index < imageData.length; index += 16) {
    const alpha = imageData[index + 3]
    if (alpha < 48) continue
    r += imageData[index]
    g += imageData[index + 1]
    b += imageData[index + 2]
    count++
  }

  if (count === 0) return "#7a3b16"
  return rgbToHex(Math.round(r / count), Math.round(g / count), Math.round(b / count))
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("")}`
}

async function sampleImagePalette(source: string, fallback: string): Promise<HeroPalette> {
  if (typeof window === "undefined" || !source) {
    return { base: fallback, left: fallback, right: fallback, top: fallback, bottom: fallback }
  }

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = source
    })

    const canvas = document.createElement("canvas")
    canvas.width = 96
    canvas.height = 54
    const context = canvas.getContext("2d", { willReadFrequently: true })
    if (!context) throw new Error("Canvas context unavailable")

    context.drawImage(image, 0, 0, canvas.width, canvas.height)

    return {
      base: averageRegion(context, 0, 0, 96, 54),
      left: averageRegion(context, 0, 8, 30, 38),
      right: averageRegion(context, 66, 8, 30, 38),
      top: averageRegion(context, 12, 0, 72, 18),
      bottom: averageRegion(context, 10, 34, 76, 20),
    }
  } catch {
    return {
      base: fallback,
      left: fallback,
      right: "#315b66",
      top: fallback,
      bottom: fallback,
    }
  }
}

export function HeroCarousel() {
  const AUTO_ADVANCE_DELAY_MS = 80_000
  const { data: trendingAnimes, isLoading } = useTrendingAnime(1, 6) // Fetch a few more items for better rotation
  const watchlistContext = useWatchlistOptional()
  const { t, locale } = useI18n()
  const [enrichedHeroAnimes, setEnrichedHeroAnimes] = useState<typeof trendingAnimes>(undefined)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [showInfoPopup, setShowInfoPopup] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [showVideoPreview, setShowVideoPreview] = useState(false)
  const [isVideoMuted, setIsVideoMuted] = useState(true)
  const [videoVolume, setVideoVolume] = useState(80)
  const [playerOrigin, setPlayerOrigin] = useState<string | null>(null)
  const [isPlayerReady, setIsPlayerReady] = useState(false)
  const [isAmbientPlayerReady, setIsAmbientPlayerReady] = useState(false)
  const [heroPalette, setHeroPalette] = useState<HeroPalette>({
    base: "#7a3b16",
    left: "#7a3b16",
    right: "#315b66",
    top: "#6a7f5a",
    bottom: "#7a3b16",
  })
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const ambientIframeRef = useRef<HTMLIFrameElement | null>(null)
  const sectionRef = useRef<HTMLElement | null>(null)

  const animes = enrichedHeroAnimes || trendingAnimes || []
  const hasAnimes = animes.length > 0

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPlayerOrigin(window.location.origin)
      const storedVolume = Number(window.localStorage.getItem(TRAILER_VOLUME_STORAGE_KEY))
      if (Number.isFinite(storedVolume)) {
        setVideoVolume(Math.min(100, Math.max(0, storedVolume)))
        setIsVideoMuted(storedVolume <= 0)
      }
    }
  }, [])

  useEffect(() => {
    if (trendingAnimes?.length) {
      setEnrichedHeroAnimes(trendingAnimes)
    } else {
      setEnrichedHeroAnimes(undefined)
    }
  }, [trendingAnimes])

  useEffect(() => {
    let cancelled = false

    async function enrichCurrentHeroTrailer() {
      const anime = trendingAnimes?.[currentIndex]
      if (!anime || getYoutubeVideoId(anime)) return

      try {
        const anilist = await searchAnimeBasicInfo(anime.title)
        if (!anilist || cancelled) return

        setEnrichedHeroAnimes((currentList) => {
          const source = currentList?.length ? currentList : trendingAnimes
          if (!source?.length) return currentList

          return source.map((item, index) => {
            if (index !== currentIndex) return item

            return {
              ...item,
              trailer: anilist.trailer,
              externalLinks: [
                ...(("externalLinks" in item && item.externalLinks) || []),
                ...((anilist as TransformedAnime).externalLinks || []),
              ],
              color: item.color || anilist.color,
            }
          })
        })
      } catch {
        // Keep the Crunchyroll data when AniList is unavailable or rate-limited.
      }
    }

    enrichCurrentHeroTrailer()

    return () => {
      cancelled = true
    }
  }, [currentIndex, trendingAnimes])

  const goToSlide = useCallback(
    (index: number) => {
      if (isAnimating || !hasAnimes) return
      setIsAnimating(true)
      setCurrentIndex(index)
      setTimeout(() => setIsAnimating(false), 800)
    },
    [isAnimating, hasAnimes],
  )

  const goToPrevious = useCallback(() => {
    if (!hasAnimes) return
    const newIndex = currentIndex === 0 ? animes.length - 1 : currentIndex - 1
    goToSlide(newIndex)
  }, [currentIndex, goToSlide, hasAnimes, animes.length])

  const goToNext = useCallback(() => {
    if (!hasAnimes) return
    const newIndex = currentIndex === animes.length - 1 ? 0 : currentIndex + 1
    goToSlide(newIndex)
  }, [currentIndex, goToSlide, hasAnimes, animes.length])

  useEffect(() => {
    if (showInfoPopup) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }
    return () => {
      document.body.style.overflow = "unset"
    }
  }, [showInfoPopup])

  useEffect(() => {
    if (isPaused || !hasAnimes || showInfoPopup) return
    const timer = window.setTimeout(goToNext, AUTO_ADVANCE_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [AUTO_ADVANCE_DELAY_MS, goToNext, isPaused, hasAnimes, showInfoPopup])

  const currentAnime = hasAnimes ? animes[currentIndex] : null
  const currentTrailerId = getYoutubeVideoId(currentAnime)

  // Sync bookmark state with watchlist on anime change
  useEffect(() => {
    if (currentAnime && watchlistContext) {
      const crId = 'crunchyrollId' in currentAnime ? currentAnime.crunchyrollId : null
      const inWatchlist = (typeof crId === 'string' && crId)
        ? watchlistContext.isInWatchlist(crId)
        : watchlistContext.isInWatchlistByTitle(currentAnime.title)
      setIsBookmarked(inWatchlist)
    }
  }, [currentAnime, watchlistContext])

  useEffect(() => {
    setShowVideoPreview(false)
    setIsPlayerReady(false)
    setIsAmbientPlayerReady(false)

    if (!currentTrailerId || showInfoPopup) {
      return
    }

    const timer = window.setTimeout(() => {
      setShowVideoPreview(true)
    }, 900)

    return () => window.clearTimeout(timer)
  }, [currentIndex, currentTrailerId, showInfoPopup])

  // Fallback data for loading state
  const fallbackAnime = {
    id: 0,
    title: "Chargement...",
    description: "Découvrez les meilleurs anime en streaming sur Crunchyroll.",
    image: "/placeholder.svg?height=1080&width=1920",
    rating: "14+",
    genres: ["Action", "Fantasy"],
    nextEpisode: { episode: 1 },
    year: 2024,
    score: null,
    episodes: null,
    status: "RELEASING",
  }

  const displayAnime = currentAnime || fallbackAnime
  const releaseYear = "year" in displayAnime && displayAnime.year ? displayAnime.year : new Date().getFullYear()
  const matchPercent = displayAnime.score ? Math.min(99, Math.max(82, Math.round(displayAnime.score * 10))) : 96
  const bannerSource = "bannerImage" in displayAnime && displayAnime.bannerImage ? displayAnime.bannerImage : displayAnime.image
  const episodeCount = displayAnime.episodes || (displayAnime.nextEpisode ? displayAnime.nextEpisode.episode : null)
  const displayRating = displayAnime.rating || "TV-14"
  const heroGlowColor = "color" in displayAnime && displayAnime.color ? displayAnime.color : "#7a3b16"
  const nextEpisodeAiringAt =
    displayAnime.nextEpisode && "airingAt" in displayAnime.nextEpisode
      ? displayAnime.nextEpisode.airingAt
      : null
  const availabilityLabel = nextEpisodeAiringAt
    ? t("common.coming", {
      date: new Intl.DateTimeFormat(locale, { month: "long", day: "numeric" }).format(new Date(nextEpisodeAiringAt * 1000)),
    })
    : t("common.availableNow")
  const previewEmbedUrl = useMemo(
    () => (currentTrailerId ? getYoutubeEmbedUrl(currentTrailerId, playerOrigin, { quality: MAIN_TRAILER_QUALITY }) : null),
    [currentTrailerId, playerOrigin],
  )
  const ambientEmbedUrl = useMemo(
    () => (currentTrailerId ? getYoutubeEmbedUrl(currentTrailerId, playerOrigin, { quality: AMBIENT_TRAILER_QUALITY }) : null),
    [currentTrailerId, playerOrigin],
  )

  useEffect(() => {
    let cancelled = false

    async function updatePalette() {
      const palette = await sampleImagePalette(bannerSource, heroGlowColor)
      if (!cancelled) setHeroPalette(palette)
    }

    updatePalette()
    return () => {
      cancelled = true
    }
  }, [bannerSource, heroGlowColor])

  useEffect(() => {
    if (!showVideoPreview || !isPlayerReady || !iframeRef.current) {
      return
    }

    const playerWindow = iframeRef.current.contentWindow
    if (!playerWindow) return

    const commands = isVideoMuted
      ? [
          { func: "mute", args: [] as unknown[] },
          { func: "setPlaybackQuality", args: [MAIN_TRAILER_QUALITY] },
        ]
      : [
          { func: "unMute", args: [] as unknown[] },
          { func: "setPlaybackQuality", args: [MAIN_TRAILER_QUALITY] },
          { func: "setVolume", args: [videoVolume] },
          { func: "playVideo", args: [] as unknown[] },
        ]

    commands.forEach(({ func, args }) => {
      playerWindow.postMessage(
        JSON.stringify({ event: "command", func, args }),
        YOUTUBE_EMBED_ORIGIN,
      )
    })
  }, [isPlayerReady, isVideoMuted, showVideoPreview, videoVolume])

  useEffect(() => {
    if (typeof window === "undefined") return
    window.localStorage.setItem(TRAILER_VOLUME_STORAGE_KEY, String(videoVolume))
  }, [videoVolume])

  useEffect(() => {
    if (!showVideoPreview || !isAmbientPlayerReady || !ambientIframeRef.current) {
      return
    }

    const playerWindow = ambientIframeRef.current.contentWindow
    if (!playerWindow) return

    ;[
      { func: "mute", args: [] as unknown[] },
      { func: "setPlaybackQuality", args: [AMBIENT_TRAILER_QUALITY] },
      { func: "playVideo", args: [] as unknown[] },
    ].forEach(({ func, args }) => {
      playerWindow.postMessage(
        JSON.stringify({ event: "command", func, args }),
        YOUTUBE_EMBED_ORIGIN,
      )
    })

    const qualityRetryTimer = window.setTimeout(() => {
      playerWindow.postMessage(
        JSON.stringify({
          event: "command",
          func: "setPlaybackQuality",
          args: [AMBIENT_TRAILER_QUALITY],
        }),
        YOUTUBE_EMBED_ORIGIN,
      )
    }, 1200)

    return () => window.clearTimeout(qualityRetryTimer)
  }, [isAmbientPlayerReady, showVideoPreview])

  useEffect(() => {
    if (!showVideoPreview || typeof window === "undefined") {
      return
    }

    const section = sectionRef.current
    if (!section) return

    let isHeroVisible = true
    const postPlayerCommand = (
      ref: { current: HTMLIFrameElement | null },
      func: string,
      args: unknown[] = [],
    ) => {
      ref.current?.contentWindow?.postMessage(
        JSON.stringify({ event: "command", func, args }),
        YOUTUBE_EMBED_ORIGIN,
      )
    }

    const syncPlayback = () => {
      const shouldPlay = document.visibilityState === "visible" && isHeroVisible
      const command = shouldPlay ? "playVideo" : "pauseVideo"

      if (isPlayerReady) postPlayerCommand(iframeRef, command)
      if (isAmbientPlayerReady) postPlayerCommand(ambientIframeRef, command)
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        isHeroVisible = entry.isIntersecting && entry.intersectionRatio > 0.12
        syncPlayback()
      },
      { threshold: [0, 0.12] },
    )

    observer.observe(section)
    document.addEventListener("visibilitychange", syncPlayback)
    syncPlayback()

    return () => {
      observer.disconnect()
      document.removeEventListener("visibilitychange", syncPlayback)
    }
  }, [isAmbientPlayerReady, isPlayerReady, showVideoPreview])

  useEffect(() => {
    if (!showVideoPreview || !currentTrailerId) {
      return
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== YOUTUBE_EMBED_ORIGIN) {
        return
      }

      if (event.source !== iframeRef.current?.contentWindow) {
        return
      }

      try {
        const message = typeof event.data === "string" ? JSON.parse(event.data) : event.data
        const playerState =
          message?.info?.playerState ??
          (message?.event === "onStateChange" ? message.info : undefined)

        if (playerState === 0) {
          goToNext()
        }
      } catch {
        // Ignore unrelated postMessage payloads.
      }
    }

    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [currentTrailerId, goToNext, showVideoPreview])

  return (
    <section
      ref={sectionRef}
      className="relative mx-auto mb-0 mt-7 w-[calc(100%-3rem)] overflow-visible rounded-[18px] bg-black md:w-[calc(100%-6rem)]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      style={{
        height: "clamp(360px, 38vw, 560px)",
        boxShadow: `0 -70px 130px -42px ${heroPalette.top}b8, 0 126px 220px -86px ${heroPalette.bottom}b0, -70px 30px 130px -76px ${heroPalette.left}9c, 70px 26px 130px -76px ${heroPalette.right}9c, 0 24px 70px rgba(0,0,0,0.72)`,
        ["--hero-glow-left" as string]: heroPalette.left,
        ["--hero-glow-right" as string]: heroPalette.right,
        ["--hero-glow-top" as string]: heroPalette.top,
        ["--hero-glow-bottom" as string]: heroPalette.bottom,
      }}
    >
      <div
        className="pointer-events-none absolute -inset-x-20 -top-24 h-44 rounded-full opacity-75 blur-3xl transition-colors duration-700"
        style={{
          background: `radial-gradient(ellipse at 38% 50%, ${heroPalette.top}7a 0%, ${heroPalette.left}32 42%, transparent 74%), radial-gradient(ellipse at 70% 42%, ${heroPalette.right}6a 0%, transparent 68%)`,
        }}
      />
      <div
        className="pointer-events-none absolute -inset-x-24 -bottom-72 h-[30rem] rounded-full opacity-80 blur-3xl transition-colors duration-700"
        style={{
          background: `radial-gradient(ellipse at 50% 4%, ${heroPalette.bottom}76 0%, ${heroPalette.left}38 34%, ${heroPalette.right}30 58%, transparent 82%)`,
        }}
      />
      {showVideoPreview && ambientEmbedUrl ? (
        <div className="hero-cinematic-light" aria-hidden="true">
          <iframe
            key={`${currentTrailerId}-ambient`}
            ref={ambientIframeRef}
            src={ambientEmbedUrl}
            title=""
            className="hero-cinematic-light__video"
            allow="autoplay; encrypted-media; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
            tabIndex={-1}
            onLoad={() => setIsAmbientPlayerReady(true)}
          />
        </div>
      ) : null}
      <div className="absolute inset-0 overflow-hidden rounded-[16px]">
      {hasAnimes ? (
        animes.map((anime, index) => (
          <div
            key={anime.id}
            className={cn(
              "absolute inset-0 transition-all duration-[1200ms] ease-in-out",
              index === currentIndex ? "opacity-100 scale-[1.03] z-10" : "opacity-0 scale-100 z-0",
            )}
          >
            {index === currentIndex && showVideoPreview && previewEmbedUrl ? (
              <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none bg-black">
                <iframe
                  key={currentTrailerId}
                  ref={iframeRef}
                  src={previewEmbedUrl}
                  title={`${anime.title} trailer`}
                  className="absolute left-1/2 top-1/2 h-[112%] w-[112%] min-h-full min-w-full -translate-x-1/2 -translate-y-1/2 scale-[1.14]"
                  allow="autoplay; encrypted-media; picture-in-picture"
                  referrerPolicy="strict-origin-when-cross-origin"
                  tabIndex={-1}
                  onLoad={() => setIsPlayerReady(true)}
                />
              </div>
            ) : null}
            <img
              src={anime.bannerImage || anime.image}
              alt={anime.title}
              className={cn(
                "absolute inset-0 w-full h-full object-cover transition-opacity duration-500",
                index === currentIndex && showVideoPreview && previewEmbedUrl ? "opacity-0" : "opacity-100",
              )}
              style={{ objectPosition: "center 22%" }}
            />
            <div className="absolute inset-0 bg-black/18 z-10" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/72 via-black/32 to-transparent z-20" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/86 via-black/14 to-transparent z-20" />
          </div>
        ))
      ) : (
        <div className="absolute inset-0 z-0">
          <div className="w-full h-full bg-secondary animate-pulse" />
        </div>
      )}

      <div className="absolute inset-0 z-30 flex items-end px-5 pb-6 md:px-8 md:pb-8">
        <div className="w-full max-w-[620px] space-y-3">
          <div
            className={cn(
              "hidden items-center gap-3 text-sm font-semibold uppercase tracking-[0.35em] text-white/70",
              "transition-all duration-700 ease-out transform",
              isAnimating ? "opacity-0 translate-y-8" : "opacity-100 translate-y-0",
            )}
          >
            <BetterCrLogo className="w-[124px] md:w-[138px]" compact />
            <span className="w-10 h-px bg-white/25" />
            <span>Série à la une</span>
          </div>

          <h1
            className={cn(
              "max-w-[14ch] font-black text-white leading-[0.95] tracking-normal",
              "drop-shadow-[0_10px_24px_rgba(0,0,0,0.58)]",
              "transition-all duration-700 ease-out transform",
                  displayAnime.title.length > 30 ? "text-2xl md:text-3xl lg:text-[2.75rem]" :
                    displayAnime.title.length > 20 ? "text-3xl md:text-4xl lg:text-[3.35rem]" :
                      "text-4xl md:text-5xl lg:text-[4rem]",
              isAnimating ? "opacity-0 translate-y-12" : "opacity-100 translate-y-0",
            )}
          >
            {displayAnime.title}
          </h1>

          <div
            className={cn(
              "flex flex-wrap items-center gap-x-2 gap-y-2 text-sm md:text-base text-white font-bold",
              "transition-all duration-700 ease-out delay-100 transform",
              isAnimating ? "opacity-0 translate-y-8" : "opacity-100 translate-y-0",
            )}
          >
            <span>{t("common.show")}</span>
            <span className="text-white/55">•</span>
            <span>{displayAnime.genres[0] || t("common.anime")}</span>
            <span className="text-white/55">•</span>
            <span className="hidden font-semibold text-[#46d369]">{matchPercent}% de pertinence</span>
            <span>{releaseYear}</span>
            {episodeCount && (
              <>
                <span className="text-white/55">•</span>
                <span>{episodeCount} épisodes</span>
              </>
            )}
            <span className="text-white/55">•</span>
            <span>{displayRating}</span>
            <div className="hidden w-1 h-1 rounded-full bg-white/35" />
            <span className="hidden uppercase tracking-[0.18em] text-white/72">
              {displayAnime.genres.slice(0, 3).join(" • ")}
            </span>
          </div>

          <p
            className={cn(
              "hidden text-base md:text-xl text-white/76 leading-relaxed max-w-2xl line-clamp-4",
              "drop-shadow-md",
              "transition-all duration-700 ease-out delay-200 transform",
              isAnimating ? "opacity-0 translate-y-8" : "opacity-100 translate-y-0",
            )}
            style={{ display: "none" }}
          >
            {displayAnime.description || "Découvrez cet anime passionnant sur Crunchyroll."}
          </p>

          <div
            className={cn(
              "flex flex-wrap items-center gap-3 pt-1",
              "transition-all duration-700 ease-out delay-300 transform",
              isAnimating ? "opacity-0 translate-y-8" : "opacity-100 translate-y-0",
            )}
          >
            <Link
              href={`/anime/${displayAnime.id}`}
              onClick={() => window.scrollTo({ top: 0, behavior: "auto" })}
              className="hero-play-button group inline-flex items-center gap-3 overflow-hidden rounded-md bg-white px-8 py-3.5 text-lg font-bold text-black transition-all duration-200 hover:bg-white/85 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Play className="w-6 h-6 fill-current transition-transform duration-200 group-hover:scale-110" />
              <span>{t("hero.play")}</span>
            </Link>

            <button
              onClick={async () => {
                if (!currentAnime || !watchlistContext) return
                const crId = 'crunchyrollId' in currentAnime ? currentAnime.crunchyrollId : null
                const newState = !isBookmarked
                setIsBookmarked(newState)
                try {
                  if (typeof crId === 'string' && crId) {
                    if (newState) {
                      await watchlistContext.addToWatchlist(crId)
                    } else {
                      await watchlistContext.removeFromWatchlist(crId)
                    }
                  }
                } catch (error) {
                  console.error('Failed to update watchlist:', error)
                  setIsBookmarked(!newState)
                }
              }}
              className={cn(
                "hidden items-center gap-3 px-6 py-3.5 rounded-md border border-white/18 transition-all duration-200 hover:bg-white/12 active:scale-[0.98]",
                isBookmarked
                  ? "bg-white/14 text-white border-white/22"
                  : "bg-white/8 text-white hover:bg-white/14"
              )}
              title={isBookmarked ? "Retirer de la watchlist" : "Ajouter à la watchlist"}
            >
              {isBookmarked ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              <span className="font-semibold">Ma liste</span>
            </button>

            <button
              onClick={() => setShowInfoPopup(true)}
              className="inline-flex items-center gap-3 px-6 py-3.5 rounded-md bg-[#6d6d6eb3] hover:bg-[#808081cc] text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] font-semibold"
            >
              <Info className="w-5 h-5" />
              <span>{t("hero.moreInfo")}</span>
            </button>
          </div>
        </div>
      </div>
      </div>

      <div className="absolute bottom-6 right-6 z-40 hidden items-center gap-2 rounded-md bg-black/32 px-3 py-2 text-sm font-bold text-white shadow-lg backdrop-blur-sm md:flex">
        <Calendar className="h-4 w-4 text-[#e50914]" />
        <span>{availabilityLabel}</span>
      </div>

      {hasAnimes && (
        <div className="hidden">
          <button
            onClick={goToPrevious}
            className="h-12 w-12 flex items-center justify-center rounded-full bg-black/35 hover:bg-black/55 text-white border border-white/12 transition-all duration-200"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex gap-3">
            {animes.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  index === currentIndex
                    ? "w-10 bg-primary"
                    : "w-3 bg-white/28 hover:bg-white/56"
                )}
              />
            ))}
          </div>
          <button
            onClick={goToNext}
            className="h-12 w-12 flex items-center justify-center rounded-full bg-black/35 hover:bg-black/55 text-white border border-white/12 transition-all duration-200"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      )}

      <div className="absolute right-8 bottom-24 z-50 hidden lg:flex items-center gap-3">
        {currentTrailerId ? (
          <div className="hero-volume-control relative flex items-center justify-end">
            <div className="hero-volume-panel absolute right-12 flex h-11 items-center rounded-full border border-white/16 bg-black/54 px-4 shadow-[0_16px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl">
              <input
                type="range"
                min="0"
                max="100"
                value={videoVolume}
                onChange={(event) => {
                  const nextVolume = Number(event.target.value)
                  setVideoVolume(nextVolume)
                  setIsVideoMuted(nextVolume <= 0)
                }}
                className="bcr-volume-slider w-full"
                aria-label={t("hero.volume")}
              />
            </div>
            <button
              onClick={() => setIsVideoMuted((value) => !value)}
              className="h-11 w-11 rounded-full border border-white/35 bg-black/24 text-white flex items-center justify-center transition-colors duration-200 hover:bg-black/42"
              aria-label={isVideoMuted ? t("hero.enableSound") : t("hero.disableSound")}
              title={isVideoMuted ? t("hero.enableSound") : t("hero.disableSound")}
            >
              {isVideoMuted || videoVolume <= 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
          </div>
        ) : null}
        <div className="hidden">
          {displayAnime.rating}
        </div>
      </div>

      {showInfoPopup && currentAnime && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-xl transition-all duration-300 animate-in fade-in"
          onClick={() => setShowInfoPopup(false)}
        >
          <div
            className="relative netflix-panel max-w-4xl w-full mx-6 shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[85vh] animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full md:w-2/5 h-64 md:h-auto overflow-hidden">
              <img
                src={bannerSource}
                alt={currentAnime.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] via-transparent to-transparent md:bg-gradient-to-r" />
            </div>

            <div className="flex-1 p-8 md:p-12 overflow-y-auto custom-scrollbar bg-gradient-to-br from-[#111111] to-[#181818]">
              <button
                onClick={() => setShowInfoPopup(false)}
                className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-all z-10"
              >
                <X className="w-6 h-6" />
              </button>

              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 leading-tight">
                {currentAnime.title}
              </h2>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="p-4 rounded-md bg-white/5 border border-white/5">
                  <div className="flex items-center gap-2 text-primary mb-1">
                    <Star className="w-5 h-5 fill-current" />
                    <span className="font-bold text-lg">{currentAnime.score ? currentAnime.score.toFixed(1) : "N/A"}</span>
                  </div>
                  <span className="text-xs text-zinc-400 uppercase tracking-wider">Score moyen</span>
                </div>
                <div className="p-4 rounded-md bg-white/5 border border-white/5">
                  <div className="flex items-center gap-2 text-white mb-1">
                    <Calendar className="w-5 h-5" />
                    <span className="font-bold text-lg">{currentAnime.year || "N/A"}</span>
                  </div>
                  <span className="text-xs text-zinc-400 uppercase tracking-wider">Année</span>
                </div>
                <div className="p-4 rounded-md bg-white/5 border border-white/5">
                  <div className="flex items-center gap-2 text-white mb-1">
                    <Clock className="w-5 h-5" />
                    <span className="font-bold text-lg">{currentAnime.episodes || "?"}</span>
                  </div>
                  <span className="text-xs text-zinc-400 uppercase tracking-wider">Épisodes</span>
                </div>
                <div className="p-4 rounded-md bg-white/5 border border-white/5">
                  <div className="text-white font-bold text-lg mb-1">{currentAnime.rating}</div>
                  <span className="text-xs text-zinc-400 uppercase tracking-wider">Classification</span>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <h3 className="text-white font-semibold">Genres</h3>
                <div className="flex flex-wrap gap-2">
                  {currentAnime.genres.map((genre) => (
                    <span key={genre} className="px-4 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-full text-sm text-zinc-300 transition-colors cursor-default">
                      {genre}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <h3 className="text-white font-semibold">Synopsis</h3>
                <p className="text-zinc-400 leading-relaxed text-sm md:text-base">
                  {currentAnime.description || "Aucune description disponible pour cet anime."}
                </p>
              </div>

              <Link
                href={`/anime/${currentAnime.id}`}
                onClick={() => {
                  setShowInfoPopup(false)
                  window.scrollTo({ top: 0, behavior: "auto" })
                }}
                className="flex items-center justify-center gap-2 w-full py-4 bg-primary text-primary-foreground rounded-md font-bold text-lg hover:bg-primary/90 transition-all"
              >
                <Play className="w-5 h-5 fill-current" />
                Regarder maintenant
              </Link>

            </div>
          </div>
        </div>,
        document.body
      )}
    </section>
  )
}

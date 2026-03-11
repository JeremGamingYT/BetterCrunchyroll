"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { Bookmark, Clock3, Loader2, Play, Plus, Star, ThumbsUp, Volume2, VolumeX, X } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useAnimeDetails } from "@/hooks/use-combined-anime"
import { useWatchlistOptional } from "@/hooks/use-watchlist"

// ── YouTube helpers ────────────────────────────────────────────────────────────
function extractYoutubeId(url: string): string | null {
  try {
    const u = new URL(url)
    const h = u.hostname.toLowerCase()
    if (h.includes("youtu.be")) return u.pathname.replace(/^\//, "") || null
    if (h.includes("youtube.com")) {
      if (u.pathname === "/watch") return u.searchParams.get("v")
      const parts = u.pathname.split("/").filter(Boolean)
      if (["embed", "shorts", "live"].includes(parts[0])) return parts[1] || null
    }
  } catch { /* ignore */ }
  return null
}

function getTrailerVideoId(
  trailer?: { id: string; site: string } | null,
  externalLinks?: Array<{ site: string; url: string }>,
): string | null {
  if (trailer?.id) {
    const site = trailer.site?.toLowerCase() || ""
    if (site.includes("youtube")) return trailer.id
  }
  const link = externalLinks?.find(l => {
    const s = l.site?.toLowerCase() || ""
    const u = l.url?.toLowerCase() || ""
    return s.includes("youtube") || u.includes("youtube.com") || u.includes("youtu.be")
  })
  if (!link?.url) return null
  return extractYoutubeId(link.url)
}

function buildTrailerEmbedUrl(videoId: string, origin?: string | null): string {
  const p = new URLSearchParams({
    autoplay: "1",
    mute: "1",
    controls: "0",
    rel: "0",
    modestbranding: "1",
    playsinline: "1",
    loop: "0",          // play once only
    iv_load_policy: "3",
    fs: "0",
    disablekb: "1",
    cc_load_policy: "0",
    enablejsapi: "1",   // enable postMessage events
  })
  if (origin) p.set("origin", origin)
  return `https://www.youtube-nocookie.com/embed/${videoId}?${p.toString()}`
}
// ──────────────────────────────────────────────────────────────────────────────

interface PreviewAnime {
  id: number | string
  title: string
  image: string
  bannerImage?: string | null
  description?: string | null
  rating?: string
  genres?: string[]
  score?: number | null
  color?: string | null
  year?: number | null
  episodes?: number | null
  crunchyrollId?: string | null
}

interface AnimePreviewDialogProps {
  anime: PreviewAnime
  open: boolean
  onOpenChange: (open: boolean) => void
  animeUrl: string
}

function formatAvailability(dateString: string | null) {
  if (!dateString) return null

  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return null

  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
  }).format(date)
}

function formatDuration(minutes: number | null | undefined) {
  if (!minutes || minutes <= 0) return null
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (!hours) return `${remainingMinutes} min`
  if (!remainingMinutes) return `${hours} h`
  return `${hours} h ${remainingMinutes} min`
}

// Strip anime title prefix, language tags, and normalise to "Saison X"
function cleanSeasonTitle(rawTitle: string, animeTitle: string, seasonNumber: number): string {
  let t = rawTitle.trim()
  // Remove the anime series title prefix (case-insensitive)
  const escaped = animeTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  t = t.replace(new RegExp(`^${escaped}\\s*[-:–—]?\\s*`, 'i'), '').trim()
  // Remove language/dub tags like (VF), (VOSTFR), (Dubbed)…
  t = t.replace(/\s*\(\s*(?:VF|VOSTFR|VOSTA?|VO|Dubbed|Subbed|Sub|Dub)\s*\)/gi, '').trim()
  // Strip leading/trailing separators left over
  t = t.replace(/^[-:–—\s]+|[-:–—\s]+$/g, '').trim()
  // Normalise English season patterns → "Saison X"
  t = t.replace(/\b(\d+)(?:st|nd|rd|th)\s+[Ss]eason\b/i, 'Saison $1')
  t = t.replace(/\b[Ss]eason\s+(\d+)\b/i, 'Saison $1')
  // No meaningful text left → fall back
  if (!t || t.length < 2) return `Saison ${seasonNumber}`
  if (/^\d+$/.test(t)) return `Saison ${t}`
  return t
}

// Check localStorage history caches to see if an episode ID was watched
function hasWatchedEpisodeLocally(episodeId: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key?.startsWith('crunchyroll_')) continue
      if (!key.includes('history')) continue
      const raw = localStorage.getItem(key)
      if (!raw) continue
      const entry = JSON.parse(raw)
      const items: any[] = entry?.data?.data || entry?.data || []
      if (items.some((item: any) => {
        const id = item?.panel?.id || item?.episodeId || item?.id
        return id === episodeId
      })) return true
    }
  } catch { /* ignore parse errors */ }
  return false
}

export function AnimePreviewDialog({ anime, open, onOpenChange, animeUrl }: AnimePreviewDialogProps) {
  const watchlistContext = useWatchlistOptional()
  const animeId = useMemo(() => {
    const parsed = typeof anime.id === "number" ? anime.id : Number(anime.id)
    return Number.isFinite(parsed) ? parsed : null
  }, [anime.id])
  const { anime: details, isLoading } = useAnimeDetails(open ? animeId : null, open ? anime.crunchyrollId : null)

  const displayAnime = details || anime
  const genres = displayAnime.genres || []
  const poster = displayAnime.image || "/placeholder.svg"
  const banner = displayAnime.bannerImage || poster
  const allEpisodes = details?.crunchyrollEpisodes || []
  const seasons = useMemo(() => {
    const eps = details?.crunchyrollEpisodes || []
    const animeTitle = displayAnime.title || ''
    const map = new Map<number, string>()
    eps.forEach(ep => {
      const num = ep.seasonNumber ?? 1
      if (!map.has(num)) {
        const cleaned = cleanSeasonTitle(ep.seasonTitle || '', animeTitle, num)
        map.set(num, cleaned)
      }
    })
    return Array.from(map.entries())
      .map(([number, title]) => ({ number, title }))
      .sort((a, b) => a.number - b.number)
  }, [details?.crunchyrollEpisodes, displayAnime.title])

  // Dynamic tagline: depends on how many eps are released vs still coming
  const dynamicTagline = useMemo(() => {
    if (allEpisodes.length === 0) return null
    const now = Date.now()
    const releasedEps = allEpisodes.filter(ep => !ep.availableFrom || new Date(ep.availableFrom).getTime() <= now)
    const futureEps = allEpisodes.filter(ep => ep.availableFrom && new Date(ep.availableFrom).getTime() > now)
    const isStillAiring = futureEps.length > 0 || (details?.status !== 'FINISHED' && !!details?.nextEpisode)
    if (!isStillAiring) {
      const total = releasedEps.length || allEpisodes.length
      return `Visionnez les ${total} épisodes de la série maintenant`
    }
    // Series still airing — has user seen the latest available episode?
    const lastEp = releasedEps[releasedEps.length - 1]
    const watched = lastEp ? hasWatchedEpisodeLocally(lastEp.id) : false
    if (!watched) return 'Nouvel épisode disponible'
    // User is up to date — show when the next one drops
    const nextAvailable = futureEps[0]?.availableFrom
      ? new Date(futureEps[0].availableFrom)
      : details?.nextEpisode?.airingAt
        ? new Date(details.nextEpisode.airingAt * 1000)
        : null
    if (nextAvailable) {
      const day = new Intl.DateTimeFormat('fr-FR', { weekday: 'long' }).format(nextAvailable)
      return `Nouvel épisode à venir ${day}`
    }
    return 'Prochain épisode bientôt disponible'
  }, [allEpisodes, details])
  const primaryHref = details?.crunchyrollEpisodes?.[0]?.id ? `/watch/${details.crunchyrollEpisodes[0].id}` : animeUrl
  const primaryLabel = details?.crunchyrollEpisodes?.[0]?.id ? "Lecture" : "Voir la fiche"
  const yearLabel = displayAnime.year ? String(displayAnime.year) : null
  const ratingLabel = displayAnime.rating || null
  const episodeCountLabel = displayAnime.episodes ? `${displayAnime.episodes} épisodes` : null
  const scoreLabel = displayAnime.score !== null && displayAnime.score !== undefined ? displayAnime.score.toFixed(1) : null
  const metaLine = [yearLabel, ratingLabel, episodeCountLabel].filter(Boolean)
  const infoEntries = [
    { label: "Statut", value: details?.status || null },
    { label: "Format", value: details?.format || null },
    { label: "Saison", value: details?.season || null },
    { label: "Studio", value: details?.studio || null },
    { label: "Genres", value: genres.length > 0 ? genres.join(", ") : null },
  ].filter((entry) => entry.value)

  const initialWatchlistState = watchlistContext
    ? (anime.crunchyrollId && watchlistContext.isInWatchlist(anime.crunchyrollId)) || watchlistContext.isInWatchlistByTitle(anime.title)
    : false

  const [isBookmarked, setIsBookmarked] = useState(initialWatchlistState)
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null)
  const activeSeason = selectedSeason ?? seasons[0]?.number ?? null
  const visibleEpisodes = activeSeason !== null
    ? allEpisodes.filter(ep => (ep.seasonNumber ?? 1) === activeSeason)
    : allEpisodes

  // ── Trailer state ──────────────────────────────────────────────────────────
  // 'idle' → 3 s timer → 'showing' (iframe fades in) → video ends → 'fading' → 'idle'
  const [trailerState, setTrailerState] = useState<'idle' | 'showing' | 'fading'>('idle')
  const [isMuted, setIsMuted] = useState(true)
  const [playerOrigin, setPlayerOrigin] = useState<string | null>(null)
  const trailerIframeRef = useRef<HTMLIFrameElement | null>(null)
  const trailerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const trailerVideoId = useMemo(
    () => getTrailerVideoId(details?.trailer, details?.externalLinks),
    [details?.trailer, details?.externalLinks],
  )
  const trailerEmbedUrl = useMemo(
    () => (trailerVideoId ? buildTrailerEmbedUrl(trailerVideoId, playerOrigin) : null),
    [trailerVideoId, playerOrigin],
  )

  useEffect(() => {
    if (typeof window !== "undefined") setPlayerOrigin(window.location.origin)
  }, [])

  // Start 3 s delay when the dialog opens and we have a trailer
  useEffect(() => {
    if (trailerTimerRef.current) clearTimeout(trailerTimerRef.current)
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current)
    setTrailerState('idle')

    if (!open || !trailerVideoId) return

    trailerTimerRef.current = setTimeout(() => {
      setTrailerState('showing')
    }, 3000)

    return () => {
      if (trailerTimerRef.current) clearTimeout(trailerTimerRef.current)
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current)
    }
  }, [open, trailerVideoId])

  // Listen for YouTube "video ended" (playerState === 0) via postMessage
  useEffect(() => {
    if (trailerState !== 'showing') return

    function handleMessage(e: MessageEvent) {
      try {
        const msg = typeof e.data === "string" ? JSON.parse(e.data) : e.data
        const state =
          msg?.info?.playerState ??           // "infoDelivery" format
          (msg?.event === "onStateChange" ? msg.info : undefined)  // legacy format
        if (state === 0) {
          // Video ended — fade back to image
          setTrailerState('fading')
          fadeTimerRef.current = setTimeout(() => setTrailerState('idle'), 700)
        }
      } catch { /* ignore parse errors */ }
    }

    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [trailerState])

  // Mute / unmute via IFrame API
  useEffect(() => {
    if (trailerState !== 'showing' || !trailerIframeRef.current) return
    const target = playerOrigin || "https://www.youtube-nocookie.com"
    const cmd = isMuted ? "mute" : "unMute"
    trailerIframeRef.current.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func: cmd, args: [] }),
      target,
    )
  }, [isMuted, trailerState, playerOrigin])
  // ──────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    setIsBookmarked(initialWatchlistState)
  }, [initialWatchlistState])

  useEffect(() => {
    if (!open) setSelectedSeason(null)
  }, [open])

  useEffect(() => {
    if (!open || typeof document === "undefined") {
      return
    }

    const previousHtmlOverflow = document.documentElement.style.overflow
    const previousBodyOverflow = document.body.style.overflow

    document.documentElement.style.overflow = "hidden"
    document.body.style.overflow = "hidden"

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow
      document.body.style.overflow = previousBodyOverflow
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-full max-w-[95vw] sm:max-w-[90vw] md:max-w-[850px] lg:max-w-[960px] xl:max-w-[1050px] h-auto max-h-[96vh] md:max-h-[90vh] border-none bg-transparent p-0 shadow-none flex flex-col sm:overflow-visible overflow-hidden"
      >
        <DialogTitle className="sr-only">Aperçu de {anime.title}</DialogTitle>

        <div className="flex flex-col w-full h-full min-h-0 bg-[#181818] overflow-y-auto overflow-x-hidden relative rounded-xl shadow-[0_40px_120px_rgba(0,0,0,0.85)] scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {/* Close button - sticky/absolute inside scroll view */}
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 z-[60] flex items-center justify-center w-10 h-10 rounded-full bg-[#181818] text-white transition-all border-2 border-transparent hover:border-white/40 focus:outline-none"
            aria-label="Fermer l'aperçu"
            style={{ backgroundColor: '#181818', borderColor: 'rgba(255,255,255,0.4)', borderWidth: '1px' }}
          >
            <X className="w-6 h-6" />
          </button>

          {/* Hero Section */}
          <div className="relative w-full aspect-[4/3] sm:aspect-video lg:aspect-[21/9] bg-[#181818] shrink-0">
            {/* Static banner image — fades out when trailer is playing */}
            <img
              src={banner}
              alt={displayAnime.title}
              className={cn(
                "w-full h-full object-cover transition-opacity duration-700",
                trailerState === 'showing' ? "opacity-0" : "opacity-100",
              )}
            />

            {/* YouTube trailer overlay — only rendered while not idle */}
            {trailerState !== 'idle' && trailerEmbedUrl ? (
              <div
                className={cn(
                  "absolute inset-0 z-[1] overflow-hidden pointer-events-none bg-black transition-opacity duration-700",
                  trailerState === 'showing' ? "opacity-100" : "opacity-0",
                )}
              >
                <iframe
                  ref={trailerIframeRef}
                  key={trailerVideoId}
                  src={trailerEmbedUrl}
                  title={`${displayAnime.title} trailer`}
                  className="absolute left-1/2 top-1/2 h-[112%] w-[112%] min-h-full min-w-full -translate-x-1/2 -translate-y-1/2 scale-[1.14]"
                  allow="autoplay; encrypted-media; picture-in-picture"
                  referrerPolicy="strict-origin-when-cross-origin"
                  tabIndex={-1}
                />
              </div>
            ) : null}

            <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-[#181818]/20 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-t from-[#181818] via-[#181818]/60 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-[25%] bg-gradient-to-t from-[#181818] to-transparent" />

            {/* Hero Content */}
            <div className="absolute bottom-0 left-0 w-full px-8 sm:px-12 flex flex-col items-start z-10 pb-4">
              <h2 className="max-w-[75%] text-4xl sm:text-5xl lg:text-[4rem] font-black text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] mb-6 leading-[1.1] tracking-tight">
                {displayAnime.title}
              </h2>

              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <Link
                    href={primaryHref}
                    onClick={() => {
                      onOpenChange(false)
                      window.scrollTo({ top: 0, behavior: "auto" })
                    }}
                    className="flex items-center justify-center gap-2 bg-white text-black px-6 py-2 rounded-[4px] hover:bg-white/80 transition-colors font-bold text-[17px]"
                  >
                    <Play className="w-6 h-6 fill-current" />
                    <span className="mr-2">{primaryLabel}</span>
                  </Link>

                  {watchlistContext && anime.crunchyrollId ? (
                    <button
                      onClick={async () => {
                        const nextValue = !isBookmarked
                        setIsBookmarked(nextValue)
                        try {
                          if (nextValue) await watchlistContext.addToWatchlist(anime.crunchyrollId!)
                          else await watchlistContext.removeFromWatchlist(anime.crunchyrollId!)
                        } catch (error) {
                          setIsBookmarked(!nextValue)
                        }
                      }}
                      className="w-10 h-10 border border-[#808080] rounded-full flex items-center justify-center bg-[#2a2a2a]/60 hover:border-white transition-colors text-white"
                      aria-label="Ajouter à la liste"
                    >
                      {isBookmarked ? <Bookmark className="w-5 h-5 fill-current" /> : <Plus className="w-6 h-6" />}
                    </button>
                  ) : null}

                  <button
                    type="button"
                    className="w-10 h-10 border border-[#808080] rounded-full flex items-center justify-center bg-[#2a2a2a]/60 hover:border-white transition-colors text-white"
                    aria-label="J'aime"
                  >
                    <ThumbsUp className="w-5 h-5" />
                  </button>
                </div>

                <div className="hidden sm:flex items-center">
                  {trailerState === 'showing' && trailerVideoId ? (
                    <button
                      type="button"
                      onClick={() => setIsMuted(v => !v)}
                      className="w-10 h-10 border border-[#808080] rounded-full flex items-center justify-center bg-[#2a2a2a]/60 hover:border-white transition-colors text-white"
                      aria-label={isMuted ? "Activer le son du trailer" : "Couper le son du trailer"}
                    >
                      {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="w-10 h-10 border border-[#808080] rounded-full flex items-center justify-center bg-[#2a2a2a]/60 hover:border-white transition-colors text-white"
                      aria-label="Couper le son"
                    >
                      <VolumeX className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 px-8 sm:px-12 py-2">
            {isLoading && !details ? (
              <div className="flex items-center justify-center py-14 text-white/70">
                <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                Chargement de l'aperçu...
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-[65%_minmax(0,1fr)] gap-8 mt-2">
                  {/* Left Column Details */}
                  <div className="flex flex-col">
                    <div className="flex flex-wrap items-center gap-2.5 text-[#bcbcbc] font-medium text-[15px] mb-4">
                      {scoreLabel ? (
                        <span className="text-[#46d369] font-bold drop-shadow-sm">
                          {Math.round(displayAnime.score || 0)}% recommandé
                        </span>
                      ) : null}
                      {yearLabel ? <span className="text-[#bcbcbc]">{yearLabel}</span> : null}
                      {details?.format ? (
                        <span className="text-[#bcbcbc]">
                          {details.format.replace("TV_SHORT", "Minisérie").replace("TV", "Série")}
                        </span>
                      ) : null}
                      <span className="border border-[#808080] text-[#d2d2d2] rounded-[3px] px-1.5 py-[1px] text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
                        HD
                      </span>
                      {ratingLabel || details?.rating ? (
                        <span className="border border-[#808080] text-[#d2d2d2] rounded-[3px] px-1.5 py-[1px] text-[10px] sm:text-[11px] font-bold tracking-wider">
                          {ratingLabel || details?.rating}
                        </span>
                      ) : null}
                      {genres.length > 0 ? <span className="text-[#bcbcbc] text-sm ml-1">{genres[0]}</span> : null}
                    </div>

                    {dynamicTagline ? (
                      <p className="font-bold text-white text-[17px] sm:text-[19px] mb-3 leading-snug">
                        {dynamicTagline}
                      </p>
                    ) : null}

                    <p className="text-white text-[14px] sm:text-[15px] leading-relaxed mb-6">
                      {displayAnime.description || "Aucun synopsis disponible pour cet animé."}
                    </p>
                  </div>

                  {/* Right Column Specifications */}
                  <div className="flex flex-col gap-2.5 text-[14px] leading-relaxed">
                    {details?.studio && (
                      <div>
                        <span className="text-[#777]">Studio : </span>
                        <span className="text-white">{details.studio}</span>
                      </div>
                    )}
                    {genres.length > 0 && (
                      <div>
                        <span className="text-[#777]">Genres : </span>
                        <span className="text-white">{genres.join(", ")}</span>
                      </div>
                    )}
                    {details?.status && (
                      <div>
                        <span className="text-[#777]">Ce titre télé est : </span>
                        <span className="text-white">
                          {details.status === "FINISHED" ? "Terminé" : "En cours"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Episodes List Block */}
                <div className="mt-10 pb-16">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[22px] font-bold text-white tracking-wide">Épisodes</h3>
                    {seasons.length > 1 ? (
                      <Select
                        value={String(activeSeason ?? seasons[0]?.number ?? '')}
                        onValueChange={(v) => setSelectedSeason(Number(v))}
                      >
                        <SelectTrigger className="h-8 min-w-[120px] w-fit bg-[#2a2a2a] border-[#555] text-white text-[13px] hover:border-white focus:ring-0 focus:ring-offset-0 focus-visible:ring-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#2a2a2a] border-[#555] text-white">
                          {seasons.map((s) => (
                            <SelectItem
                              key={s.number}
                              value={String(s.number)}
                              className="text-white focus:bg-[#444] focus:text-white cursor-pointer"
                            >
                              {s.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : seasons.length === 1 ? (
                      <span className="text-white/70 text-[14px]">{seasons[0].title}</span>
                    ) : null}
                  </div>

                  {visibleEpisodes.length > 0 ? (
                    <div className="flex flex-col">
                      {visibleEpisodes.map((episode, idx) => {
                        const availableLabel = formatAvailability(episode.availableFrom)
                        return (
                          <Link
                            key={episode.id}
                            href={`/watch/${episode.id}`}
                            onClick={() => { onOpenChange(false); window.scrollTo({ top: 0, behavior: "auto" }) }}
                            className="group flex flex-row items-center gap-4 py-4 px-4 sm:px-6 border-b border-[#404040] hover:bg-[#333333] transition-colors rounded-md"
                          >
                            {/* Episode Number */}
                            <div className="text-[#d2d2d2] text-[22px] font-normal w-6 sm:w-10 flex justify-center shrink-0">
                              {episode.episodeNumber || idx + 1}
                            </div>

                            {/* Episode Thumbnail */}
                            <div className="relative shrink-0 w-[130px] sm:w-[140px] aspect-[16/9] rounded-md overflow-hidden bg-[#222]">
                              <img
                                src={episode.thumbnail || poster}
                                alt={episode.title}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors flex items-center justify-center">
                                {/* Play icon on hover */}
                                <div className="hidden group-hover:flex w-10 h-10 border-2 border-white rounded-full items-center justify-center bg-[#181818]/60 transition-opacity">
                                  <Play className="w-5 h-5 text-white fill-white ml-1" />
                                </div>
                              </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 flex flex-col min-w-0 pr-4">
                              <div className="flex justify-between items-start mb-1 sm:items-center">
                                <h4 className="text-white font-bold text-[15px] sm:text-[16px] truncate mr-2">
                                  {episode.title || `Épisode ${episode.episodeNumber || idx + 1}`}
                                </h4>
                                <span className="text-white font-medium text-[14px] shrink-0 whitespace-nowrap hidden sm:block">
                                  {formatDuration(episode.duration) || "24 min"}
                                </span>
                              </div>
                              <p className="text-[#a3a3a3] text-[13px] sm:text-[14px] line-clamp-2 leading-snug">
                                {episode.description || "Description indisponible."}
                              </p>
                              <span className="text-white font-medium text-[14px] shrink-0 whitespace-nowrap sm:hidden mt-2">
                                {formatDuration(episode.duration) || "24 min"}
                              </span>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  ) : (
                     <div className="text-[#a3a3a3] py-4">Aucun épisode Crunchyroll n'est disponible pour cet aperçu.</div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
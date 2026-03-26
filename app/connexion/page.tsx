"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import useSWR from "swr"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"
import { Eye, EyeOff, Loader2, AlertCircle, ChevronLeft } from "lucide-react"
import { BetterCrLogo } from "@/components/bettercr-logo"

interface AniListSlide {
  id: number
  title: { romaji: string; english: string | null }
  bannerImage: string | null
  coverImage: { extraLarge: string; large: string }
  description: string | null
}

const TRENDING_QUERY = `
query {
  Page(page: 1, perPage: 6) {
    media(type: ANIME, sort: TRENDING_DESC, isAdult: false, status_in: [RELEASING, FINISHED]) {
      id
      title { romaji english }
      bannerImage
      coverImage { extraLarge large }
      description(asHtml: false)
    }
  }
}
`

function useTrendingSlides() {
  return useSWR<AniListSlide[]>(
    "connexion-trending-slides",
    async () => {
      const res = await fetch("/api/anilist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: TRENDING_QUERY }),
      })
      const json = await res.json()
      return (json?.data?.Page?.media ?? []) as AniListSlide[]
    },
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  )
}

export default function LoginPage() {
  const router = useRouter()
  const { signIn, isLoading } = useAuth()
  const { data: slides } = useTrendingSlides()

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeIdx, setActiveIdx] = useState(0)
  // true when accessed at localhost:3000 directly (not via extension iframe)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    setIsStandalone(window.self === window.top)
  }, [])

  // Auto-cycle background image every 5 seconds
  useEffect(() => {
    if (!slides || slides.length === 0) return
    const timer = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % Math.min(slides.length, 5))
    }, 5000)
    return () => clearInterval(timer)
  }, [slides])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!username.trim()) { setError("Veuillez entrer votre email"); return }
    if (!password)        { setError("Veuillez entrer votre mot de passe"); return }

    const result = await signIn(username, password)
    if (result.success) {
      router.push("/")
    } else {
      setError(result.error ?? "Identifiants incorrects")
    }
  }

  const bgSlide = slides?.[activeIdx]
  const bgImage = bgSlide?.bannerImage || bgSlide?.coverImage?.extraLarge || bgSlide?.coverImage?.large || null

  return (
    <div className="min-h-screen flex bg-[#0d0d0d]">

      {/* â”€â”€ LEFT PANEL â€” anime artwork â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="hidden lg:flex lg:w-[55%] xl:w-[60%] relative overflow-hidden flex-col">

        {/* Background image with crossfade */}
        {slides && slides.slice(0, 5).map((slide, i) => {
          const src = slide.bannerImage || slide.coverImage?.extraLarge || slide.coverImage?.large
          return src ? (
            <div
              key={slide.id}
              className="absolute inset-0 transition-opacity duration-1000"
              style={{ opacity: i === activeIdx ? 1 : 0 }}
            >
              <Image
                src={src}
                alt={slide.title?.english || slide.title?.romaji || "Anime"}
                fill
                className="object-cover"
                priority={i === 0}
                sizes="60vw"
              />
            </div>
          ) : null
        })}

        {/* Dark overlay â€” gradient leftâ†’right so form side stays dark */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/10 via-black/30 to-[#0d0d0d]" />
        {/* Bottom fade for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

        {/* Fallback when no images loaded */}
        {!bgImage && (
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] via-[#0d0d0d] to-[#1a0a00]" />
        )}

        {/* Bottom caption â€” anime title */}
        <div className="absolute bottom-10 left-8 right-16 z-10">
          {bgSlide && (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#f47521] mb-1">
                Tendance
              </p>
              <h2 className="text-3xl font-extrabold text-white leading-tight drop-shadow-lg line-clamp-2">
                {bgSlide.title?.english || bgSlide.title?.romaji}
              </h2>
              {bgSlide.description && (
                <p className="mt-2 text-sm text-white/60 line-clamp-2 max-w-[480px] leading-relaxed">
                  {bgSlide.description.replace(/<[^>]*>/g, "")}
                </p>
              )}
            </>
          )}
        </div>

        {/* Dot indicators */}
        {slides && slides.length > 1 && (
          <div className="absolute bottom-10 right-8 z-10 flex flex-col gap-1.5">
            {slides.slice(0, 5).map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveIdx(i)}
                className={cn(
                  "w-1.5 rounded-full transition-all duration-300",
                  i === activeIdx
                    ? "h-6 bg-[#f47521]"
                    : "h-3 bg-white/30 hover:bg-white/60"
                )}
                aria-label={`Image ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* â”€â”€ RIGHT PANEL â€” login form â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="flex-1 flex flex-col min-h-screen bg-[#0d0d0d] lg:bg-[#0d0d0d]/95">

        {/* Top bar */}
        <header className="flex items-center justify-between px-8 pt-8 pb-4">
          <Link href="/" className="flex items-center gap-1.5 text-xs text-white/35 hover:text-white/70 transition-colors">
            <ChevronLeft className="w-3.5 h-3.5" />
            Accueil
          </Link>
          <BetterCrLogo className="h-7 w-auto opacity-80 hover:opacity-100 transition-opacity" />
          <div className="w-16" /> {/* spacer */}
        </header>

        {/* Form area â€” centered vertically in the remaining space */}
        <main className="flex-1 flex items-center justify-center px-6 py-8">
          <div className="w-full max-w-[380px] space-y-6">

            <div>
              <h1 className="text-3xl font-extrabold text-white leading-tight">
                Se connecter
              </h1>
              <p className="mt-2 text-sm text-white/45">
                Utilisez votre compte{" "}
                <a
                  href="https://www.crunchyroll.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#f47521] hover:underline"
                >
                  Crunchyroll
                </a>{" "}
                pour continuer
              </p>
            </div>

            {/* Standalone mode notice */}
            {isStandalone && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#f47521]/10 border border-[#f47521]/25 text-[#f47521] text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                  Pour vous connecter, ouvrez l&apos;application via l&apos;extension BetterCrunchyroll sur{" "}
                  <a href="https://www.crunchyroll.com" target="_blank" rel="noopener noreferrer" className="underline">
                    crunchyroll.com
                  </a>.
                </span>
              </div>
            )}

            {/* Extension reload notice */}
            {error === "__RELOAD_EXTENSION__" ? (
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-400 text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                  Extension non à jour — rechargez <strong>BetterCrunchyroll</strong> dans{" "}
                  <code className="text-amber-300">chrome://extensions</code>, puis rafraîchissez la page.
                </span>
              </div>
            ) : error ? (
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-500/10 border border-red-500/25 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label htmlFor="username" className="block text-xs font-semibold text-white/55 uppercase tracking-widest mb-2">
                  Email ou nom d&apos;utilisateur
                </label>
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  placeholder="votre@email.com"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  className={cn(
                    "w-full px-4 py-3 rounded-xl text-sm",
                    "bg-white/[0.06] border border-white/[0.1]",
                    "text-white placeholder:text-white/25",
                    "focus:outline-none focus:border-[#f47521]/70 focus:bg-white/[0.09]",
                    "transition-all duration-200 disabled:opacity-50"
                  )}
                />
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="password" className="block text-xs font-semibold text-white/55 uppercase tracking-widest">
                    Mot de passe
                  </label>
                  <a
                    href="https://www.crunchyroll.com/fr/forgot-password"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-[#f47521]/75 hover:text-[#f47521] transition-colors"
                  >
                    Mot de passe oublie ?
                  </a>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className={cn(
                      "w-full px-4 py-3 pr-11 rounded-xl text-sm",
                      "bg-white/[0.06] border border-white/[0.1]",
                      "text-white placeholder:text-white/25",
                      "focus:outline-none focus:border-[#f47521]/70 focus:bg-white/[0.09]",
                      "transition-all duration-200 disabled:opacity-50"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/35 hover:text-white/65 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading || !username || !password}
                className={cn(
                  "w-full py-3.5 mt-1 rounded-xl font-bold text-sm text-white",
                  "bg-[#f47521] hover:bg-[#e06518] active:bg-[#cc5c14]",
                  "transition-colors duration-200",
                  "disabled:opacity-40 disabled:cursor-not-allowed",
                  "flex items-center justify-center gap-2"
                )}
              >
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Connexion en cours...</>
                ) : (
                  "Se connecter"
                )}
              </button>
            </form>

            <div className="pt-5 border-t border-white/[0.07] text-center text-sm text-white/40">
              Pas encore de compte ?{" "}
              <a
                href="https://www.crunchyroll.com/fr/register"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#f47521] hover:underline font-medium"
              >
                S&apos;inscrire sur Crunchyroll
              </a>
            </div>

            <p className="text-[11px] text-white/20 text-center leading-relaxed">
              Vos identifiants sont transmis directement a Crunchyroll et ne sont jamais stockes par BetterCrunchyroll.
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}

"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ChevronDown, Crown, LogOut, Menu, Search, Settings, User, X } from "lucide-react"
import { AvatarSelector } from "@/components/avatar-selector"
import { BetterCrLogo } from "@/components/bettercr-logo"
import { ProfileAvatar } from "@/components/profile-avatar"
import { useAuth } from "@/hooks/use-auth"
import { useCrunchyrollAccount, useCrunchyrollProfile, useCrunchyrollSubscription } from "@/hooks/use-crunchyroll"
import { useI18n } from "@/hooks/use-i18n"
import { cn } from "@/lib/utils"

const navItems = [
  { labelKey: "nav.home", href: "/" },
  { labelKey: "nav.series", href: "/populaire" },
  { labelKey: "nav.films", href: "/films" },
  { labelKey: "nav.simulcast", href: "/simulcast" },
  { labelKey: "nav.watchlist", href: "/watchlist" },
]

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isAvatarOpen, setIsAvatarOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useI18n()

  const { data: profile, isLoading: profileLoading } = useCrunchyrollProfile()
  const { data: account, isLoading: accountLoading } = useCrunchyrollAccount()
  const { data: subscription, isLoading: subscriptionLoading } = useCrunchyrollSubscription(account?.account_id || null)
  const { user: authUser, logout } = useAuth()

  const isUserLoading = profileLoading || accountLoading || subscriptionLoading
  const displayName = profile?.username || profile?.profile_name || authUser?.username || authUser?.profile_name || "Utilisateur"
  const displayEmail = account?.email || authUser?.email || ""

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleNavigation = (href: string) => {
    if (typeof window !== "undefined" && window.parent !== window) {
      window.parent.postMessage({ type: "BCR_NAVIGATE", path: href }, "*")
    }
  }

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href.split("?")[0])
  }

  const handleSearch = () => {
    handleNavigation("/search")
    router.push("/search")
  }

  const handleLogout = () => {
    setIsProfileOpen(false)
    logout()
  }

  return (
    <>
      <AvatarSelector isOpen={isAvatarOpen} onClose={() => setIsAvatarOpen(false)} />
      <header className="relative z-[100] mx-auto mt-4 w-[calc(100%-3rem)] rounded-[18px] bg-black/92 shadow-[0_16px_46px_rgba(0,0,0,0.55)] backdrop-blur-xl md:w-[calc(100%-6rem)]">
        <div className="grid h-[56px] grid-cols-[auto_1fr_auto] items-center gap-4 px-5 md:h-[60px] md:px-8 lg:px-10">
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setIsProfileOpen((value) => !value)}
              className="flex items-center gap-1.5 rounded-md p-1 text-white transition-colors duration-200 hover:bg-white/10"
              aria-label={t("nav.profile")}
            >
              <ProfileAvatar
                src={profile?.avatar}
                alt={profile?.username || "Profile"}
                size="sm"
                isLoading={isUserLoading}
              />
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-white/65 transition-transform duration-200",
                  isProfileOpen && "rotate-180",
                )}
              />
            </button>

            <div
              className={cn(
                "absolute left-0 top-full mt-3 w-72 origin-top-left overflow-hidden rounded-md border border-white/10 bg-black/86 shadow-[0_18px_48px_rgba(0,0,0,0.58)] backdrop-blur-xl transition-all duration-200",
                isProfileOpen ? "visible scale-100 opacity-100" : "invisible scale-95 opacity-0",
              )}
            >
              <div className="border-b border-white/8 bg-white/[0.03] p-4">
                <div className="flex items-center gap-3">
                  <ProfileAvatar
                    src={profile?.avatar}
                    alt={profile?.username || "Profile"}
                    size="md"
                    isLoading={isUserLoading}
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold text-white">
                      {isUserLoading ? "Chargement..." : displayName}
                    </h3>
                    {subscription && Array.isArray(subscription) && subscription.length > 0 ? (
                      <div className="mt-0.5 flex items-center gap-1 text-sm text-[#e50914]">
                        <Crown className="h-3.5 w-3.5" />
                        <span>Premium</span>
                      </div>
                    ) : null}
                    {displayEmail ? <p className="mt-0.5 truncate text-xs text-white/45">{displayEmail}</p> : null}
                  </div>
                </div>
              </div>

              <div className="py-2">
                <ProfileMenuButton icon={User} label={t("nav.changeAvatar")} onClick={() => {
                  setIsProfileOpen(false)
                  setIsAvatarOpen(true)
                }} />
                <ProfileMenuLink
                  icon={Settings}
                  label={t("nav.settings")}
                  href="/parametres"
                  onClick={() => {
                    setIsProfileOpen(false)
                    handleNavigation("/parametres")
                  }}
                />
                <div className="my-2 h-px bg-white/10" />
                <ProfileMenuButton icon={LogOut} label={t("nav.logout")} onClick={handleLogout} destructive />
              </div>
            </div>
          </div>

          <nav className="hidden items-center justify-center gap-1.5 md:flex">
            <button
              onClick={handleSearch}
              className="flex h-9 w-9 items-center justify-center rounded-full text-white transition-colors duration-200 hover:bg-white/10"
              aria-label={t("nav.search")}
            >
              <Search className="h-5 w-5" />
            </button>

            {navItems.map((item) => (
              <Link
                key={item.labelKey}
                href={item.href}
                onClick={() => {
                  handleNavigation(item.href)
                }}
                className={cn(
                  "rounded-full px-3.5 py-2 text-sm font-semibold text-white/88 transition-colors duration-200",
                  isActive(item.href) ? "bg-white text-black" : "hover:bg-white/10 hover:text-white",
                )}
              >
                {t(item.labelKey)}
              </Link>
            ))}
          </nav>

          <Link href="/" onClick={() => handleNavigation("/")} className="justify-self-end" aria-label="Crunchyroll accueil">
            <BetterCrLogo className="h-6 w-auto md:h-7" compact />
          </Link>

          <button
            onClick={() => setIsMobileMenuOpen((value) => !value)}
            className="absolute right-20 top-1/2 flex -translate-y-1/2 rounded-full p-2 text-white/80 transition-colors hover:bg-white/10 md:hidden"
            aria-label="Menu"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        <div
          className={cn(
            "absolute left-4 right-4 top-full z-50 rounded-md border border-white/10 bg-black/90 p-3 shadow-xl transition-all duration-200 md:hidden",
            isMobileMenuOpen ? "visible translate-y-0 opacity-100" : "invisible -translate-y-2 opacity-0",
          )}
        >
          <button
            onClick={handleSearch}
            className="mb-2 flex w-full items-center gap-3 rounded-md px-3 py-2 text-left font-semibold text-white/86 hover:bg-white/10"
          >
            <Search className="h-5 w-5" />
            {t("nav.search")}
          </button>
          {navItems.map((item) => (
            <Link
              key={item.labelKey}
              href={item.href}
              onClick={() => {
                setIsMobileMenuOpen(false)
                handleNavigation(item.href)
              }}
              className="block rounded-md px-3 py-2 font-semibold text-white/86 hover:bg-white/10"
            >
              {t(item.labelKey)}
            </Link>
          ))}
        </div>
      </header>
    </>
  )
}

function ProfileMenuButton({
  icon: Icon,
  label,
  onClick,
  destructive,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  onClick: () => void
  destructive?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors",
        destructive ? "text-red-300 hover:bg-red-500/10 hover:text-red-200" : "text-white/72 hover:bg-white/8 hover:text-white",
      )}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </button>
  )
}

function ProfileMenuLink({
  icon: Icon,
  label,
  href,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  href: string
  onClick: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/72 transition-colors hover:bg-white/8 hover:text-white"
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </Link>
  )
}

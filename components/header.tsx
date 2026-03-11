"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Search,
  Bookmark,
  ChevronDown,
  Menu,
  X,
  User,
  Settings,
  LogOut,
  Bell,
  History,
  Gift,
  ListVideo,
  Users,
  Crown,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useCrunchyrollProfile, useCrunchyrollAccount, useCrunchyrollSubscription } from "@/hooks/use-crunchyroll"
import { AvatarSelector } from "@/components/avatar-selector"
import { ProfileAvatar } from "@/components/profile-avatar"
import { BetterCrLogo } from "@/components/bettercr-logo"

const navItems = [
  { label: "Accueil", href: "/" },
  { label: "Séries", href: "/populaire" },
  { label: "Films", href: "/films" },
  { label: "Jeux", href: "#", disabled: true },
  { label: "Nouveau et populaire", href: "/simulcast" },
  { label: "Ma liste", href: "/watchlist" },
  { label: "Parcourir", href: "#browse", hasDropdown: true },
]

const browseGenres = [
  "Action",
  "Romance",
  "Fantasy",
  "Shonen",
  "Seinen",
  "Drame",
  "Thriller",
  "Sports",
]

export function Header() {
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isAvatarOpen, setIsAvatarOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const router = useRouter()

  // Get profile and account data from Crunchyroll API
  const { data: profile, isLoading: profileLoading } = useCrunchyrollProfile()
  const { data: account, isLoading: accountLoading } = useCrunchyrollAccount()
  const { data: subscription, isLoading: subscriptionLoading } = useCrunchyrollSubscription(account?.account_id || null)

  const isUserLoading = profileLoading || accountLoading || subscriptionLoading

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 16)
    handleScroll()
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const handleSearchClick = () => {
    setIsSearchOpen(true)
    router.push("/search")
  }

  // Handle navigation clicks to update parent URL
  const handleNavigation = (href: string) => {
    // Send message to parent window to update URL
    if (typeof window !== 'undefined' && window.parent !== window) {
      window.parent.postMessage({
        type: 'BCR_NAVIGATE',
        path: href,
      }, '*')
    }
  }

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href.split("?")[0])
  }

  return (
    <>
      <AvatarSelector isOpen={isAvatarOpen} onClose={() => setIsAvatarOpen(false)} />
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-[100] transition-all duration-300",
          isScrolled
            ? "bg-black/92 shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
            : "bg-gradient-to-b from-black/85 via-black/45 to-transparent",
        )}
      >
        <div className="flex items-center justify-between h-17 px-4 md:px-8 lg:px-12 xl:px-16">
          {/* Logo */}
          <div className="flex items-center gap-6 xl:gap-10">
            <Link
              href="/"
              className="flex items-center gap-3 group shrink-0"
              onClick={() => handleNavigation('/')}
            >
              <BetterCrLogo className="transition-transform duration-200 group-hover:scale-[1.02]" compact />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-0.5 xl:gap-2">
              {navItems.map((item) => (
                <div key={item.label} className="relative group/nav">
                  <Link
                    href={item.disabled ? "#" : item.href}
                    onClick={(e) => {
                      if (item.disabled) {
                        e.preventDefault()
                      } else {
                        handleNavigation(item.href)
                      }
                    }}
                    className={cn(
                      "flex items-center gap-1 px-3 py-2 text-[0.95rem] font-medium text-white/72",
                      "hover:text-white transition-all duration-200 rounded",
                      isActive(item.href) &&
                      item.href !== "#browse" &&
                      !item.disabled &&
                      "text-white",
                      item.disabled &&
                      "opacity-45 cursor-not-allowed hover:text-white/72",
                    )}
                  >
                    {item.label}
                    {item.hasDropdown && (
                      <ChevronDown className="w-4 h-4 transition-transform duration-300 group-hover/nav:rotate-180" />
                    )}
                  </Link>

                  {item.label === "Parcourir" && (
                    <div className="absolute top-full left-0 pt-4 w-80 opacity-0 invisible group-hover/nav:opacity-100 group-hover/nav:visible transition-all duration-200 z-50">
                      <div className="netflix-panel rounded-md p-4 grid grid-cols-2 gap-2">
                        {browseGenres.map((genre) => (
                          <Link
                            key={genre}
                            href={`/search?q=${genre}`}
                            onClick={() => handleNavigation(`/search?q=${genre}`)}
                            className="px-3 py-2 text-sm text-white/72 hover:text-white hover:bg-white/8 rounded transition-colors text-left"
                          >
                            {genre}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </nav>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-1.5 md:gap-2">
            <button
              onClick={handleSearchClick}
              className={cn(
                "p-2 rounded-full text-white/80 hover:text-white transition-all duration-200",
                isSearchOpen && "bg-white/10",
              )}
            >
              <Search className="w-5 h-5" />
            </button>

            <Link
              href="/watchlist"
              onClick={() => handleNavigation('/watchlist')}
              className="hidden sm:flex p-2 rounded-full text-white/78 hover:text-white transition-all duration-200"
            >
              <Bookmark className="w-5 h-5" />
            </Link>

            <button className="hidden md:flex p-2 rounded-full text-white/78 hover:text-white transition-all duration-200">
              <Bell className="w-5 h-5" />
            </button>

            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2 rounded-sm p-1 pl-1 pr-2 bg-transparent hover:bg-white/10 transition-all duration-200 group"
              >
                <ProfileAvatar
                  src={profile?.avatar}
                  alt={profile?.username || 'Profile'}
                  size="sm"
                  isLoading={isUserLoading}
                />
                <ChevronDown
                  className={cn(
                    "w-4 h-4 text-white/72 group-hover:text-white transition-all duration-200 hidden sm:block",
                    isProfileOpen && "rotate-180",
                  )}
                />
              </button>

              {/* Profile Dropdown */}
              <div
                className={cn(
                  "absolute right-0 top-full mt-3 w-72 netflix-panel rounded-md overflow-hidden transition-all duration-200 origin-top-right",
                  isProfileOpen ? "opacity-100 scale-100 visible" : "opacity-0 scale-95 invisible",
                )}
              >
                {/* Profile Header */}
                <div className="p-4 bg-white/[0.03] border-b border-white/8">
                  <div className="flex items-center gap-3">
                    <ProfileAvatar
                      src={profile?.avatar}
                      alt={profile?.username || 'Profile'}
                      size="md"
                      isLoading={isUserLoading}
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">
                        {isUserLoading ? (
                          <span className="text-muted-foreground">Chargement...</span>
                        ) : (
                          profile?.username || profile?.profile_name || 'Utilisateur'
                        )}
                      </h3>
                      {subscription && Array.isArray(subscription) && subscription.length > 0 && (
                        <div className="flex items-center gap-1 text-sm text-primary">
                          <Crown className="w-3.5 h-3.5" />
                          <span>Premium</span>
                        </div>
                      )}
                      {account?.email && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {account.email}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Menu Items */}
                <div className="py-2">
                  <ProfileMenuItem icon={Users} label="Changer de profil" onClick={() => setIsProfileOpen(false)} />
                  <ProfileMenuItem
                    icon={User}
                    label="Changer d'avatar"
                    onClick={() => {
                      setIsProfileOpen(false)
                      setIsAvatarOpen(true)
                    }}
                  />
                  <ProfileMenuItem
                    icon={Settings}
                    label="Paramètres"
                    href="/parametres"
                    onClick={() => {
                      setIsProfileOpen(false)
                      handleNavigation('/parametres')
                    }}
                  />

                  <div className="h-px bg-border my-2" />

                  <ProfileMenuItem
                    icon={Bookmark}
                    label="Watchlist"
                    href="/watchlist"
                    onClick={() => {
                      setIsProfileOpen(false)
                      handleNavigation('/watchlist')
                    }}
                  />
                  <ProfileMenuItem icon={ListVideo} label="CrunchyLists" onClick={() => setIsProfileOpen(false)} />
                  <ProfileMenuItem icon={History} label="Historique" onClick={() => setIsProfileOpen(false)} />
                  <ProfileMenuItem icon={Bell} label="Notifications" onClick={() => setIsProfileOpen(false)} />

                  <div className="h-px bg-border my-2" />

                  <ProfileMenuItem icon={Gift} label="Carte cadeaux" onClick={() => setIsProfileOpen(false)} />

                  <div className="h-px bg-border my-2" />

                  <ProfileMenuItem
                    icon={LogOut}
                    label="Se déconnecter"
                    onClick={() => setIsProfileOpen(false)}
                    variant="destructive"
                  />
                </div>
              </div>
            </div>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-full text-white/78 hover:text-white transition-all duration-200 lg:hidden"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div
          className={cn(
            "lg:hidden absolute top-full left-3 right-3 mt-2 netflix-panel rounded-md overflow-hidden",
            "transition-all duration-300 ease-out",
            isMobileMenuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0",
          )}
        >
          <nav className="flex flex-col p-4 gap-1">
            {navItems.map((item, index) => (
              <Link
                key={item.label}
                href={item.disabled ? "#" : item.href}
                onClick={(e) => {
                  if (item.disabled) {
                    e.preventDefault()
                  } else {
                    setIsMobileMenuOpen(false)
                    handleNavigation(item.href)
                  }
                }}
                className={cn(
                  "flex items-center justify-between px-4 py-3 text-base font-medium text-white/72",
                  "hover:text-white hover:bg-white/8 transition-all duration-200 rounded",
                  "transform transition-all duration-300",
                  isActive(item.href) && item.href !== "#browse" && !item.disabled && "text-white",
                  item.disabled && "opacity-50 cursor-not-allowed",
                )}
                style={{
                  transitionDelay: isMobileMenuOpen ? `${index * 50}ms` : "0ms",
                  opacity: isMobileMenuOpen ? 1 : 0,
                  transform: isMobileMenuOpen ? "translateX(0)" : "translateX(-20px)",
                }}
              >
                {item.label}
                {item.disabled && <span className="text-xs bg-secondary px-2 py-0.5 rounded">Bientôt</span>}
                {item.hasDropdown && !item.disabled && <ChevronDown className="w-4 h-4" />}
              </Link>
            ))}
          </nav>
        </div>
      </header>
    </>
  )
}

function ProfileMenuItem({
  icon: Icon,
  label,
  href,
  onClick,
  variant = "default",
}: {
  icon: React.ElementType
  label: string
  href?: string
  onClick?: () => void
  variant?: "default" | "destructive"
}) {
  const router = useRouter()
  const className = cn(
    "flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium transition-colors",
    variant === "default" && "text-foreground hover:bg-white/8",
    variant === "destructive" && "text-destructive hover:bg-destructive/10",
  )

  const content = (
    <>
      <Icon className="w-5 h-5" />
      {label}
    </>
  )

  if (href) {
    return (
      <Link href={href} className={className} onClick={onClick}>
        {content}
      </Link>
    )
  }

  return (
    <button className={className} onClick={onClick}>
      {content}
    </button>
  )
}

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
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useCrunchyrollProfile, useCrunchyrollAccount, useCrunchyrollSubscription } from "@/hooks/use-crunchyroll"

const navItems = [
  { label: "Accueil", href: "/" },
  { label: "Nouveau", href: "/nouveau" },
  { label: "Populaire", href: "/populaire" },
  { label: "Simulcast", href: "/simulcast" },
  { label: "Catégories", href: "#categories", hasDropdown: true },
  { label: "Manga", href: "#", disabled: true },
  { label: "Jeux", href: "#", disabled: true },
  { label: "Boutique", href: "#", disabled: true },
  { label: "News", href: "/news", hasDropdown: true },
]

export function Header() {
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
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

  const handleSearchClick = () => {
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

  return (
    <header className="fixed top-4 left-4 right-4 z-[100] bg-background/85 backdrop-blur-2xl border border-border/40 rounded-2xl shadow-lg shadow-black/20">
      <div className="flex items-center justify-between h-16 px-4 md:px-8 lg:px-12">
        {/* Logo */}
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="flex items-center gap-2 group"
            onClick={() => handleNavigation('/')}
          >
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
              <span className="text-primary-foreground font-bold text-sm">C</span>
            </div>
            <span className="text-primary font-bold text-xl hidden sm:block transition-colors duration-300 group-hover:text-primary/80">
              Crunchyroll
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.disabled ? "#" : item.href}
                onClick={(e) => {
                  if (item.disabled) {
                    e.preventDefault()
                  } else {
                    handleNavigation(item.href)
                  }
                }}
                className={cn(
                  "flex items-center gap-1 px-3 py-2 text-sm font-medium text-muted-foreground",
                  "hover:text-foreground transition-all duration-300 rounded-lg hover:bg-secondary/50",
                  "relative after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2",
                  "after:w-0 after:h-0.5 after:bg-primary after:transition-all after:duration-300",
                  "hover:after:w-full",
                  pathname === item.href &&
                  item.href !== "#categories" &&
                  !item.disabled &&
                  "text-primary after:w-full",
                  item.disabled &&
                  "opacity-50 cursor-not-allowed hover:text-muted-foreground hover:bg-transparent hover:after:w-0",
                )}
              >
                {item.label}
                {item.hasDropdown && (
                  <ChevronDown className="w-4 h-4 transition-transform duration-300 group-hover:rotate-180" />
                )}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSearchClick}
            className="p-2 rounded-full hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-all duration-300"
          >
            <Search className="w-5 h-5" />
          </button>

          <Link
            href="/watchlist"
            onClick={() => handleNavigation('/watchlist')}
            className="p-2 rounded-full hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-all duration-300 hidden sm:flex"
          >
            <Bookmark className="w-5 h-5" />
          </Link>

          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2 p-1 pr-3 rounded-full bg-secondary/50 hover:bg-secondary transition-all duration-300 group"
            >
              <div className="w-8 h-8 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center overflow-hidden">
                {isUserLoading ? (
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                ) : profile?.avatar ? (
                  <img
                    src={profile.avatar}
                    alt={profile.username || 'Profile'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-4 h-4 text-primary" />
                )}
              </div>
              <ChevronDown
                className={cn(
                  "w-4 h-4 text-muted-foreground group-hover:text-foreground transition-all duration-300 hidden sm:block",
                  isProfileOpen && "rotate-180",
                )}
              />
            </button>

            {/* Profile Dropdown */}
            <div
              className={cn(
                "absolute right-0 top-full mt-2 w-72 bg-card border border-border rounded-xl shadow-xl overflow-hidden transition-all duration-300 origin-top-right",
                isProfileOpen ? "opacity-100 scale-100 visible" : "opacity-0 scale-95 invisible",
              )}
            >
              {/* Profile Header */}
              <div className="p-4 bg-secondary/30 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center overflow-hidden">
                    {isUserLoading ? (
                      <Loader2 className="w-6 h-6 text-primary animate-spin" />
                    ) : profile?.avatar ? (
                      <img
                        src={profile.avatar}
                        alt={profile.username || 'Profile'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-6 h-6 text-primary" />
                    )}
                  </div>
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
            className="p-2 rounded-full hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-all duration-300 lg:hidden"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={cn(
          "lg:hidden absolute top-full left-0 right-0 mt-2 bg-background/95 backdrop-blur-2xl border border-border/40 rounded-xl shadow-lg shadow-black/20",
          "transition-all duration-500 ease-out overflow-hidden",
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
                "flex items-center justify-between px-4 py-3 text-base font-medium text-muted-foreground",
                "hover:text-foreground hover:bg-secondary/50 transition-all duration-300 rounded-lg",
                "transform transition-all duration-300",
                pathname === item.href && item.href !== "#categories" && !item.disabled && "text-primary",
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
    variant === "default" && "text-foreground hover:bg-secondary/50",
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

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
import { AvatarSelector } from "@/components/avatar-selector"
import { ProfileAvatar } from "@/components/profile-avatar"

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
  const [isAvatarOpen, setIsAvatarOpen] = useState(false)
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
    <>
      <AvatarSelector isOpen={isAvatarOpen} onClose={() => setIsAvatarOpen(false)} />
      <header className="fixed top-4 left-4 right-4 z-[100] bg-background/85 backdrop-blur-2xl border border-border/40 rounded-2xl shadow-lg shadow-black/20">
        <div className="flex items-center justify-between h-16 px-4 md:px-8 lg:px-12">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="flex items-center gap-2 group mr-4"
              onClick={() => handleNavigation('/')}
            >
              <svg
                className="w-28 h-auto text-primary fill-current transition-colors duration-300 group-hover:text-primary/80"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 303 52"
                data-t="crunchyroll-horizontal-svg"
                aria-hidden="true"
                role="img"
              >
                <path d="M62.1772 26.0647C62.1772 17.3803 69.1876 10.3699 77.872 10.3699C84.2042 10.3699 89.2693 13.8967 91.8466 19.0081L85.425 22.1742C84.0686 19.2794 81.3094 17.1091 77.872 17.1091C73.1676 17.1091 69.3233 20.9996 69.3233 26.0647C69.3233 31.1299 73.1676 35.0667 77.872 35.0667C81.3094 35.0667 84.0686 32.8963 85.425 30.0015L91.8466 33.1676C89.2693 38.279 84.2042 41.8058 77.872 41.8058C69.1876 41.8058 62.1772 34.7954 62.1772 26.0647Z M94.3376 18.7368H101.077V22.3992C102.298 20.0933 104.197 18.7368 106.506 18.7368H108.405V25.3865H106.188C102.976 25.3865 101.484 27.1499 101.484 30.2728V41.3526H94.3376V18.7368Z M110.754 31.6724V18.7368H117.9V31.6724C117.9 34.1603 119.484 35.6986 121.88 35.6986C124.275 35.6986 125.86 34.1603 125.86 31.6724V18.7368H133.006V31.6724C133.006 37.6871 128.301 41.8027 121.88 41.8027C115.458 41.8027 110.754 37.6871 110.754 31.6724Z M136.4 18.7368H143.41V21.4959C144.995 19.6863 147.208 18.5117 149.789 18.5117C155.307 18.5117 158.926 22.538 158.926 28.3275V41.3526H151.78V28.3275C151.78 25.9291 150.017 24.1195 147.665 24.1195C145.312 24.1195 143.549 25.9291 143.549 28.3275V41.3526H136.403V18.7368H136.4Z M178.691 32.1256L184.526 34.8848C182.671 38.9541 178.647 41.8058 173.761 41.8058C167.158 41.8058 161.864 36.5588 161.864 30.0447C161.864 23.5306 167.158 18.2836 173.761 18.2836C178.691 18.2836 182.717 21.1784 184.573 25.2478L178.694 28.0532C177.926 25.9723 176.024 24.5264 173.764 24.5264C170.78 24.5264 168.517 26.968 168.517 30.0447C168.517 33.1214 170.78 35.563 173.764 35.563C175.981 35.563 177.88 34.1603 178.694 32.1256H178.691Z M186.832 10.8231H193.978V21.4528C195.563 19.6432 197.733 18.5117 200.221 18.5117C205.739 18.5117 209.359 22.538 209.359 28.3275V41.3526H202.213V28.3275C202.213 25.9291 200.449 24.1195 198.097 24.1195C195.745 24.1195 193.981 25.9291 193.981 28.3275V41.3526H186.835V10.8231H186.832Z M222.337 32.215L227.131 18.7368H234.277L225.14 42.7091C223.241 47.6848 220.254 49.8089 215.188 49.8089H211.933V43.5661H215.188C217.134 43.5661 218.129 42.7522 218.672 41.3958L209.67 18.7368H217.312L222.334 32.215H222.337Z M236.087 18.7368H242.826V22.3992C244.047 20.0933 245.946 18.7368 248.255 18.7368H250.154V25.3865H247.938C244.725 25.3865 243.233 27.1499 243.233 30.2728V41.3526H236.087V18.7368Z M251.15 30.0447C251.15 23.5769 256.443 18.2836 263.136 18.2836C269.829 18.2836 275.122 23.5769 275.122 30.0447C275.122 36.5125 269.829 41.8058 263.136 41.8058C256.443 41.8058 251.15 36.5588 251.15 30.0447ZM257.8 30.0447C257.8 33.2108 260.152 35.563 263.136 35.563C266.12 35.563 268.472 33.2108 268.472 30.0447C268.472 26.8786 266.12 24.5264 263.136 24.5264C260.152 24.5264 257.8 26.8786 257.8 30.0447Z M286.427 41.3526C280.502 41.3526 278.06 38.7291 278.06 33.1214V10.8231H285.206V33.1214C285.206 34.3884 285.749 35.1129 287.016 35.1129H288.19V41.3557H286.427V41.3526Z M298.367 41.3526C292.442 41.3526 290 38.7291 290 33.1214V10.8231H297.146V33.1214C297.146 34.3884 297.689 35.1129 298.956 35.1129H300.13V41.3557H298.367V41.3526Z M7.81735 28.8732C7.82968 17.2231 17.2848 7.78652 28.9349 7.79885C40.0886 7.81118 49.2108 16.4771 49.9568 27.4366C49.9846 26.968 50 26.4963 50 26.0247C50.0123 12.7684 39.2809 2.01234 26.0247 2.00001C12.7684 1.98768 2.01234 12.7222 2.00001 25.9753C1.98768 39.2316 12.7222 49.9877 25.9753 50C26.5241 50 27.0667 49.9815 27.6062 49.9476C16.5542 49.2724 7.80502 40.0917 7.81735 28.8732Z M40.3846 29.1846C35.8559 29.1815 32.1873 25.5037 32.1935 20.9749C32.1965 17.4235 34.4594 14.4023 37.6193 13.2647C35.1191 11.9453 32.2705 11.1961 29.2432 11.1931C19.2948 11.1838 11.2208 19.2393 11.2116 29.1877C11.2023 39.136 19.2578 47.21 29.2062 47.2193C39.1545 47.2285 47.2285 39.173 47.2378 29.2216C47.2378 28.0933 47.136 26.9927 46.9387 25.9198C45.4405 27.9021 43.0636 29.1846 40.3846 29.1815V29.1846Z" />
              </svg>
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
                <ProfileAvatar
                  src={profile?.avatar}
                  alt={profile?.username || 'Profile'}
                  size="sm"
                  isLoading={isUserLoading}
                />
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

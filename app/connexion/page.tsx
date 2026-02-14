"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"
import { Eye, EyeOff, Loader2, LogIn, ArrowLeft, Lock, Mail, Zap, Shield } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const { signIn, isLoading, error } = useAuth()

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"login" | "info">("login")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)

    if (!username.trim()) {
      setLocalError("Veuillez entrer votre email ou nom d'utilisateur")
      return
    }

    if (!password) {
      setLocalError("Veuillez entrer votre mot de passe")
      return
    }

    const result = await signIn(username, password)

    if (result.success) {
      // Redirect to home page
      router.push("/")
    } else {
      setLocalError(result.error || "Erreur de connexion")
    }
  }

  const displayError = localError || error

  return (
    <>
      <main className="min-h-screen bg-background flex flex-col">
        <Header />

        <div className="flex-1 relative overflow-hidden flex items-center justify-center px-4 py-16">
          {/* Premium Background Effects */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary rounded-full mix-blend-soft-light filter blur-3xl opacity-15 animate-blob" />
            <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-600 rounded-full mix-blend-soft-light filter blur-3xl opacity-15 animate-blob animation-delay-2000" />
            <div className="absolute top-1/2 right-0 w-96 h-96 bg-purple-600 rounded-full mix-blend-soft-light filter blur-3xl opacity-10 animate-blob animation-delay-4000" />
          </div>

          <div className="relative z-10 w-full max-w-xl">
            {/* Back button */}
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-12 group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span>Retour à l'accueil</span>
            </Link>

            {/* Main Card Container */}
            <div className="relative">
              {/* Card Background with Gradient Border */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-blue-600/20 rounded-3xl blur-xl opacity-50" />

              <div className="relative bg-card/95 backdrop-blur-xl border border-primary/20 rounded-3xl p-8 md:p-12 shadow-2xl">
                {/* Header Section */}
                <div className="mb-10">
                  <div className="inline-flex items-center gap-3 mb-6 p-3 bg-primary/10 rounded-xl border border-primary/30">
                    <div className="p-2 bg-primary/20 rounded-lg">
                      <Zap className="w-6 h-6 text-primary" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest text-primary">
                      Authentification Sécurisée
                    </span>
                  </div>

                  <h1 className="text-4xl md:text-5xl font-black text-foreground font-bangers tracking-wider mb-3">
                    Connexion
                  </h1>
                  <p className="text-muted-foreground text-base md:text-lg leading-relaxed max-w-sm">
                    Connectez-vous avec votre compte Crunchyroll pour accéder à tous nos animes.
                  </p>
                </div>

                {/* Error Alert */}
                {displayError && (
                  <div className="mb-8 p-4 bg-destructive/15 border border-destructive/30 rounded-xl backdrop-blur-sm animate-in">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-destructive/20 rounded-lg mt-0.5">
                        <Shield className="w-5 h-5 text-destructive" />
                      </div>
                      <p className="text-sm text-destructive font-semibold">{displayError}</p>
                    </div>
                  </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Email/Username Input */}
                  <div className="space-y-3">
                    <label htmlFor="username" className="text-sm font-bold text-foreground uppercase tracking-wider">
                      Email ou nom d'utilisateur
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-blue-600/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" />
                      <div className="relative flex items-center">
                        <Mail className="absolute left-4 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <input
                          id="username"
                          type="text"
                          placeholder="votre@email.com ou utilisateur"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          disabled={isLoading}
                          className={cn(
                            "w-full pl-12 pr-4 py-4 rounded-xl",
                            "bg-input/50 backdrop-blur-sm border border-border/50",
                            "text-foreground placeholder:text-muted-foreground/60",
                            "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent",
                            "transition-all duration-200 group-focus-within:border-primary/30",
                            "disabled:opacity-50 disabled:cursor-not-allowed",
                            "font-medium"
                          )}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Password Input */}
                  <div className="space-y-3">
                    <label htmlFor="password" className="text-sm font-bold text-foreground uppercase tracking-wider">
                      Mot de passe
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-blue-600/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" />
                      <div className="relative flex items-center">
                        <Lock className="absolute left-4 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          disabled={isLoading}
                          className={cn(
                            "w-full pl-12 pr-12 py-4 rounded-xl",
                            "bg-input/50 backdrop-blur-sm border border-border/50",
                            "text-foreground placeholder:text-muted-foreground/60",
                            "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent",
                            "transition-all duration-200 group-focus-within:border-primary/30",
                            "disabled:opacity-50 disabled:cursor-not-allowed",
                            "font-medium"
                          )}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 text-muted-foreground hover:text-primary transition-colors group-focus-within:text-primary"
                          disabled={isLoading}
                        >
                          {showPassword ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Remember Me & Forgot Password */}
                  <div className="flex items-center justify-between pt-2">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        className="w-5 h-5 rounded border-border/50 bg-input/50 accent-primary cursor-pointer"
                        defaultChecked
                      />
                      <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                        Se souvenir de moi
                      </span>
                    </label>
                    <a
                      href="https://www.crunchyroll.com/fr/forgot-password"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
                    >
                      Mot de passe oublié ?
                    </a>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading || !username || !password}
                    className={cn(
                      "w-full px-8 py-4 rounded-xl font-black text-base uppercase tracking-wider",
                      "bg-gradient-to-r from-primary via-primary to-orange-500",
                      "text-primary-foreground",
                      "hover:shadow-2xl hover:shadow-primary/50 transition-all duration-300",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                      "flex items-center justify-center gap-3",
                      "active:scale-95 transform",
                      "border border-primary/50"
                    )}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Connexion en cours...</span>
                      </>
                    ) : (
                      <>
                        <LogIn className="w-5 h-5" />
                        <span>Se connecter</span>
                      </>
                    )}
                  </button>
                </form>

                {/* Divider */}
                <div className="relative my-8">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border/30" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-4 bg-card text-muted-foreground text-xs font-bold uppercase tracking-wider">Ou</span>
                  </div>
                </div>

                {/* Create Account Section */}
                <div className="space-y-4">
                  <p className="text-center text-muted-foreground text-sm">
                    Vous n'avez pas de compte ?
                  </p>
                  <a
                    href="https://www.crunchyroll.com/fr/register"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "w-full px-8 py-4 rounded-xl font-bold text-base uppercase tracking-wider",
                      "bg-secondary/50 hover:bg-secondary/70 border border-secondary/50 hover:border-secondary",
                      "text-foreground transition-all duration-300",
                      "flex items-center justify-center gap-3",
                      "hover:shadow-lg"
                    )}
                  >
                    <span>Créer un compte</span>
                  </a>
                </div>

                {/* Security Info */}
                <div className="mt-8 pt-6 border-t border-border/30 space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                    <Shield className="w-5 h-5 text-blue-500 flex-shrink-0 mt-1" />
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-blue-500 uppercase tracking-wider">Sécurité</p>
                      <p className="text-xs text-blue-500/80">
                        Vos données sont chiffrées et communiquées directement à Crunchyroll. Nous ne stockons jamais vos identifiants.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Footer />
      </main>
    </>
  )
}


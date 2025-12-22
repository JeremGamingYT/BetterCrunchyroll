"use client"

import type React from "react"

import { useState } from "react"
import { Header } from "@/components/header"
import {
  Crown,
  CreditCard,
  Bell,
  Smartphone,
  Link2,
  Mail,
  Lock,
  Receipt,
  Settings,
  Globe,
  Volume2,
  AudioLines,
  Subtitles,
  Ear,
  ShieldAlert,
  ChevronRight,
  Check,
} from "lucide-react"
import { cn } from "@/lib/utils"

type SettingsSection =
  | "abonnement"
  | "preferences"
  | "notifications"
  | "appareils"
  | "apps"
  | "email"
  | "password"
  | "paiement"
  | "facturation"

const settingsSections = [
  { id: "abonnement", label: "Infos d'abonnement", icon: Crown },
  { id: "preferences", label: "Préférences", icon: Settings },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "appareils", label: "Gestion des appareils", icon: Smartphone },
  { id: "apps", label: "Apps connectées", icon: Link2 },
  { id: "email", label: "E-mail", icon: Mail },
  { id: "password", label: "Mot de passe", icon: Lock },
  { id: "paiement", label: "Informations de paiement", icon: CreditCard },
  { id: "facturation", label: "Historique de facturation", icon: Receipt },
] as const

const languages = [
  { code: "fr", label: "Français" },
  { code: "en", label: "English" },
  { code: "ja", label: "日本語" },
  { code: "es", label: "Español" },
  { code: "de", label: "Deutsch" },
  { code: "pt", label: "Português" },
  { code: "it", label: "Italiano" },
]

const audioLanguages = [
  { code: "ja", label: "Japonais" },
  { code: "en", label: "Anglais" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Allemand" },
  { code: "es", label: "Espagnol (Castillan)" },
  { code: "es-la", label: "Espagnol (Amérique Latine)" },
  { code: "pt", label: "Portugais (Brésil)" },
]

const subtitleLanguages = [
  { code: "fr", label: "Français" },
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "de", label: "Deutsch" },
  { code: "pt", label: "Português" },
  { code: "it", label: "Italiano" },
  { code: "ar", label: "العربية" },
  { code: "ru", label: "Русский" },
]

const contentRestrictions = [
  { id: "none", label: "Aucune restriction", description: "Tout le contenu est accessible" },
  { id: "teen", label: "Ados (13+)", description: "Contenu adapté aux adolescents" },
  { id: "mature", label: "Mature (16+)", description: "Exclut le contenu adulte" },
  { id: "all-ages", label: "Tout public", description: "Uniquement le contenu familial" },
]

export default function ParametresPage() {
  const [activeSection, setActiveSection] = useState<SettingsSection>("abonnement")

  // Preferences state
  const [displayLanguage, setDisplayLanguage] = useState("fr")
  const [audioLanguage, setAudioLanguage] = useState("ja")
  const [audioDescriptions, setAudioDescriptions] = useState(false)
  const [subtitleLanguage, setSubtitleLanguage] = useState("fr")
  const [subtitlesForDeaf, setSubtitlesForDeaf] = useState(false)
  const [contentRestriction, setContentRestriction] = useState("none")

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-24 pb-16 px-4 md:px-8 lg:px-12">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-foreground mb-8">Paramètres</h1>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar Navigation */}
            <aside className="lg:w-72 shrink-0">
              <nav className="bg-card rounded-xl border border-border overflow-hidden">
                {settingsSections.map((section, index) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id as SettingsSection)}
                    className={cn(
                      "flex items-center gap-3 w-full px-4 py-3.5 text-left transition-colors",
                      "hover:bg-secondary/50",
                      activeSection === section.id
                        ? "bg-primary/10 text-primary border-l-2 border-primary"
                        : "text-muted-foreground",
                      index !== settingsSections.length - 1 && "border-b border-border/50",
                    )}
                  >
                    <section.icon className="w-5 h-5" />
                    <span className="font-medium">{section.label}</span>
                    <ChevronRight
                      className={cn(
                        "w-4 h-4 ml-auto transition-transform",
                        activeSection === section.id && "text-primary",
                      )}
                    />
                  </button>
                ))}
              </nav>
            </aside>

            {/* Main Content */}
            <div className="flex-1">
              <div className="bg-card rounded-xl border border-border p-6">
                {activeSection === "abonnement" && <AbonnementSection />}
                {activeSection === "preferences" && (
                  <PreferencesSection
                    displayLanguage={displayLanguage}
                    setDisplayLanguage={setDisplayLanguage}
                    audioLanguage={audioLanguage}
                    setAudioLanguage={setAudioLanguage}
                    audioDescriptions={audioDescriptions}
                    setAudioDescriptions={setAudioDescriptions}
                    subtitleLanguage={subtitleLanguage}
                    setSubtitleLanguage={setSubtitleLanguage}
                    subtitlesForDeaf={subtitlesForDeaf}
                    setSubtitlesForDeaf={setSubtitlesForDeaf}
                    contentRestriction={contentRestriction}
                    setContentRestriction={setContentRestriction}
                  />
                )}
                {activeSection === "notifications" && <NotificationsSection />}
                {activeSection === "appareils" && <AppareilsSection />}
                {activeSection === "apps" && <AppsSection />}
                {activeSection === "email" && <EmailSection />}
                {activeSection === "password" && <PasswordSection />}
                {activeSection === "paiement" && <PaiementSection />}
                {activeSection === "facturation" && <FacturationSection />}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl font-semibold text-foreground mb-6">{children}</h2>
}

function AbonnementSection() {
  return (
    <div>
      <SectionTitle>Infos d'abonnement</SectionTitle>

      <div className="bg-gradient-to-r from-primary/20 to-primary/5 rounded-xl p-6 mb-6 border border-primary/30">
        <div className="flex items-center gap-3 mb-4">
          <Crown className="w-8 h-8 text-primary" />
          <div>
            <h3 className="text-lg font-bold text-foreground">Mega Fan</h3>
            <p className="text-sm text-muted-foreground">Abonnement annuel</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Prochaine facturation :</span>
            <p className="font-medium text-foreground">15 janvier 2025</p>
          </div>
          <div>
            <span className="text-muted-foreground">Montant :</span>
            <p className="font-medium text-foreground">79,99 € / an</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-medium text-foreground">Avantages inclus</h4>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-center gap-2">
            <Check className="w-4 h-4 text-primary" />
            Streaming sans publicité
          </li>
          <li className="flex items-center gap-2">
            <Check className="w-4 h-4 text-primary" />
            Accès à tout le catalogue
          </li>
          <li className="flex items-center gap-2">
            <Check className="w-4 h-4 text-primary" />
            Téléchargement hors ligne
          </li>
          <li className="flex items-center gap-2">
            <Check className="w-4 h-4 text-primary" />
            Streaming simultané sur 4 appareils
          </li>
        </ul>
      </div>

      <div className="mt-6 pt-6 border-t border-border flex flex-wrap gap-3">
        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors">
          Changer d'abonnement
        </button>
        <button className="px-4 py-2 bg-secondary text-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors">
          Annuler l'abonnement
        </button>
      </div>
    </div>
  )
}

function PreferencesSection({
  displayLanguage,
  setDisplayLanguage,
  audioLanguage,
  setAudioLanguage,
  audioDescriptions,
  setAudioDescriptions,
  subtitleLanguage,
  setSubtitleLanguage,
  subtitlesForDeaf,
  setSubtitlesForDeaf,
  contentRestriction,
  setContentRestriction,
}: {
  displayLanguage: string
  setDisplayLanguage: (v: string) => void
  audioLanguage: string
  setAudioLanguage: (v: string) => void
  audioDescriptions: boolean
  setAudioDescriptions: (v: boolean) => void
  subtitleLanguage: string
  setSubtitleLanguage: (v: string) => void
  subtitlesForDeaf: boolean
  setSubtitlesForDeaf: (v: boolean) => void
  contentRestriction: string
  setContentRestriction: (v: string) => void
}) {
  return (
    <div>
      <SectionTitle>Préférences</SectionTitle>

      <div className="space-y-6">
        {/* Langue d'affichage */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Globe className="w-4 h-4 text-primary" />
            Langue d'affichage
          </label>
          <select
            value={displayLanguage}
            onChange={(e) => setDisplayLanguage(e.target.value)}
            className="w-full md:w-72 px-4 py-2.5 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {languages.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        {/* Langue audio */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Volume2 className="w-4 h-4 text-primary" />
            Langue audio
          </label>
          <select
            value={audioLanguage}
            onChange={(e) => setAudioLanguage(e.target.value)}
            className="w-full md:w-72 px-4 py-2.5 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {audioLanguages.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        {/* Descriptions audio */}
        <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
          <div className="flex items-center gap-3">
            <AudioLines className="w-5 h-5 text-primary" />
            <div>
              <p className="font-medium text-foreground">Descriptions audio</p>
              <p className="text-sm text-muted-foreground">Narration pour les scènes visuelles</p>
            </div>
          </div>
          <ToggleSwitch checked={audioDescriptions} onChange={setAudioDescriptions} />
        </div>

        {/* Langue des sous-titres */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Subtitles className="w-4 h-4 text-primary" />
            Langue des sous-titres/SME
          </label>
          <select
            value={subtitleLanguage}
            onChange={(e) => setSubtitleLanguage(e.target.value)}
            className="w-full md:w-72 px-4 py-2.5 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {subtitleLanguages.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        {/* Sous-titres pour malentendants */}
        <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
          <div className="flex items-center gap-3">
            <Ear className="w-5 h-5 text-primary" />
            <div>
              <p className="font-medium text-foreground">Sous-titres pour malentendants</p>
              <p className="text-sm text-muted-foreground">Inclut les descriptions sonores et musicales</p>
            </div>
          </div>
          <ToggleSwitch checked={subtitlesForDeaf} onChange={setSubtitlesForDeaf} />
        </div>

        {/* Restriction de contenu */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-medium text-foreground">
            <ShieldAlert className="w-4 h-4 text-primary" />
            Restriction de contenu
          </label>
          <div className="grid gap-2">
            {contentRestrictions.map((restriction) => (
              <button
                key={restriction.id}
                onClick={() => setContentRestriction(restriction.id)}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-lg border transition-all text-left",
                  contentRestriction === restriction.id
                    ? "border-primary bg-primary/10"
                    : "border-border bg-secondary/30 hover:bg-secondary/50",
                )}
              >
                <div
                  className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0",
                    contentRestriction === restriction.id ? "border-primary bg-primary" : "border-muted-foreground",
                  )}
                >
                  {contentRestriction === restriction.id && <Check className="w-3 h-3 text-primary-foreground" />}
                </div>
                <div>
                  <p className="font-medium text-foreground">{restriction.label}</p>
                  <p className="text-sm text-muted-foreground">{restriction.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn("relative w-12 h-6 rounded-full transition-colors", checked ? "bg-primary" : "bg-muted")}
    >
      <span
        className={cn(
          "absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform",
          checked && "translate-x-6",
        )}
      />
    </button>
  )
}

function NotificationsSection() {
  const [emailNotifs, setEmailNotifs] = useState(true)
  const [pushNotifs, setPushNotifs] = useState(true)
  const [newEpisodes, setNewEpisodes] = useState(true)
  const [recommendations, setRecommendations] = useState(false)
  const [news, setNews] = useState(true)

  return (
    <div>
      <SectionTitle>Notifications</SectionTitle>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
          <div>
            <p className="font-medium text-foreground">Notifications par e-mail</p>
            <p className="text-sm text-muted-foreground">Recevoir des e-mails de Crunchyroll</p>
          </div>
          <ToggleSwitch checked={emailNotifs} onChange={setEmailNotifs} />
        </div>

        <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
          <div>
            <p className="font-medium text-foreground">Notifications push</p>
            <p className="text-sm text-muted-foreground">Sur vos appareils mobiles</p>
          </div>
          <ToggleSwitch checked={pushNotifs} onChange={setPushNotifs} />
        </div>

        <div className="h-px bg-border my-4" />

        <h4 className="font-medium text-foreground mb-3">Types de notifications</h4>

        <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
          <div>
            <p className="font-medium text-foreground">Nouveaux épisodes</p>
            <p className="text-sm text-muted-foreground">Quand un anime de ma watchlist a un nouvel épisode</p>
          </div>
          <ToggleSwitch checked={newEpisodes} onChange={setNewEpisodes} />
        </div>

        <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
          <div>
            <p className="font-medium text-foreground">Recommandations</p>
            <p className="text-sm text-muted-foreground">Suggestions basées sur mes préférences</p>
          </div>
          <ToggleSwitch checked={recommendations} onChange={setRecommendations} />
        </div>

        <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
          <div>
            <p className="font-medium text-foreground">Actualités et événements</p>
            <p className="text-sm text-muted-foreground">Annonces et événements spéciaux</p>
          </div>
          <ToggleSwitch checked={news} onChange={setNews} />
        </div>
      </div>
    </div>
  )
}

function AppareilsSection() {
  const devices = [
    { id: 1, name: "MacBook Pro", type: "Navigateur web", lastActive: "Actif maintenant", current: true },
    { id: 2, name: "iPhone 15 Pro", type: "Application iOS", lastActive: "Il y a 2 heures", current: false },
    { id: 3, name: "Samsung Smart TV", type: "Application TV", lastActive: "Il y a 3 jours", current: false },
    { id: 4, name: "iPad Air", type: "Application iOS", lastActive: "Il y a 1 semaine", current: false },
  ]

  return (
    <div>
      <SectionTitle>Gestion des appareils</SectionTitle>

      <p className="text-muted-foreground mb-6">
        Vous pouvez utiliser jusqu'à 4 appareils simultanément avec votre abonnement Mega Fan.
      </p>

      <div className="space-y-3">
        {devices.map((device) => (
          <div
            key={device.id}
            className={cn(
              "flex items-center justify-between p-4 rounded-lg border",
              device.current ? "bg-primary/10 border-primary/30" : "bg-secondary/50 border-border",
            )}
          >
            <div className="flex items-center gap-4">
              <Smartphone className="w-8 h-8 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">
                  {device.name}
                  {device.current && (
                    <span className="ml-2 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                      Cet appareil
                    </span>
                  )}
                </p>
                <p className="text-sm text-muted-foreground">{device.type}</p>
                <p className="text-xs text-muted-foreground">{device.lastActive}</p>
              </div>
            </div>
            {!device.current && (
              <button className="px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                Déconnecter
              </button>
            )}
          </div>
        ))}
      </div>

      <button className="mt-6 px-4 py-2 text-destructive border border-destructive rounded-lg hover:bg-destructive/10 transition-colors">
        Déconnecter tous les appareils
      </button>
    </div>
  )
}

function AppsSection() {
  const apps = [
    { id: 1, name: "Discord", connected: true, connectedAt: "15 mars 2024" },
    { id: 2, name: "PlayStation Network", connected: true, connectedAt: "22 janvier 2024" },
    { id: 3, name: "Xbox Live", connected: false, connectedAt: null },
    { id: 4, name: "Nintendo Account", connected: false, connectedAt: null },
  ]

  return (
    <div>
      <SectionTitle>Apps connectées</SectionTitle>

      <p className="text-muted-foreground mb-6">Gérez les services tiers liés à votre compte Crunchyroll.</p>

      <div className="space-y-3">
        {apps.map((app) => (
          <div
            key={app.id}
            className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg border border-border"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                <Link2 className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-foreground">{app.name}</p>
                {app.connected && <p className="text-sm text-muted-foreground">Connecté le {app.connectedAt}</p>}
              </div>
            </div>
            <button
              className={cn(
                "px-4 py-2 rounded-lg font-medium transition-colors",
                app.connected
                  ? "text-destructive hover:bg-destructive/10"
                  : "bg-primary text-primary-foreground hover:bg-primary/90",
              )}
            >
              {app.connected ? "Déconnecter" : "Connecter"}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function EmailSection() {
  const [email, setEmail] = useState("utilisateur@example.com")
  const [newEmail, setNewEmail] = useState("")

  return (
    <div>
      <SectionTitle>E-mail</SectionTitle>

      <div className="space-y-6">
        <div>
          <label className="text-sm font-medium text-muted-foreground">E-mail actuel</label>
          <p className="text-foreground font-medium mt-1">{email}</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Nouvel e-mail</label>
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="Entrez votre nouvel e-mail"
            className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <button className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors">
          Mettre à jour l'e-mail
        </button>
      </div>
    </div>
  )
}

function PasswordSection() {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  return (
    <div>
      <SectionTitle>Mot de passe</SectionTitle>

      <div className="space-y-4 max-w-md">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Mot de passe actuel</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Nouveau mot de passe</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Confirmer le nouveau mot de passe</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <button className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors">
          Changer le mot de passe
        </button>
      </div>
    </div>
  )
}

function PaiementSection() {
  return (
    <div>
      <SectionTitle>Informations de paiement</SectionTitle>

      <div className="bg-secondary/50 rounded-lg p-4 border border-border mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-8 bg-gradient-to-r from-blue-600 to-blue-800 rounded flex items-center justify-center">
            <span className="text-white text-xs font-bold">VISA</span>
          </div>
          <div>
            <p className="font-medium text-foreground">•••• •••• •••• 4242</p>
            <p className="text-sm text-muted-foreground">Expire 12/2026</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors">
          Modifier la carte
        </button>
        <button className="px-4 py-2 bg-secondary text-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors">
          Ajouter une carte
        </button>
      </div>
    </div>
  )
}

function FacturationSection() {
  const invoices = [
    { id: 1, date: "15 déc. 2024", amount: "79,99 €", status: "Payé", description: "Abonnement Mega Fan - Annuel" },
    { id: 2, date: "15 déc. 2023", amount: "79,99 €", status: "Payé", description: "Abonnement Mega Fan - Annuel" },
    { id: 3, date: "15 déc. 2022", amount: "69,99 €", status: "Payé", description: "Abonnement Premium - Annuel" },
  ]

  return (
    <div>
      <SectionTitle>Historique de facturation</SectionTitle>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Date</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Description</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Montant</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Statut</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Action</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="border-b border-border/50">
                <td className="py-3 px-4 text-sm text-foreground">{invoice.date}</td>
                <td className="py-3 px-4 text-sm text-foreground">{invoice.description}</td>
                <td className="py-3 px-4 text-sm text-foreground">{invoice.amount}</td>
                <td className="py-3 px-4">
                  <span className="text-xs bg-green-500/20 text-green-500 px-2 py-1 rounded">{invoice.status}</span>
                </td>
                <td className="py-3 px-4 text-right">
                  <button className="text-sm text-primary hover:underline">Télécharger</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

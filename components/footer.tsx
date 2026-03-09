import { cn } from "@/lib/utils"
import { Facebook, Twitter, Instagram, Youtube, Share2 } from "lucide-react"
import { BetterCrLogo } from "@/components/bettercr-logo"

const footerLinks = [
  {
    title: "Navigation",
    links: ["Populaire", "Nouveau", "Alphabétique", "Simulcast", "Calendrier de sortie", "Clips musicaux et concerts"],
  },
  {
    title: "Découvrir",
    links: ["Jeux", "Manga", "Boutique", "News", "Premium"],
  },
  {
    title: "À propos",
    links: [
      "À propos de nous",
      "Aide/FAQ",
      "Conditions d'utilisation",
      "Politique de confidentialité",
      "Accessibilité",
    ],
  },
  {
    title: "Connect",
    links: ["Nous contacter", "Carrières", "Presse"],
  },
]

export function Footer() {
  return (
    <footer className="mt-10 bg-black text-white">
      <div className="px-4 md:px-8 lg:px-12 py-14 md:py-16 max-w-7xl">
        <a href="/" className="inline-flex items-center group mb-8">
          <BetterCrLogo className="transition-transform duration-200 group-hover:scale-[1.02]" />
        </a>

        <p className="text-sm text-white/58 max-w-2xl mb-10">
          Une interface anime repensée dans un langage visuel plus cinématographique, plus sobre et plus proche d'un service de streaming premium.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-10 mb-10">
          <div>
            <h3 className="text-sm font-semibold text-white/72 mb-4">Navigation</h3>
            <ul className="space-y-3">
              {footerLinks[0].links.map((link) => (
                <li key={link}>
                  <a href="#" className="text-sm text-white/58 hover:text-white transition-colors duration-200">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          {footerLinks.slice(1).map((section) => (
            <div key={section.title}>
              <h3 className="text-sm font-semibold text-white/72 mb-4">{section.title}</h3>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="text-sm text-white/58 hover:text-white transition-colors duration-200">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-4 mb-8">
            {[
              { label: "Facebook", icon: Facebook, href: "#" },
              { label: "Twitter", icon: Twitter, href: "#" },
              { label: "Instagram", icon: Instagram, href: "#" },
              { label: "YouTube", icon: Youtube, href: "#" },
              { label: "TikTok", icon: Share2, href: "#" } // Using Share2 as placeholder for TikTok if not available in this version
            ].map((social) => (
              <a
                key={social.label}
                href={social.href}
                className={cn(
                  "w-10 h-10 rounded-sm bg-transparent border border-white/14 flex items-center justify-center",
                  "text-white/68 hover:text-white hover:border-white/28",
                  "transition-all duration-200",
                )}
              >
                <span className="sr-only">{social.label}</span>
                <social.icon className="w-5 h-5" />
              </a>
            ))}
        </div>

        <button className="mb-8 px-4 py-2 text-sm text-white/68 border border-white/24 hover:text-white hover:border-white/38 transition-colors duration-200">
          Code de service
        </button>

        <div className="flex flex-wrap items-center gap-4 text-sm text-white/45">
          <a href="#" className="hover:text-white/70 transition-colors duration-200">Français</a>
          <span>•</span>
          <span>© 2026 BetterCrunchyroll</span>
        </div>
      </div>
    </footer>
  )
}

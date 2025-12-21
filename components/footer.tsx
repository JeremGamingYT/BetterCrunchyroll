import { cn } from "@/lib/utils"

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
    <footer className="bg-card border-t border-border">
      <div className="px-4 md:px-8 lg:px-12 py-12">
        {/* Logo and Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
          {/* Logo */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1 mb-4 lg:mb-0">
            <a href="#" className="flex items-center gap-2 group mb-4">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                <span className="text-primary-foreground font-bold text-lg">C</span>
              </div>
              <span className="text-primary font-bold text-2xl transition-colors duration-300 group-hover:text-primary/80">
                Crunchyroll
              </span>
            </a>
            <p className="text-sm text-muted-foreground max-w-xs">
              La destination ultime pour les fans d'anime. Regardez les meilleurs anime en streaming.
            </p>
          </div>

          {/* Links */}
          {footerLinks.map((section) => (
            <div key={section.title}>
              <h3 className="font-semibold text-foreground mb-4">{section.title}</h3>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-muted-foreground hover:text-primary transition-colors duration-300"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Social Links */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-8 border-t border-border">
          <div className="flex items-center gap-4">
            {["Facebook", "Twitter", "Instagram", "YouTube", "TikTok"].map((social) => (
              <a
                key={social}
                href="#"
                className={cn(
                  "w-10 h-10 rounded-full bg-secondary flex items-center justify-center",
                  "text-muted-foreground hover:text-primary hover:bg-primary/10",
                  "transition-all duration-300 hover:scale-110",
                )}
              >
                <span className="sr-only">{social}</span>
                <span className="text-xs font-bold">{social[0]}</span>
              </a>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors duration-300">
              Français
            </a>
            <span className="text-muted-foreground">|</span>
            <span className="text-sm text-muted-foreground">© 2025 Crunchyroll</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

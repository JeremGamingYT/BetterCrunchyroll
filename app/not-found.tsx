import Link from "next/link"
import { Home, Search } from "lucide-react"

export default function NotFound() {
  return (
    <main className="not-found-page">
      <section className="not-found-panel" aria-labelledby="not-found-title">
        <div className="not-found-anime-gif" aria-hidden="true">
          <span className="not-found-spark not-found-spark--one" />
          <span className="not-found-spark not-found-spark--two" />
          <span className="not-found-character" />
        </div>

        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-orange-300/80">Erreur 404</p>
        <h1 id="not-found-title" className="mt-3 text-4xl font-black text-white md:text-6xl">
          Page introuvable
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-white/62 md:text-base">
          Ce contenu n'est plus disponible ou l'adresse ne correspond a aucune page BetterCrunchyroll.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex h-11 items-center gap-2 rounded-md bg-orange-400 px-5 text-sm font-bold text-black transition hover:bg-orange-300"
          >
            <Home className="h-4 w-4" />
            Accueil
          </Link>
          <Link
            href="/search"
            className="inline-flex h-11 items-center gap-2 rounded-md border border-white/14 bg-white/6 px-5 text-sm font-semibold text-white transition hover:border-orange-300/50 hover:bg-white/10"
          >
            <Search className="h-4 w-4" />
            Rechercher
          </Link>
        </div>
      </section>
    </main>
  )
}

"use client"

import { useState, useEffect, useCallback } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { AnimeCard } from "@/components/anime-card"
import { useSearchAnime } from "@/hooks/use-combined-anime"
import { cn } from "@/lib/utils"
import { Search, Loader2, X, SlidersHorizontal } from "lucide-react"

const GENRES = [
  "Action",
  "Adventure",
  "Comedy",
  "Drama",
  "Fantasy",
  "Horror",
  "Mystery",
  "Romance",
  "Sci-Fi",
  "Slice of Life",
  "Sports",
  "Supernatural",
  "Thriller",
]

const YEARS = Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - i)

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  const { data: searchResults, isLoading } = useSearchAnime(debouncedQuery, 1, 50)

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  // Filter results
  const filteredResults = searchResults?.filter((anime) => {
    if (selectedGenres.length > 0 && !selectedGenres.some((g) => anime.genres.includes(g))) {
      return false
    }
    if (selectedYear && anime.year !== selectedYear) {
      return false
    }
    return true
  })

  const toggleGenre = useCallback((genre: string) => {
    setSelectedGenres((prev) => (prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]))
  }, [])

  const clearFilters = useCallback(() => {
    setSelectedGenres([])
    setSelectedYear(null)
  }, [])

  const hasFilters = selectedGenres.length > 0 || selectedYear !== null

  return (
    <main className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="relative pt-16">
        <div className="h-[280px] bg-gradient-to-br from-primary/20 via-background to-background relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
          <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6">Rechercher</h1>

            {/* Search Input */}
            <div className="w-full max-w-2xl relative">
              <div className="flex items-center gap-3 bg-card border border-border rounded-2xl px-5 py-4 shadow-lg">
                <Search className="w-6 h-6 text-muted-foreground flex-shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher un anime, un genre, un studio..."
                  className="flex-1 bg-transparent text-lg text-foreground placeholder:text-muted-foreground focus:outline-none"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Filters Section */}
      <section className="px-4 md:px-8 lg:px-12 py-6 border-b border-border">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                showFilters
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground",
              )}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filtres
              {hasFilters && (
                <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-primary-foreground/20">
                  {selectedGenres.length + (selectedYear ? 1 : 0)}
                </span>
              )}
            </button>

            {hasFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Effacer les filtres
              </button>
            )}
          </div>

          {debouncedQuery && (
            <p className="text-sm text-muted-foreground">
              {isLoading ? (
                "Recherche en cours..."
              ) : (
                <>
                  {filteredResults?.length || 0} résultat{(filteredResults?.length || 0) > 1 ? "s" : ""} pour "
                  {debouncedQuery}"
                </>
              )}
            </p>
          )}
        </div>

        {/* Filters Panel */}
        <div
          className={cn(
            "overflow-hidden transition-all duration-300",
            showFilters ? "max-h-[500px] opacity-100 mt-6" : "max-h-0 opacity-0",
          )}
        >
          <div className="space-y-6">
            {/* Genres */}
            <div>
              <h3 className="text-sm font-medium text-foreground mb-3">Genres</h3>
              <div className="flex flex-wrap gap-2">
                {GENRES.map((genre) => (
                  <button
                    key={genre}
                    onClick={() => toggleGenre(genre)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                      selectedGenres.includes(genre)
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80",
                    )}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>

            {/* Year */}
            <div>
              <h3 className="text-sm font-medium text-foreground mb-3">Année</h3>
              <div className="flex flex-wrap gap-2">
                {YEARS.slice(0, 15).map((year) => (
                  <button
                    key={year}
                    onClick={() => setSelectedYear(selectedYear === year ? null : year)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                      selectedYear === year
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80",
                    )}
                  >
                    {year}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="px-4 md:px-8 lg:px-12 py-8 pb-16">
        {!debouncedQuery ? (
          <div className="text-center py-20">
            <Search className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-lg text-muted-foreground">Commencez à taper pour rechercher des anime</p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
          </div>
        ) : filteredResults && filteredResults.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-8">
            {filteredResults.map((anime, index) => (
              <AnimeCard key={anime.id} anime={anime} index={index} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-lg text-muted-foreground">Aucun résultat trouvé pour "{debouncedQuery}"</p>
            {hasFilters && (
              <button onClick={clearFilters} className="mt-4 text-primary hover:underline">
                Essayer sans filtres
              </button>
            )}
          </div>
        )}
      </section>

      <Footer />
    </main>
  )
}

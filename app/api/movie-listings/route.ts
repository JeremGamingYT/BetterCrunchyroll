import { NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

type LocalSeriesRecord = {
  id: string
  title: string
  slug_title?: string
  keywords?: string[]
  images?: unknown
  description?: string
  maturity_ratings?: string[]
  content_descriptors?: string[]
  availability_status?: string
  series_launch_year?: number
  is_dubbed?: boolean
  is_subbed?: boolean
  episode_count?: number
  season_count?: number
}

let cachedMovieListings: LocalSeriesRecord[] | null = null
let cachedAt = 0
const CACHE_TTL = 1000 * 60 * 10

function isMovieCandidate(series: LocalSeriesRecord) {
  const title = `${series.title || ""} ${series.slug_title || ""}`.toLowerCase()
  const keywords = (series.keywords || []).map((keyword) => keyword.toLowerCase())

  return keywords.includes("movie") || /\bmovie(s)?\b|\bfilm(s)?\b/.test(title)
}

async function loadLocalMovieListings(): Promise<LocalSeriesRecord[]> {
  if (cachedMovieListings && Date.now() - cachedAt < CACHE_TTL) {
    return cachedMovieListings
  }

  const seriesRoot = path.join(process.cwd(), "Data", "series")
  const entries = await fs.readdir(seriesRoot, { withFileTypes: true })
  const listings: LocalSeriesRecord[] = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue

    try {
      const filePath = path.join(seriesRoot, entry.name, "series.json")
      const raw = await fs.readFile(filePath, "utf-8")
      const parsed = JSON.parse(raw)
      const record = (parsed?.data?.[0] || null) as LocalSeriesRecord | null

      if (record && isMovieCandidate(record)) {
        listings.push(record)
      }
    } catch {
      // Ignore unreadable local cache entries.
    }
  }

  listings.sort((left, right) => {
    const yearDelta = (right.series_launch_year || 0) - (left.series_launch_year || 0)
    if (yearDelta !== 0) return yearDelta
    return left.title.localeCompare(right.title, "fr")
  })

  cachedMovieListings = listings
  cachedAt = Date.now()
  return listings
}

export async function GET(request: NextRequest) {
  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get("limit") || "24"), 1), 100)
  const offset = Math.max(Number(request.nextUrl.searchParams.get("offset") || "0"), 0)

  try {
    const listings = await loadLocalMovieListings()
    return NextResponse.json({
      data: listings.slice(offset, offset + limit),
      total: listings.length,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load local movie listings" },
      { status: 500 },
    )
  }
}
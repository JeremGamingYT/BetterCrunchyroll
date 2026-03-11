// API Route: Serve pre-cached episode data from local Data/series/ files
// Falls back to an empty array if the series / season files are not present.
// Path traversal is prevented by validating the series ID format.

import { NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"

// Only allow known Crunchyroll ID formats (uppercase alphanumeric, 9–12 chars)
const SERIES_ID_RE = /^[A-Z0-9]{4,20}$/

export async function GET(request: NextRequest) {
    const id = request.nextUrl.searchParams.get("id")

    if (!id) {
        return NextResponse.json({ error: "Missing id parameter" }, { status: 400 })
    }

    // Security: reject ids that don't look like real Crunchyroll series IDs
    if (!SERIES_ID_RE.test(id)) {
        return NextResponse.json({ error: "Invalid series id format" }, { status: 400 })
    }

    const dataDir = path.join(process.cwd(), "Data", "series", id)
    const seasonsDir = path.join(dataDir, "seasons")

    try {
        // Read all season files in the seasons/ subdirectory
        let seasonFiles: string[] = []
        try {
            const entries = await fs.readdir(seasonsDir)
            seasonFiles = entries.filter((f) => f.startsWith("season_") && f.endsWith(".json"))
        } catch {
            // seasons/ dir doesn't exist or no files → return empty
            return NextResponse.json([])
        }

        if (seasonFiles.length === 0) {
            return NextResponse.json([])
        }

        // Collect all episodes from every season file; deduplicate by episode id
        const seen = new Set<string>()
        const allEpisodes: unknown[] = []

        for (const file of seasonFiles) {
            try {
                const raw = await fs.readFile(path.join(seasonsDir, file), "utf-8")
                const parsed = JSON.parse(raw)
                const episodes: Record<string, unknown>[] = parsed?.data || parsed?.items || []
                for (const ep of episodes) {
                    const epId = ep.id as string | undefined
                    if (epId && seen.has(epId)) continue
                    if (epId) seen.add(epId)
                    allEpisodes.push(ep)
                }
            } catch {
                // Skip unreadable files
            }
        }

        // Sort by season_number then sequence_number so the order is predictable
        allEpisodes.sort((a: any, b: any) => {
            const sa = a.season_number ?? 0
            const sb = b.season_number ?? 0
            if (sa !== sb) return sa - sb
            return (a.sequence_number ?? 0) - (b.sequence_number ?? 0)
        })

        return NextResponse.json(allEpisodes)
    } catch {
        return NextResponse.json([])
    }
}

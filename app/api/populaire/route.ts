// API Route: Récupérer les animés populaires (Crunchyroll + AniList)
// Combine les ratings pour un vrai score de popularité

import { NextResponse, NextRequest } from 'next/server'

const CRUNCHYROLL_API = "https://beta-api.crunchyroll.com"
const CRUNCHYROLL_BASIC_AUTH = "eHVuaWh2ZWRidDNtYmlzdWhldnQ6MWtJUzVkeVR2akUwX3JxYUEzWWVBaDBiVVhVbXhXMTE="
const ANILIST_API = "https://graphql.anilist.co"

interface TokenResponse {
  access_token: string
  expires_in: number
}

interface CrunchyrollRating {
  average?: string
  total?: string | number
}

interface AniListData {
  id: number
  title?: { english?: string; native?: string }
  meanScore?: number
  popularity?: number
}

// Token cache
let cachedToken: string | null = null
let tokenExpiry = 0
const TOKEN_CACHE_DURATION = 1000 * 60 * 50 // 50 minutes

// Generate random ETP ID
function generateEtpId() {
    const chars = 'abcdef0123456789'
    let result = ''
    for (let i = 0; i < 32; i++) {
        result += chars[Math.floor(Math.random() * chars.length)]
    }
    return result
}

// Get access token
async function getAccessToken(): Promise<string> {
    if (cachedToken && Date.now() < tokenExpiry) {
        return cachedToken
    }

    const etpId = generateEtpId()
    const response = await fetch(`${CRUNCHYROLL_API}/auth/v1/token`, {
        method: "POST",
        headers: {
            "Authorization": `Basic ${CRUNCHYROLL_BASIC_AUTH}`,
            "ETP-Anonymous-ID": etpId,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_id",
    })

    if (!response.ok) {
        throw new Error(`Token request failed: ${response.status}`)
    }

    const data = (await response.json()) as TokenResponse
    cachedToken = data.access_token
    tokenExpiry = Date.now() + (data.expires_in * 1000) - 30000

    return cachedToken
}

// Get series from Crunchyroll (with pagination)
async function getCrunchyrollPopular(token: string, limit: number = 50, offset: number = 0) {
    const url = new URL(`${CRUNCHYROLL_API}/content/v2/discover/browse`)
    url.searchParams.append('sort_by', 'popularity')
    url.searchParams.append('limit', limit.toString())
    url.searchParams.append('offset', offset.toString())
    url.searchParams.append('locale', 'en-US')
    url.searchParams.append('ratings', 'true')

    const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Accept": "application/json",
        },
    })

    if (!response.ok) {
        console.error(`[API] Crunchyroll response: ${response.status}`)
        const errorText = await response.text()
        console.error(`[API] Response body:`, errorText.substring(0, 200))
        throw new Error(`Crunchyroll API error: ${response.status}`)
    }

    const data = (await response.json()) as { data?: unknown[] }
    return data.data || []
}

// Get AniList data for a series
async function getAniListData(seriesTitle: string): Promise<AniListData | null> {
    const query = `
        query ($search: String) {
            Media(search: $search, type: ANIME) {
                id
                idMal
                title {
                    english
                    native
                }
                meanScore
                popularity
                studios(isMain: true) {
                    nodes {
                        name
                    }
                }
                status
                format
                episodes
            }
        }
    `

    try {
        const response = await fetch(ANILIST_API, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            body: JSON.stringify({
                query,
                variables: {
                    search: seriesTitle,
                },
            }),
        })

        if (!response.ok) {
            return null
        }

        const data = (await response.json()) as { data?: { Media?: AniListData } }
        return data.data?.Media || null
    } catch (error) {
        console.error(`AniList error for ${seriesTitle}:`, error)
        return null
    }
}

// Combine ratings from Crunchyroll and AniList
function combineRatings(crunchyrollRating: CrunchyrollRating | undefined, anilistScore: number | undefined): number {
    const crunchyScore = parseFloat(crunchyrollRating?.average || "0") / 2 // Convert 0-10 to 0-5
    const anilistScoreNormalized = (parseFloat(String(anilistScore || 0)) || 0) / 20 // Convert 0-100 to 0-5

    // Pondération: 60% Crunchyroll (utilisateurs), 40% AniList
    const combinedScore = (crunchyScore * 0.6 + anilistScoreNormalized * 0.4)
    return Math.round(combinedScore * 100) / 100 // Round to 2 decimals
}

// Calculate a popularity score
function calculatePopularityScore(crunchyrollRating: CrunchyrollRating | undefined, anilistData: AniListData | null | undefined): number {
    // Total votes/popularity
    const crunchyTotal = parseInt(String(crunchyrollRating?.total || 0))
    const anilistPopularity = parseInt(String(anilistData?.popularity || 0))

    // Combined popularity (weighted)
    const totalScore = (crunchyTotal * 0.3) + (anilistPopularity * 5) // AniList popularity is smaller

    return totalScore
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    let limit = parseInt(searchParams.get('limit') || '500') // Increased to fetch more
    let offset = parseInt(searchParams.get('offset') || '0')
    const sortBy = searchParams.get('sortBy') || 'combined' // 'combined', 'crunchyroll', 'anilist', 'popularity'

    // Cap limit at 500 to avoid too much data
    limit = Math.min(limit, 500)

    try {
        // Step 1: Get token from Crunchyroll
        const token = await getAccessToken()

        // Step 2: Get popular series from Crunchyroll (with pagination)
        console.log(`[API] Fetching popular series from Crunchyroll (limit: ${limit}, offset: ${offset})...`)
        const crunchyrollSeries = (await getCrunchyrollPopular(token, limit, offset)) as Array<{
            id: string
            title: string
            description: string
            images: unknown
            rating?: CrunchyrollRating
            maturity_ratings?: string[]
            channel_id?: string
        }>

        if (!crunchyrollSeries.length) {
            return NextResponse.json(
                { error: 'No series found on Crunchyroll' },
                { status: 404 }
            )
        }

        // Step 3: Enrich with AniList data
        console.log(`[API] Enriching ${crunchyrollSeries.length} series with AniList data...`)
        const enrichedSeries = await Promise.all(
            crunchyrollSeries.map(async (series) => {
                try {
                    const anilistData = await getAniListData(series.title)

                    return {
                        id: series.id,
                        title: series.title,
                        description: series.description,
                        images: series.images,
                        crunchyroll: {
                            rating: series.rating,
                            maturityRatings: series.maturity_ratings,
                            channel: series.channel_id,
                        },
                        anilist: anilistData || null,
                        combined: {
                            score: combineRatings(series.rating, anilistData?.meanScore),
                            popularityScore: calculatePopularityScore(series.rating, anilistData),
                        },
                        metadata: {
                            timestamp: new Date().toISOString(),
                            source: ['crunchyroll', 'anilist'],
                        },
                    }
                } catch (error) {
                    console.error(`Error enriching series ${series.id}:`, error)
                    return {
                        id: series.id,
                        title: series.title,
                        description: series.description,
                        images: series.images,
                        crunchyroll: {
                            rating: series.rating,
                            maturityRatings: series.maturity_ratings,
                            channel: series.channel_id,
                        },
                        anilist: null,
                        combined: {
                            score: parseFloat(String(series.rating?.average || 0)) / 2,
                            popularityScore: parseInt(String(series.rating?.total || 0)),
                        },
                        metadata: {
                            timestamp: new Date().toISOString(),
                            source: ['crunchyroll'],
                        },
                    }
                }
            })
        )

        // Step 4: Sort by requested parameter
        console.log(`[API] Sorting by: ${sortBy}`)
        let sortedSeries = [...enrichedSeries]

        switch (sortBy) {
            case 'combined':
                sortedSeries.sort((a, b) => b.combined.popularityScore - a.combined.popularityScore)
                break
            case 'crunchyroll':
                sortedSeries.sort((a, b) => {
                    const scoreA = parseFloat(String(a.crunchyroll.rating?.average || 0))
                    const scoreB = parseFloat(String(b.crunchyroll.rating?.average || 0))
                    return scoreB - scoreA
                })
                break
            case 'anilist':
                sortedSeries.sort((a, b) => {
                    const scoreA = a.anilist?.meanScore || 0
                    const scoreB = b.anilist?.meanScore || 0
                    return scoreB - scoreA
                })
                break
            case 'popularity':
                sortedSeries.sort((a, b) => {
                    const totalA = parseInt(String(a.crunchyroll.rating?.total || 0))
                    const totalB = parseInt(String(b.crunchyroll.rating?.total || 0))
                    return totalB - totalA
                })
                break
        }

        return NextResponse.json({
            total: sortedSeries.length,
            sortBy,
            data: sortedSeries,
            metadata: {
                timestamp: new Date().toISOString(),
                source: ['crunchyroll', 'anilist'],
                apiVersion: '1.0',
            },
        })

    } catch (error) {
        console.error('[API] Error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        )
    }
}

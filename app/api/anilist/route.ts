import { NextRequest, NextResponse } from 'next/server'
import { getServerCache, serverCacheKey, setServerCache } from '@/lib/server-cache'

const ANILIST_API = 'https://graphql.anilist.co'
const ANILIST_CACHE_TTL_SECONDS = 60 * 60 * 24 * 7

/**
 * AniList GraphQL API Proxy
 * Bypasses CORS restrictions when running in iframe context
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const cacheKey = serverCacheKey('anilist', body)
        const cached = await getServerCache(cacheKey)

        if (cached) {
            return NextResponse.json(cached, {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'X-BetterCrunchyroll-Cache': 'HIT',
                },
            })
        }

        const response = await fetch(ANILIST_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(body),
        })

        const data = await response.json()
        if (response.ok && !data?.errors) {
            await setServerCache(cacheKey, data, ANILIST_CACHE_TTL_SECONDS)
        }

        return NextResponse.json(data, {
            status: response.status,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'X-BetterCrunchyroll-Cache': 'MISS',
            },
        })
    } catch (error) {
        console.error('[AniList Proxy] Error:', error)
        return NextResponse.json(
            { errors: [{ message: 'Proxy request failed' }] },
            { status: 500 }
        )
    }
}

/**
 * Handle CORS preflight requests
 */
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    })
}

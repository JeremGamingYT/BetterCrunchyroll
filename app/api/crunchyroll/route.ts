// API Route: Proxy for Crunchyroll API calls
// This route bypasses CORS by making requests server-side

const CRUNCHYROLL_API = "https://www.crunchyroll.com"
const CRUNCHYROLL_BASIC_AUTH = "eHVuaWh2ZWRidDNtYmlzdWhldnQ6MWtJUzVkeVR2akUwX3JxYUEzWWVBaDBiVVhVbXhXMTE="

// Token cache (in-memory for server)
let cachedToken: { accessToken: string; timestamp: number } | null = null
const TOKEN_CACHE_DURATION = 1000 * 60 * 50 // 50 minutes

// Generate random ETP ID
function generateEtpId(): string {
    const chars = 'abcdef0123456789'
    let result = ''
    for (let i = 0; i < 32; i++) {
        result += chars[Math.floor(Math.random() * chars.length)]
    }
    return result
}

// Get access token from Crunchyroll
async function getAccessToken(): Promise<string> {
    // Check cache
    if (cachedToken && Date.now() - cachedToken.timestamp < TOKEN_CACHE_DURATION) {
        return cachedToken.accessToken
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

    const data = await response.json()

    cachedToken = {
        accessToken: data.access_token,
        timestamp: Date.now(),
    }

    return data.access_token
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const endpoint = searchParams.get('endpoint')

    if (!endpoint) {
        return Response.json({ error: 'Missing endpoint parameter' }, { status: 400 })
    }

    try {
        const token = await getAccessToken()

        // Build the full URL with query params
        const url = new URL(`${CRUNCHYROLL_API}${endpoint}`)

        // Forward all other query params except 'endpoint'
        searchParams.forEach((value, key) => {
            if (key !== 'endpoint') {
                url.searchParams.append(key, value)
            }
        })

        const response = await fetch(url.toString(), {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Accept": "application/json",
            },
        })

        if (!response.ok) {
            return Response.json(
                { error: `Crunchyroll API error: ${response.status}` },
                { status: response.status }
            )
        }

        const data = await response.json()
        return Response.json(data)
    } catch (error) {
        console.error('[API] Crunchyroll proxy error:', error)
        return Response.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        )
    }
}

export async function POST(request: Request) {
    try {
        // This endpoint is used to get a fresh token
        const token = await getAccessToken()
        return Response.json({ access_token: token })
    } catch (error) {
        console.error('[API] Token request error:', error)
        return Response.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        )
    }
}

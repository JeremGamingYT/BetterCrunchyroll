import { NextRequest, NextResponse } from "next/server"

// Crunchyroll API endpoints
const CR_AUTH_URL = "https://www.crunchyroll.com/auth/v1/token"
const CR_PROFILE_URL = "https://www.crunchyroll.com/accounts/v1/me/profile"

// xunihvedbt3mbisuhevt – the ETP client that supports grant_type=password.
// noaihdevm_6iyg0a8l0q is the web PKCE client (returns 400 unsupported_grant_type for password flow).
const BASIC_AUTH = process.env.CRUNCHYROLL_CLIENT_ID && process.env.CRUNCHYROLL_CLIENT_SECRET
  ? Buffer.from(`${process.env.CRUNCHYROLL_CLIENT_ID}:${process.env.CRUNCHYROLL_CLIENT_SECRET}`).toString("base64")
  : "eHVuaWh2ZWRidDNtYmlzdWhldnQ6MWtJUzVkeVR2akUwX3JxYUEzWWVBaDBiVVhVbXhXMTE="

const DEVICE_TYPE = "com.crunchyroll.windows.desktop"
const DEVICE_NAME = "BetterCrunchyroll"

interface TokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
}

interface AuthRequest {
  method: "sign_in" | "refresh" | "anonymous"
  username?: string
  password?: string
  refresh_token?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: AuthRequest = await request.json()

    if (body.method === "sign_in" && body.username && body.password) {
      return handleSignIn(body.username, body.password)
    } else if (body.method === "refresh" && body.refresh_token) {
      return handleRefreshToken(body.refresh_token)
    } else if (body.method === "anonymous") {
      return handleAnonymousToken()
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  } catch (error) {
    console.error("[Auth API] Unexpected error:", error)
    return NextResponse.json(
      { error: "Erreur serveur interne" },
      { status: 500 }
    )
  }
}

async function handleSignIn(username: string, password: string): Promise<NextResponse> {
  const deviceId = crypto.randomUUID()
  const etpId = crypto.randomUUID()

  const params = new URLSearchParams()
  params.append("username", username)
  params.append("password", password)
  params.append("grant_type", "password")
  params.append("scope", "offline_access")
  params.append("device_id", deviceId)
  params.append("device_name", DEVICE_NAME)
  params.append("device_type", DEVICE_TYPE)

  let response: Response
  try {
    response = await fetch(CR_AUTH_URL, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${BASIC_AUTH}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "ETP-Anonymous-ID": etpId,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
        "Origin": "https://www.crunchyroll.com",
        "Referer": "https://www.crunchyroll.com/login",
      },
      body: params.toString(),
    })
  } catch (fetchErr) {
    console.error("[Auth API] Network error contacting Crunchyroll:", fetchErr)
    return NextResponse.json({ error: "Impossible de contacter Crunchyroll. Vérifiez votre connexion." }, { status: 503 })
  }

  if (!response.ok) {
    let errorData: any = {}
    try { errorData = await response.json() } catch {}
    const msg = errorData.error_description || errorData.message || errorData.error || "Identifiants incorrects"
    console.error("[Auth API] Crunchyroll refused sign-in:", response.status, errorData)
    // 400/401 from CR â†’ return 401 to client (not 500)
    return NextResponse.json({ error: msg }, { status: 401 })
  }

  const data: TokenResponse = await response.json()

  // Fetch profile info (best-effort â€” don't fail login if this fails)
  let profileData: any = {}
  try {
    const profileResponse = await fetch(CR_PROFILE_URL, {
      headers: {
        "Authorization": `Bearer ${data.access_token}`,
        "User-Agent": "Mozilla/5.0",
      },
    })
    if (profileResponse.ok) profileData = await profileResponse.json()
  } catch {}

  return NextResponse.json({
    success: true,
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
    account: profileData,
  })
}

async function handleRefreshToken(refreshToken: string): Promise<NextResponse> {
  const deviceId = crypto.randomUUID()
  const etpId = crypto.randomUUID()

  const params = new URLSearchParams()
  params.append("refresh_token", refreshToken)
  params.append("grant_type", "refresh_token")
  params.append("scope", "offline_access")
  params.append("device_id", deviceId)
  params.append("device_name", DEVICE_NAME)
  params.append("device_type", DEVICE_TYPE)

  let response: Response
  try {
    response = await fetch(CR_AUTH_URL, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${BASIC_AUTH}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "ETP-Anonymous-ID": etpId,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      body: params.toString(),
    })
  } catch (fetchErr) {
    return NextResponse.json({ error: "Impossible de contacter Crunchyroll." }, { status: 503 })
  }

  if (!response.ok) {
    let errorData: any = {}
    try { errorData = await response.json() } catch {}
    return NextResponse.json({ error: errorData.error_description || "Session expirée" }, { status: 401 })
  }

  const data: TokenResponse = await response.json()

  return NextResponse.json({
    success: true,
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
  })
}

async function handleAnonymousToken(): Promise<NextResponse> {
  const params = new URLSearchParams()
  params.append("grant_type", "client_id")

  let response: Response
  try {
    response = await fetch(CR_AUTH_URL, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${BASIC_AUTH}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0",
        "ETP-Anonymous-ID": crypto.randomUUID(),
      },
      body: params.toString(),
    })
  } catch {
    return NextResponse.json({ error: "Impossible de contacter Crunchyroll." }, { status: 503 })
  }

  if (!response.ok) {
    return NextResponse.json({ error: "Impossible d'obtenir un token anonyme" }, { status: 502 })
  }

  const data: TokenResponse = await response.json()

  return NextResponse.json({
    success: true,
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
  })
}


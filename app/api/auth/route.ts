import { NextRequest, NextResponse } from "next/server"

// Crunchyroll API endpoints
const CR_AUTH_URL = "https://www.crunchyroll.com/auth/v1/token"
const CR_ACCOUNT_URL = "https://www.crunchyroll.com/accounts/v1/me"

// Get basic auth header for client credentials (anonymous token)
const BASIC_AUTH = Buffer.from(process.env.CRUNCHYROLL_CLIENT_ID + ":" + process.env.CRUNCHYROLL_CLIENT_SECRET).toString("base64")

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
    console.error("[Auth API] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Authentication failed" },
      { status: 500 }
    )
  }
}

async function handleSignIn(username: string, password: string): Promise<NextResponse> {
  const params = new URLSearchParams()
  params.append("username", username)
  params.append("password", password)
  params.append("grant_type", "password")

  const response = await fetch(CR_AUTH_URL, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${BASIC_AUTH}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Mozilla/5.0",
    },
    body: params.toString(),
  })

  if (!response.ok) {
    let errorData: any = {}
    try {
      errorData = await response.json()
    } catch {}
    throw new Error(errorData.error_description || "Sign in failed")
  }

  const data: TokenResponse = await response.json()

  // Fetch account info to verify success
  const accountResponse = await fetch(CR_ACCOUNT_URL, {
    headers: {
      "Authorization": `Bearer ${data.access_token}`,
      "User-Agent": "Mozilla/5.0",
    },
  })

  if (!accountResponse.ok) {
    throw new Error("Failed to verify account")
  }

  const accountData = await accountResponse.json()

  return NextResponse.json({
    success: true,
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
    account: accountData,
  })
}

async function handleRefreshToken(refreshToken: string): Promise<NextResponse> {
  const params = new URLSearchParams()
  params.append("refresh_token", refreshToken)
  params.append("grant_type", "refresh_token")

  const response = await fetch(CR_AUTH_URL, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${BASIC_AUTH}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Mozilla/5.0",
    },
    body: params.toString(),
  })

  if (!response.ok) {
    let errorData: any = {}
    try {
      errorData = await response.json()
    } catch {}
    throw new Error(errorData.error_description || "Token refresh failed")
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

  const response = await fetch(CR_AUTH_URL, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${BASIC_AUTH}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Mozilla/5.0",
      "ETP-Anonymous-ID": crypto.randomUUID(),
    },
    body: params.toString(),
  })

  if (!response.ok) {
    throw new Error("Failed to get anonymous token")
  }

  const data: TokenResponse = await response.json()

  return NextResponse.json({
    success: true,
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
  })
}

import type React from "react"
import type { Metadata } from "next"
import { Plus_Jakarta_Sans } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Providers } from "./providers"
import { NavigationSync } from "@/components/navigation-sync"
import "./globals.css"

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Crunchyroll - Streaming Anime",
  description: "Regardez les meilleurs anime en streaming",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr">
      <body className={`${jakarta.className} font-sans antialiased`}>
        <Providers>
          <NavigationSync />
          {children}
        </Providers>
        <Analytics />
      </body>
    </html>
  )
}


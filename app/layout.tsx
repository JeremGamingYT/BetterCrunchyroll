import type React from "react"
import type { Metadata } from "next"
import { Plus_Jakarta_Sans, Bangers } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Providers } from "./providers"
import { NavigationSync } from "@/components/navigation-sync"
import "./globals.css"

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" })
const bangers = Bangers({ weight: "400", subsets: ["latin"], variable: "--font-bangers" })

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
    <html lang="fr" className="scrollbar-hide">
      <body className={`${jakarta.variable} ${bangers.variable} font-sans antialiased overflow-x-hidden`}>
        <Providers>
          <NavigationSync />
          {children}
        </Providers>
        <Analytics />
      </body>
    </html>
  )
}


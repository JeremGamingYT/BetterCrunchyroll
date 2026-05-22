import type React from "react"
import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/next"
import { Providers } from "./providers"
import { NavigationSync } from "@/components/navigation-sync"
import "./globals.css"

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
      <body className="relative overflow-x-hidden bg-background font-sans antialiased">
        <div aria-hidden="true" className="site-canvas">
          <div className="site-canvas__manga" />
          <div className="site-canvas__glow site-canvas__glow--left" />
          <div className="site-canvas__glow site-canvas__glow--right" />
          <div className="site-canvas__beams" />
          <div className="site-canvas__beam site-canvas__beam--one" />
          <div className="site-canvas__beam site-canvas__beam--two" />
          <div className="site-canvas__glyphs">
            <span className="site-canvas__glyph site-canvas__glyph--one">ア</span>
            <span className="site-canvas__glyph site-canvas__glyph--two">ツ</span>
            <span className="site-canvas__glyph site-canvas__glyph--three">ロ</span>
            <span className="site-canvas__glyph site-canvas__glyph--four">ン</span>
            <span className="site-canvas__glyph site-canvas__glyph--five">・</span>
          </div>
          <div className="site-canvas__halftone site-canvas__halftone--one" />
          <div className="site-canvas__halftone site-canvas__halftone--two" />
        </div>

        <div className="relative z-10 min-h-screen">
          <Providers>
            <NavigationSync />
            {children}
          </Providers>
          <Analytics />
        </div>
      </body>
    </html>
  )
}


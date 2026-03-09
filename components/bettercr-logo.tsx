import { cn } from "@/lib/utils"

interface BetterCrLogoProps {
  className?: string
  compact?: boolean
}

export function BetterCrLogo({ className, compact = false }: BetterCrLogoProps) {
  const width = compact ? 118 : 168
  const height = compact ? 32 : 44

  return (
    <svg
      viewBox="0 0 168 44"
      aria-hidden="true"
      role="img"
      className={cn("h-auto w-auto", className)}
      width={width}
      height={height}
    >
      <defs>
        <linearGradient id="bettercr-fill" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffd36a" />
          <stop offset="42%" stopColor="#ffb11a" />
          <stop offset="100%" stopColor="#ff7a00" />
        </linearGradient>
        <filter id="bettercr-shadow" x="-20%" y="-40%" width="140%" height="180%">
          <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#000000" floodOpacity="0.35" />
        </filter>
      </defs>

      <g filter="url(#bettercr-shadow)">
        <text
          x="2"
          y="31"
          fill="url(#bettercr-fill)"
          fontFamily="Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif"
          fontSize="30"
          fontStyle="italic"
          fontWeight="900"
          letterSpacing="1.6"
          textLength="164"
          lengthAdjust="spacingAndGlyphs"
        >
          BETTERCR
        </text>
      </g>
    </svg>
  )
}
import { cn } from "@/lib/utils"

interface BetterCrLogoProps {
  className?: string
  compact?: boolean
}

export function BetterCrLogo({ className, compact = false }: BetterCrLogoProps) {
  const width = compact ? 164 : 220
  const height = compact ? 30 : 40

  return (
    <svg
      viewBox="0 0 220 40"
      aria-hidden="true"
      role="img"
      className={cn("h-auto w-auto", className)}
      width={width}
      height={height}
    >
      <defs>
        <linearGradient id="crunchyroll-orange" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffcf57" />
          <stop offset="48%" stopColor="#ff9f1a" />
          <stop offset="100%" stopColor="#f47521" />
        </linearGradient>
        <filter id="crunchyroll-shadow" x="-20%" y="-40%" width="140%" height="180%">
          <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#000000" floodOpacity="0.35" />
        </filter>
      </defs>

      <g filter="url(#crunchyroll-shadow)">
        <g transform="translate(2 3)">
          <circle cx="17" cy="17" r="17" fill="url(#crunchyroll-orange)" />
          <circle cx="17" cy="17" r="9.3" fill="#0f0f10" />
          <path
            d="M27.9 10.4c-3.2-3.2-8.8-3.7-12.8-1.2 3.8-.7 7.7.5 10.3 3.1 1.7 1.7 2.8 3.9 3.1 6.2 1.7-2.6 1.4-6.2-.6-8.1Z"
            fill="#0f0f10"
          />
          <circle cx="24.2" cy="10.8" r="3.2" fill="#0f0f10" />
        </g>

        <text
          x="48"
          y="27"
          fill="url(#crunchyroll-orange)"
          fontFamily="Arial, Helvetica, sans-serif"
          fontSize="22"
          fontWeight="900"
          letterSpacing="0.6"
        >
          CRUNCHYROLL
        </text>
      </g>
    </svg>
  )
}
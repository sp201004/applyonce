'use client'

import Link from 'next/link'

interface ApplyButtonProps {
  href: string
  scroll?: boolean
  className?: string
}

/**
 * Large primary "Apply" call-to-action with a slow glow and hover-only shine.
 * Plain "Apply" text links to the dashboard or login modal.
 */
export default function ApplyButton({ href, scroll, className = '' }: ApplyButtonProps) {
  return (
    <Link
      href={href}
      scroll={scroll}
      aria-label="Apply"
      className={`group relative inline-flex w-[min(320px,calc(100vw-2rem))] items-center justify-center overflow-hidden rounded-2xl border border-[#2563eb] border-b-4 border-b-[#1e40af] border-t-white/30 bg-gradient-to-b from-[#3b82f6] to-[#2563eb] px-10 py-6 text-5xl font-bold text-white outline-none transition-transform duration-300 ease-out will-change-transform hover:scale-105 focus-visible:ring-4 focus-visible:ring-[#93c5fd] active:scale-95 motion-safe:animate-pulse-glow sm:min-w-[320px] sm:px-14 sm:py-7 sm:text-6xl ${className}`}
    >
      {/* slow rotating conic-gradient shimmer border ring (sits just under the fill) */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
      >
        <span
          className="animate-conic-spin absolute left-1/2 top-1/2 h-[200%] w-[200%] -translate-x-1/2 -translate-y-1/2 will-change-transform"
          style={{
            background:
              'conic-gradient(from 0deg, transparent 0deg, rgba(147,197,253,0.9) 40deg, rgba(255,255,255,0.95) 70deg, rgba(14,165,233,0.9) 110deg, transparent 160deg, transparent 360deg)',
          }}
        />
      </span>
      {/* inner mask so the conic ring reads as a thin border, not a fill */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-[2px] rounded-[14px] bg-gradient-to-b from-[#3b82f6] to-[#2563eb]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-1/3 -translate-x-[220%] -skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[520%] motion-reduce:transition-none"
      />
      <span className="relative z-10">Apply</span>
    </Link>
  )
}

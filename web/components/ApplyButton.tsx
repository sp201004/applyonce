'use client'

import Link from 'next/link'

interface ApplyButtonProps {
  href: string
  scroll?: boolean
  className?: string
}

/**
 * Large primary "Apply" call-to-action.
 * Softer blue gradient, deep glow, slow pulse-glow + hover lift.
 * Plain "Apply" text (no glyph). Links to dashboard or the login modal.
 */
export default function ApplyButton({ href, scroll, className = '' }: ApplyButtonProps) {
  return (
    <Link
      href={href}
      scroll={scroll}
      aria-label="Apply"
      className={`group relative inline-flex items-center justify-center rounded-2xl border-b-4 border-[#1e40af] bg-gradient-to-b from-[#3b82f6] to-[#2563eb] px-10 py-5 text-4xl font-bold text-white shadow-[0_20px_60px_rgba(37,99,235,0.45)] outline-none transition-transform duration-300 ease-out will-change-transform hover:scale-105 focus-visible:ring-4 focus-visible:ring-[#93c5fd] active:scale-95 motion-safe:animate-pulse-glow sm:px-16 sm:py-6 sm:text-5xl ${className}`}
    >
      Apply
    </Link>
  )
}

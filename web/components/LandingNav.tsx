'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

interface LandingNavProps {
  isLoggedIn: boolean
}

/**
 * Landing top navigation (~80px tall).
 * JS-lite scroll listener toggles a subtle bottom border + soft shadow once the
 * page is scrolled. Includes a "How it works" anchor that smooth-scrolls to the
 * #how-it-works section. Preserves the existing auth routing.
 */
export default function LandingNav({ isLoggedIn }: LandingNavProps) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`sticky top-0 z-50 h-20 w-full backdrop-blur-xl transition-[border-color,box-shadow,background-color] duration-300 ${
        scrolled
          ? 'border-b border-slate-200/60 bg-white/80 shadow-[0_4px_20px_rgba(37,99,235,0.06)]'
          : 'border-b border-slate-200/40 bg-white/70'
      }`}
    >
      <div className="mx-auto flex h-full w-full max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3 font-extrabold tracking-tight" aria-label="ApplyOnce home">
          <img src="/applyonce_logo.svg" alt="ApplyOnce logo" className="h-10 w-10" />
          <span className="text-xl">
            Apply<span className="text-[#2563eb]">Once</span>
          </span>
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-2 text-sm font-bold sm:gap-3">
          <a
            href="#how-it-works"
            className="hidden rounded-lg px-3 py-2 text-slate-600 outline-none transition-colors hover:text-[#2563eb] focus-visible:ring-4 focus-visible:ring-[#93c5fd] sm:block"
          >
            How it works
          </a>
          <Link
            href="/privacy"
            className="hidden rounded-lg px-3 py-2 text-slate-600 outline-none transition-colors hover:text-[#2563eb] focus-visible:ring-4 focus-visible:ring-[#93c5fd] sm:block"
          >
            Privacy
          </Link>
          <Link
            href={isLoggedIn ? '/dashboard' : '?login=true'}
            scroll={false}
            className="rounded-xl bg-[#2563eb] px-5 py-2.5 text-white shadow-sm outline-none transition-colors hover:bg-[#1d4ed8] focus-visible:ring-4 focus-visible:ring-[#93c5fd]"
          >
            {isLoggedIn ? 'Dashboard' : 'Sign in'}
          </Link>
        </nav>
      </div>
    </header>
  )
}

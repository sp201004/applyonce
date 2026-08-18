'use client'

import type React from 'react'
import { useCallback, useRef } from 'react'
import Link from 'next/link'
import LoginCard from '@/components/LoginCard'
import Footer from '@/components/Footer'
import PlatformsCarousel from '@/components/PlatformsCarousel'
import ApplyButton from '@/components/ApplyButton'
import DetectiveMascot from '@/components/DetectiveMascot'
import LandingBackground from '@/components/LandingBackground'
import LandingNav from '@/components/LandingNav'
import ScrollReveal from '@/components/ScrollReveal'
import HowItWorks from '@/components/HowItWorks'
import FeaturesGrid from '@/components/FeaturesGrid'
import StatsStrip from '@/components/StatsStrip'
import FinalCta from '@/components/FinalCta'

interface LandingPageProps {
  isLoggedIn: boolean
  showLogin: boolean
}

const SOCIAL_LINKS = [
  {
    label: 'ApplyOnce on X',
    href: 'https://x.com',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.65l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    label: 'ApplyOnce on LinkedIn',
    href: 'https://linkedin.com',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z" />
      </svg>
    ),
  },
  {
    label: 'ApplyOnce on GitHub',
    href: 'https://github.com',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.5 11.5 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222 0 1.606-.014 2.898-.014 3.293 0 .322.216.694.825.576C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
      </svg>
    ),
  },
]

/** Tiny 4-point sparkle used near the mascot and Apply button. */
function Sparkle({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`animate-sparkle pointer-events-none absolute text-[#2563eb] ${className}`}
      style={style}
      fill="currentColor"
    >
      <path d="M12 0c.7 6 2.9 8.2 8.9 8.9C14.9 9.6 12.7 11.8 12 18c-.7-6.2-2.9-8.4-8.9-9.1C9.1 8.2 11.3 6 12 0Z" />
    </svg>
  )
}

/**
 * Polished ApplyOnce landing hero.
 * Light + blue theme, blue detective mascot, primary "Get started" CTA, a large
 * Apply button with a non-overlapping handwritten annotation arrow, and a
 * right-edge social rail. Preserves authenticated routing
 * (logged-in -> /dashboard, else -> ?login=true).
 */
export default function LandingPage({ isLoggedIn, showLogin }: LandingPageProps) {
  const applyHref = isLoggedIn ? '/dashboard' : '?login=true'

  // Subtle magnetic hover for the "Get started" CTA (reduced-motion safe).
  const ctaRef = useRef<HTMLAnchorElement | null>(null)

  const onCtaMove = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    const el = ctaRef.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const rect = el.getBoundingClientRect()
    const relX = e.clientX - (rect.left + rect.width / 2)
    const relY = e.clientY - (rect.top + rect.height / 2)
    // move a small fraction toward the cursor
    el.style.transform = `translate(${relX * 0.18}px, ${relY * 0.28}px) scale(1.04)`
  }, [])

  const onCtaLeave = useCallback(() => {
    const el = ctaRef.current
    if (!el) return
    el.style.transform = ''
  }, [])

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-white text-[#111827]">
      <LandingNav isLoggedIn={isLoggedIn} />

      {/* ================= HERO ================= */}
      <main className="relative">
        <LandingBackground />

        <div className="relative z-10 mx-auto flex min-h-[calc(100vh-80px)] w-full max-w-[1440px] flex-col justify-center gap-12 px-4 py-12 sm:px-6 lg:grid lg:max-w-6xl lg:grid-cols-[56fr_44fr] lg:items-center lg:gap-6 lg:px-8">
          {/* --- Mascot (mobile: above heading / desktop: absolute top-right of hero) --- */}
          <div className="order-1 flex justify-center lg:order-none lg:absolute lg:right-[5%] lg:top-[10%] lg:z-20">
            <div className="relative flex h-[140px] w-[140px] items-center justify-center lg:h-[260px] lg:w-[260px]">
              <div className="absolute inset-0 rounded-full bg-[#dbeafe] blur-2xl" aria-hidden="true" />
              <div className="absolute inset-0 rounded-full bg-[#dbeafe]/70" aria-hidden="true" />
              {/* twinkling sparkles near the mascot */}
              <Sparkle className="h-5 w-5" style={{ right: '-6px', top: '6px', animationDelay: '0.2s' }} />
              <Sparkle className="h-3.5 w-3.5" style={{ left: '-2px', bottom: '10px', animationDelay: '1.1s' }} />
              <svg
                viewBox="0 0 32 32"
                aria-hidden="true"
                className="pointer-events-none absolute right-0 top-2 z-20 h-8 w-8 text-[#2563eb] opacity-70 lg:-right-1 lg:top-5 lg:h-10 lg:w-10"
              >
                <path d="M16 2c1.3 8.5 4.8 12 13 14-8.2 2-11.7 5.5-13 14-1.3-8.5-4.8-12-13-14C11.2 14 14.7 10.5 16 2Z" fill="currentColor" />
              </svg>
              <DetectiveMascot className="relative z-10 h-[92%] w-[92%]" />
            </div>
          </div>

          {/* --- Left column: copy (55%) --- */}
          <section className="order-2 flex max-w-2xl flex-col gap-6 lg:order-none">
            <p className="animate-fade-up fade-up-delay-1 inline-flex w-fit rounded-full border border-blue-200 bg-white px-4 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-[#2563eb] shadow-sm">
              Apply smarter, not longer
            </p>
            <h1 className="animate-fade-up fade-up-delay-2 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl xl:text-7xl">
              Your profile, ready for every{' '}
              <span className="relative inline-block">
                <span className="animate-gradient-text">application.</span>
                <svg
                  viewBox="0 0 220 18"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                  className="pointer-events-none absolute -bottom-1 left-0 h-3 w-full overflow-visible text-[#2563eb] opacity-70"
                >
                  <path d="M3 12C51 4 111 5 217 10" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
                  <path d="M18 15C73 10 145 9 207 13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.45" />
                </svg>
              </span>
            </h1>
            <p className="animate-fade-up fade-up-delay-3 max-w-lg text-lg font-medium leading-relaxed text-slate-600 sm:text-xl">
              ApplyOnce securely syncs your profile and helps fill job applications while you stay in control of every
              answer. It never auto-submits.
            </p>

            {/* trust chips (glassmorphism) */}
            <div className="animate-fade-up fade-up-delay-3 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/60 px-4 py-2 text-sm font-bold text-slate-600 shadow-sm backdrop-blur">
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#2563eb]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                Never auto-submits
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/60 px-4 py-2 text-sm font-bold text-slate-600 shadow-sm backdrop-blur">
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#2563eb]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                You review every answer
              </span>
            </div>

            {/* trusted-style "works on" strip */}
            <div className="animate-fade-up fade-up-delay-3 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-xs font-bold text-slate-500">Works on</span>
              <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                LinkedIn · Greenhouse · Lever · Workday · Naukri
              </span>
            </div>

            {/* primary CTA */}
            <div className="animate-fade-up fade-up-delay-4">
              <Link
                ref={ctaRef}
                href={applyHref}
                scroll={false}
                aria-label="Get started"
                onMouseMove={onCtaMove}
                onMouseLeave={onCtaLeave}
                className="magnetic-cta group inline-flex items-center justify-center gap-2 rounded-2xl border-b-4 border-[#1e40af] bg-gradient-to-b from-[#3b82f6] to-[#2563eb] px-9 py-4 text-lg font-bold text-white shadow-[0_16px_40px_rgba(37,99,235,0.35)] outline-none transition-transform duration-200 ease-out will-change-transform hover:scale-[1.03] focus-visible:ring-4 focus-visible:ring-[#93c5fd] active:scale-95 sm:text-xl"
              >
                Get started
                <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">→</span>
              </Link>
            </div>
          </section>

          {/* --- Apply cluster (mobile: block below CTAs / desktop: centered in right column) --- */}
          <div className="order-3 flex justify-center lg:order-none lg:absolute lg:left-[71%] lg:top-[56%] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:justify-start">
            <div className="relative">
              {/* twinkling sparkles near the Apply button */}
              <Sparkle className="z-20 h-5 w-5" style={{ right: '-10px', top: '-14px', animationDelay: '0.6s' }} />
              <Sparkle className="z-20 h-3.5 w-3.5" style={{ left: '-8px', bottom: '-6px', animationDelay: '1.6s' }} />

              <ApplyButton href={applyHref} scroll={false} />

              {/* Handwritten annotation + tighter curve (desktop only). */}
              <div className="pointer-events-none absolute left-0 top-full hidden lg:block">
                <svg
                  viewBox="0 0 180 80"
                  fill="none"
                  aria-hidden="true"
                  className="absolute"
                  style={{ left: '-152px', top: '0', width: '180px', height: '80px' }}
                >
                  <path
                    d="M110 54 Q 139 45 152 3"
                    stroke="#2563eb"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                    className="motion-safe:animate-arrow-draw"
                    style={{ '--dash-len': '120' } as React.CSSProperties}
                  />
                  <path
                    d="M152 3 L 141 7 M152 3 L 149 15"
                    stroke="#2563eb"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="motion-safe:animate-arrow-draw"
                    style={{ '--dash-len': '30' } as React.CSSProperties}
                  />
                </svg>
                <p
                  className="absolute w-[170px] rotate-[-6deg] text-3xl font-semibold leading-[0.9] text-[#2563eb] [font-family:var(--font-caveat)]"
                  style={{ left: '-198px', top: '24px' }}
                >
                  Click here to setup profile
                </p>
              </div>
            </div>
          </div>

          {showLogin && <LoginCard />}
        </div>

        {/* Right-edge vertical social rail — desktop only, fixed & vertically centered */}
        <nav
          aria-label="ApplyOnce social links"
          className="fixed right-4 top-1/2 z-40 hidden -translate-y-1/2 flex-col gap-3 lg:flex"
        >
          {SOCIAL_LINKS.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={s.label}
              className="social-lift flex h-11 w-11 items-center justify-center rounded-full border border-[#e2e8f0] bg-white text-slate-500 shadow-sm outline-none transition-all duration-300 hover:-translate-y-0.5 hover:border-[#2563eb] hover:bg-[#2563eb] hover:text-white hover:shadow-[0_10px_24px_rgba(37,99,235,0.28)] focus-visible:ring-4 focus-visible:ring-[#93c5fd] motion-reduce:hover:translate-y-0"
            >
              {s.icon}
            </a>
          ))}
        </nav>
      </main>

      {/* ================= BELOW HERO ================= */}
      <HowItWorks />

      <ScrollReveal as="section">
        <PlatformsCarousel />
      </ScrollReveal>

      <FeaturesGrid />

      <StatsStrip />

      <FinalCta isLoggedIn={isLoggedIn} />

      <Footer />
    </div>
  )
}

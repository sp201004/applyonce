import Link from 'next/link'
import LoginCard from '@/components/LoginCard'
import Footer from '@/components/Footer'
import GeometricBackground from '@/components/GeometricBackground'
import PlatformsCarousel from '@/components/PlatformsCarousel'
import ApplyButton from '@/components/ApplyButton'
import DetectiveMascot from '@/components/DetectiveMascot'
import LandingBackground from '@/components/LandingBackground'
import ScrollReveal from '@/components/ScrollReveal'
import HowItWorks from '@/components/HowItWorks'
import FeaturesGrid from '@/components/FeaturesGrid'
import StatsStrip from '@/components/StatsStrip'
import FinalCta from '@/components/FinalCta'
import FloatingConnectCard from '@/components/FloatingConnectCard'

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

/**
 * Polished ApplyOnce landing hero.
 * Light + blue theme, blue detective mascot, non-overlapping handwritten
 * annotation arrow, large Apply CTA, and a right-edge social rail.
 * Preserves authenticated routing (logged-in -> /dashboard, else -> ?login=true).
 */
export default function LandingPage({ isLoggedIn, showLogin }: LandingPageProps) {
  const applyHref = isLoggedIn ? '/dashboard' : '?login=true'

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-[#f8fafc] text-[#111827]">
      <GeometricBackground />

      <header className="relative z-40 mx-auto flex w-full max-w-[1440px] items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3 font-extrabold tracking-tight">
          <img src="/applyonce_logo.svg" alt="ApplyOnce" className="h-10 w-10" />
          <span className="text-xl">
            Apply<span className="text-[#2563eb]">Once</span>
          </span>
        </Link>
        <nav className="flex items-center gap-3 text-sm font-bold">
          <Link href="/privacy" className="hidden rounded-lg px-3 py-2 text-slate-600 hover:text-[#2563eb] sm:block">
            Privacy
          </Link>
          <Link
            href={isLoggedIn ? '/dashboard' : '?login=true'}
            scroll={false}
            className="rounded-xl bg-[#2563eb] px-5 py-2.5 text-white shadow-sm hover:bg-[#1d4ed8]"
          >
            {isLoggedIn ? 'Dashboard' : 'Sign in'}
          </Link>
        </nav>
      </header>

      <main className="relative z-10 mx-auto grid min-h-[640px] w-full max-w-[1440px] flex-1 items-center gap-12 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-16 lg:px-8 xl:gap-20">
        {/* Left column — vertically centered copy with staggered fade-up entrance */}
        <section className="flex flex-col justify-center">
          <p className="animate-fade-up fade-up-delay-1 mb-4 inline-flex w-fit rounded-full border border-blue-200 bg-white px-4 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-[#2563eb] shadow-sm">
            Apply smarter, not longer
          </p>
          <h1 className="animate-fade-up fade-up-delay-2 max-w-2xl text-5xl font-black leading-[1.05] tracking-tight sm:text-6xl">
            Your profile, ready for every <span className="text-[#2563eb]">application.</span>
          </h1>
          <p className="animate-fade-up fade-up-delay-3 mt-6 max-w-xl text-lg font-medium leading-relaxed text-slate-600">
            ApplyOnce securely syncs your profile and helps fill job applications while you stay in control of every
            answer. It never auto-submits.
          </p>
          <div className="animate-fade-up fade-up-delay-4 mt-8 flex flex-wrap items-center gap-3">
            <span className="rounded-xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-600 shadow-sm">
              Never auto-submits
            </span>
            <span className="rounded-xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-600 shadow-sm">
              You review every answer
            </span>
          </div>
        </section>

        {/* Right column — mascot, Apply CTA, annotation arrow, doodles */}
        <section
          aria-label="Get started"
          className="relative flex min-h-[360px] items-center justify-center lg:min-h-[520px] lg:pr-16 xl:pr-20"
        >
          <LandingBackground />

          {/* Blue mascot: top-right above the Apply zone (behind = dotted grid) */}
          <DetectiveMascot className="absolute -top-2 right-0 h-[200px] w-[200px] sm:h-[220px] sm:w-[220px] lg:right-2 lg:h-[240px] lg:w-[240px]" />

          {/* Apply cluster */}
          <div className="relative mt-24 lg:mt-16">
            <ApplyButton href={applyHref} scroll={false} />

            {/* Handwritten annotation + dashed arrow — desktop only, below-left, never overlaps button */}
            <div className="pointer-events-none absolute right-full top-full mr-3 mt-2 hidden w-[248px] lg:block">
              <svg viewBox="0 0 248 140" className="h-[140px] w-[248px]" fill="none" aria-hidden="true">
                <path
                  d="M34 104 C 58 62, 150 58, 228 20"
                  stroke="#2563eb"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray="2 7"
                />
                {/* arrowhead pointing up-right toward button's bottom-left, stops short */}
                <path
                  d="M228 20 L 213 19 M228 20 L 221 33"
                  stroke="#2563eb"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
              <p className="absolute bottom-1 left-0 max-w-[160px] rotate-[-6deg] text-2xl font-semibold leading-tight text-[#2563eb] [font-family:var(--font-caveat)]">
                Click here to setup profile
              </p>
            </div>
          </div>

          {showLogin && <LoginCard />}
        </section>

        {/* Right-edge vertical social rail — desktop only */}
        <nav
          aria-label="ApplyOnce social links"
          className="absolute right-1 top-1/2 z-30 hidden -translate-y-1/2 flex-col gap-3 lg:flex xl:right-3"
        >
          {SOCIAL_LINKS.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={s.label}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm outline-none transition-colors hover:border-[#2563eb] hover:bg-[#2563eb] hover:text-white focus-visible:ring-4 focus-visible:ring-[#93c5fd]"
            >
              {s.icon}
            </a>
          ))}
        </nav>
      </main>

      <HowItWorks />

      <ScrollReveal as="section">
        <PlatformsCarousel />
      </ScrollReveal>

      <FeaturesGrid />

      <StatsStrip />

      <FinalCta isLoggedIn={isLoggedIn} />

      <Footer />

      {/* Desktop-only floating extension card — routes to /connect (no fabricated store URL) */}
      <FloatingConnectCard />
    </div>
  )
}

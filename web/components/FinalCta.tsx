import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import ScrollReveal from '@/components/ScrollReveal'

interface FinalCtaProps {
  isLoggedIn: boolean
}

/**
 * Centered closing call-to-action. Primary button routes to the dashboard when
 * logged in, otherwise opens the login modal (?login=true). A subtle CSS
 * radial-gradient blob sits behind the content (decorative, reduced-motion safe).
 */
export default function FinalCta({ isLoggedIn }: FinalCtaProps) {
  const primaryHref = isLoggedIn ? '/dashboard' : '?login=true'

  return (
    <section
      aria-labelledby="final-cta-heading"
      className="relative z-10 mx-auto w-full max-w-[1440px] px-4 py-20 sm:px-6 lg:px-8 lg:py-28"
    >
      <div className="relative overflow-hidden rounded-3xl border border-blue-100 bg-white px-6 py-16 text-center shadow-[0_20px_60px_rgba(37,99,235,0.08)] sm:px-10">
        {/* decorative radial blobs */}
        <div
          aria-hidden="true"
          className="animate-blob-drift pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(147,197,253,0.55),transparent_70%)] blur-2xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 right-0 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(219,234,254,0.7),transparent_70%)] blur-2xl"
        />

        <ScrollReveal className="relative">
          <h2 id="final-cta-heading" className="text-3xl font-black tracking-tight text-[#111827] sm:text-5xl">
            Ready to apply <span className="text-[#2563eb]">smarter?</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base font-medium leading-relaxed text-slate-600">
            Set up your profile once and let ApplyOnce handle the repetitive parts — you stay in control of every answer.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={primaryHref}
              scroll={false}
              className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-[#1e40af] bg-gradient-to-b from-[#3b82f6] to-[#2563eb] px-8 py-4 text-lg font-bold text-white shadow-[0_16px_40px_rgba(37,99,235,0.35)] outline-none transition-transform duration-300 hover:scale-[1.03] focus-visible:ring-4 focus-visible:ring-[#93c5fd] active:scale-95 sm:w-auto"
            >
              Get started
              <ArrowRight size={20} strokeWidth={2.5} className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
            </Link>
            <Link
              href="/privacy"
              className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-8 py-4 text-lg font-bold text-slate-600 shadow-sm outline-none transition-colors hover:border-[#2563eb] hover:text-[#2563eb] focus-visible:ring-4 focus-visible:ring-[#93c5fd] sm:w-auto"
            >
              How we protect your data
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}

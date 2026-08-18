import Link from 'next/link'
import { Puzzle, ArrowRight } from 'lucide-react'

/**
 * Bottom-right fixed card promoting the browser extension.
 *
 * Honesty constraint: ApplyOnce is NOT published on the Chrome Web Store, so
 * this intentionally does NOT link to any store URL. It routes to the existing
 * in-app /connect flow (local load-unpacked install + account connect).
 *
 * Desktop only — hidden below the lg breakpoint to keep mobile clean.
 */
export default function FloatingConnectCard() {
  return (
    <Link
      href="/connect"
      aria-label="ApplyOnce extension — connect or install locally"
      className="group fixed bottom-6 right-6 z-40 hidden w-72 items-center gap-3 rounded-2xl border border-blue-100 bg-white p-4 shadow-[0_18px_45px_rgba(37,99,235,0.18)] outline-none transition-all duration-300 hover:-translate-y-1 hover:border-[#93c5fd] hover:shadow-[0_24px_60px_rgba(37,99,235,0.26)] focus-visible:ring-4 focus-visible:ring-[#93c5fd] lg:flex"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eff6ff] text-[#2563eb] transition-colors duration-300 group-hover:bg-[#2563eb] group-hover:text-white">
        <Puzzle size={22} strokeWidth={2.2} aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-extrabold text-[#111827]">ApplyOnce extension</span>
        <span className="block text-xs font-semibold text-slate-500">Connect · local install</span>
      </span>
      <ArrowRight
        size={18}
        strokeWidth={2.5}
        aria-hidden="true"
        className="ml-auto shrink-0 text-[#2563eb] transition-transform duration-300 group-hover:translate-x-1"
      />
    </Link>
  )
}

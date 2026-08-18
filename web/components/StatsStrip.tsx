'use client'

import { useEffect, useRef, useState } from 'react'
import ScrollReveal from '@/components/ScrollReveal'

interface Stat {
  value: string
  label: string
}

const STATS: Stat[] = [
  { value: '30+', label: 'fields autofilled per form' },
  { value: 'Seconds', label: 'from PDF to a ready profile' },
  { value: '50+', label: 'job portals & ATS supported' },
  { value: '100%', label: 'user-controlled — you approve all' },
]

/** Splits "30+" into { prefix: '', num: 30, suffix: '+' }. Non-numeric values
 * (e.g. "Seconds") return num === null and render statically. */
function parseStat(value: string) {
  const match = value.match(/^(\D*)(\d+)(\D*)$/)
  if (!match) return { prefix: '', num: null as number | null, suffix: value }
  return { prefix: match[1], num: Number(match[2]), suffix: match[3] }
}

/**
 * Single stat cell. Numeric values count up (transform/opacity-safe: only the
 * displayed text changes, width is reserved by the final string so there is no
 * layout shift). Under reduced motion the final value renders immediately.
 */
function StatItem({ stat }: { stat: Stat }) {
  const { prefix, num, suffix } = parseStat(stat.value)
  const ref = useRef<HTMLDivElement | null>(null)
  const [display, setDisplay] = useState<number>(num === null ? 0 : 0)
  const started = useRef(false)

  useEffect(() => {
    if (num === null) return

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReduced) {
      setDisplay(num)
      return
    }

    const node = ref.current
    if (!node) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !started.current) {
            started.current = true
            observer.unobserve(entry.target)
            const duration = 1200
            const start = performance.now()
            const tick = (now: number) => {
              const p = Math.min((now - start) / duration, 1)
              // easeOutCubic
              const eased = 1 - Math.pow(1 - p, 3)
              setDisplay(Math.round(eased * num))
              if (p < 1) requestAnimationFrame(tick)
            }
            requestAnimationFrame(tick)
          }
        })
      },
      { threshold: 0.4 }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [num])

  return (
    <div ref={ref} className="flex flex-col items-center">
      <dt className="sr-only">{stat.label}</dt>
      <dd className="text-3xl font-black text-[#2563eb] sm:text-4xl">
        {num === null ? (
          stat.value
        ) : (
          <span className="inline-grid">
            {/* reserved sizer keeps width fixed -> zero layout shift */}
            <span className="invisible col-start-1 row-start-1" aria-hidden="true">
              {prefix}
              {num}
              {suffix}
            </span>
            <span className="col-start-1 row-start-1">
              {prefix}
              {display}
              {suffix}
            </span>
          </span>
        )}
      </dd>
      <p aria-hidden="true" className="mt-2 max-w-[16ch] text-sm font-semibold leading-snug text-slate-600">
        {stat.label}
      </p>
    </div>
  )
}

/**
 * Light-blue trust band highlighting a few headline numbers. Purely
 * presentational; reveals as a group on scroll, numbers count up on reveal.
 */
export default function StatsStrip() {
  return (
    <section aria-label="ApplyOnce by the numbers" className="relative z-10 w-full px-4 py-10 sm:px-6 lg:px-8">
      <ScrollReveal className="mx-auto w-full max-w-[1440px]">
        <div className="rounded-2xl border border-slate-200/60 bg-white/70 px-6 py-10 shadow-[0_10px_30px_rgba(37,99,235,0.06)] backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:shadow-xl sm:px-10">
          <dl className="grid grid-cols-2 gap-8 text-center lg:grid-cols-4">
            {STATS.map((s) => (
              <StatItem key={s.label} stat={s} />
            ))}
          </dl>
        </div>
      </ScrollReveal>
    </section>
  )
}

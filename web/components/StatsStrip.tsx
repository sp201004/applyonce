import ScrollReveal from '@/components/ScrollReveal'

const STATS = [
  { value: '30+', label: 'fields autofilled per form' },
  { value: 'Seconds', label: 'from PDF to a ready profile' },
  { value: '50+', label: 'job portals & ATS supported' },
  { value: '100%', label: 'user-controlled — you approve all' },
]

/**
 * Light-blue trust band highlighting a few headline numbers. Purely
 * presentational; reveals as a group on scroll.
 */
export default function StatsStrip() {
  return (
    <section aria-label="ApplyOnce by the numbers" className="relative z-10 w-full px-4 py-10 sm:px-6 lg:px-8">
      <ScrollReveal className="mx-auto w-full max-w-[1440px]">
        <div className="rounded-3xl border border-blue-100 bg-[#eff6ff] px-6 py-10 sm:px-10">
          <dl className="grid grid-cols-2 gap-8 text-center lg:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="flex flex-col items-center">
                <dt className="sr-only">{s.label}</dt>
                <dd className="text-3xl font-black text-[#2563eb] sm:text-4xl">{s.value}</dd>
                <p aria-hidden="true" className="mt-2 max-w-[16ch] text-sm font-semibold leading-snug text-slate-600">
                  {s.label}
                </p>
              </div>
            ))}
          </dl>
        </div>
      </ScrollReveal>
    </section>
  )
}

import { FileText, Globe, ShieldCheck, Lock, UserCheck, Gift } from 'lucide-react'
import ScrollReveal from '@/components/ScrollReveal'

const FEATURES = [
  {
    icon: FileText,
    title: 'AI resume parsing',
    body: 'Your PDF becomes a clean, structured profile automatically.',
  },
  {
    icon: Globe,
    title: 'Works on major job portals',
    body: 'LinkedIn, Indeed, Greenhouse, Lever and 50+ more.',
  },
  {
    icon: UserCheck,
    title: 'Never auto-submits',
    body: 'You review and approve every answer before it goes anywhere.',
  },
  {
    icon: Lock,
    title: 'Secure by design',
    body: 'Your data stays in your own account, under your control.',
  },
  {
    icon: ShieldCheck,
    title: 'One profile everywhere',
    body: 'Keep a single source of truth across every application.',
  },
  {
    icon: Gift,
    title: 'Free to use',
    body: 'Get started at no cost — no credit card required.',
  },
]

/**
 * Six-card feature grid. Each card shows an icon, a title and a single line of
 * copy, with a blue border-glow on hover. Responsive: 1 col mobile, 2 col
 * tablet, 3 col desktop. Cards scroll-reveal in a staggered sequence.
 */
export default function FeaturesGrid() {
  return (
    <section
      aria-labelledby="features-heading"
      className="relative z-10 mx-auto w-full max-w-[1440px] px-4 py-20 sm:px-6 lg:px-8 lg:py-28"
    >
      <ScrollReveal className="mx-auto max-w-2xl text-center">
        <p className="mb-4 inline-flex rounded-full border border-blue-200 bg-white px-4 py-1.5 text-xs font-extrabold uppercase tracking-[0.18em] text-[#2563eb] shadow-sm">
          Everything you need
        </p>
        <h2 id="features-heading" className="text-3xl font-black tracking-tight text-[#111827] sm:text-4xl">
          Built to make applying <span className="text-[#2563eb]">effortless</span>
        </h2>
      </ScrollReveal>

      <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, body }, i) => (
          <ScrollReveal key={title} delay={(i % 3) * 100}>
            <article className="group h-full rounded-2xl border border-slate-200/60 bg-white/70 p-7 shadow-[0_8px_24px_rgba(37,99,235,0.05)] outline-none backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-[#93c5fd] hover:shadow-xl">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#eff6ff] text-[#2563eb] transition-colors duration-300 group-hover:bg-[#2563eb] group-hover:text-white">
                <Icon size={22} strokeWidth={2.2} aria-hidden="true" />
              </span>
              <h3 className="mt-5 text-lg font-extrabold text-[#111827]">{title}</h3>
              <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">{body}</p>
            </article>
          </ScrollReveal>
        ))}
      </div>
    </section>
  )
}

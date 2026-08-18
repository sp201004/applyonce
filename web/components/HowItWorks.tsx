import { Upload, Puzzle, MousePointerClick } from 'lucide-react'
import ScrollReveal from '@/components/ScrollReveal'

const STEPS = [
  {
    icon: Upload,
    step: '01',
    title: 'Upload your resume',
    body: 'Drop in your PDF and ApplyOnce parses it into a structured profile you can review and edit.',
  },
  {
    icon: Puzzle,
    step: '02',
    title: 'Install the extension',
    body: 'Load the extension locally with load-unpacked in your browser, then connect it to your account.',
  },
  {
    icon: MousePointerClick,
    step: '03',
    title: 'Click autofill anywhere',
    body: 'Open any job application form and let ApplyOnce fill the fields — you approve every answer.',
  },
]

/**
 * "How it works" — three sequential steps rendered as white cards with a soft
 * shadow, hover lift and an icon tint transition. Each card scroll-reveals in
 * sequence via the existing ScrollReveal (IntersectionObserver + CSS).
 */
export default function HowItWorks() {
  return (
    <section
      aria-labelledby="how-it-works-heading"
      className="relative z-10 mx-auto w-full max-w-[1440px] px-4 py-20 sm:px-6 lg:px-8 lg:py-28"
    >
      <ScrollReveal className="mx-auto max-w-2xl text-center">
        <p className="mb-4 inline-flex rounded-full border border-blue-200 bg-white px-4 py-1.5 text-xs font-extrabold uppercase tracking-[0.18em] text-[#2563eb] shadow-sm">
          How it works
        </p>
        <h2 id="how-it-works-heading" className="text-3xl font-black tracking-tight text-[#111827] sm:text-4xl">
          Up and running in <span className="text-[#2563eb]">three steps</span>
        </h2>
        <p className="mt-4 text-base font-medium leading-relaxed text-slate-600">
          No copy-pasting the same details into every form. Set up once, then apply everywhere.
        </p>
      </ScrollReveal>

      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {STEPS.map(({ icon: Icon, step, title, body }, i) => (
          <ScrollReveal key={title} delay={i * 120}>
            <article className="group h-full rounded-2xl border border-blue-100 bg-white p-8 shadow-[0_10px_30px_rgba(37,99,235,0.06)] transition-all duration-300 hover:-translate-y-1.5 hover:border-blue-200 hover:shadow-[0_18px_45px_rgba(37,99,235,0.14)]">
              <div className="flex items-center justify-between">
                <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#eff6ff] text-[#2563eb] transition-colors duration-300 group-hover:bg-[#2563eb] group-hover:text-white">
                  <Icon size={26} strokeWidth={2.2} aria-hidden="true" />
                </span>
                <span className="text-4xl font-black text-blue-100 transition-colors duration-300 group-hover:text-[#93c5fd]">
                  {step}
                </span>
              </div>
              <h3 className="mt-6 text-xl font-extrabold text-[#111827]">{title}</h3>
              <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600">{body}</p>
            </article>
          </ScrollReveal>
        ))}
      </div>
    </section>
  )
}

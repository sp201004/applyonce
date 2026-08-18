'use client'

import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'

const ROW_1: [string, string][] = [
  ['LinkedIn', 'linkedin.com'],
  ['Indeed', 'indeed.com'],
  ['Glassdoor', 'glassdoor.com'],
  ['Wellfound', 'wellfound.com'],
  ['Y Combinator Jobs', 'workatastartup.com'],
  ['Hired', 'hired.com'],
  ['Dice', 'dice.com'],
  ['Levels.fyi Jobs', 'levels.fyi'],
  ['Otta', 'otta.com'],
  ['Welcome to the Jungle', 'welcometothejungle.com'],
  ['Built In', 'builtin.com'],
  ['SimplyHired', 'simplyhired.com'],
  ['ZipRecruiter', 'ziprecruiter.com'],
  ['Google Jobs', 'google.com'],
  ['Monster', 'monster.com'],
  ['Naukri.com', 'naukri.com'],
  ['Foundit', 'foundit.in'],
  ['Internshala', 'internshala.com'],
  ['Cutshort', 'cutshort.io'],
  ['Hirist', 'hirist.tech'],
  ['Instahyre', 'instahyre.com'],
  ['Unstop', 'unstop.com'],
  ['Daijob', 'daijob.com'],
  ['CareerCross', 'careercross.com'],
  ['Japan Dev', 'japan-dev.com'],
]

const ROW_2: [string, string][] = [
  ['TokyoDev', 'tokyodev.com'],
  ['Wantedly', 'wantedly.com'],
  ['GaijinPot Jobs', 'gaijinpot.com'],
  ['Jooble', 'jooble.org'],
  ['Adzuna', 'adzuna.com'],
  ['Workday', 'workday.com'],
  ['Greenhouse', 'greenhouse.io'],
  ['Lever', 'lever.co'],
  ['Ashby', 'ashbyhq.com'],
  ['SmartRecruiters', 'smartrecruiters.com'],
  ['iCIMS', 'icims.com'],
  ['Oracle Taleo', 'oracle.com'],
  ['SAP SuccessFactors', 'sap.com'],
  ['BambooHR', 'bamboohr.com'],
  ['JazzHR', 'jazzhr.com'],
  ['Jobvite', 'jobvite.com'],
  ['Teamtailor', 'teamtailor.com'],
  ['Rippling', 'rippling.com'],
  ['Recruitee', 'recruitee.com'],
  ['Breezy HR', 'breezy.hr'],
  ['Pinpoint', 'pinpointhq.com'],
  ['Workable', 'workable.com'],
  ['Bullhorn', 'bullhorn.com'],
  ['Crelate', 'crelate.com'],
  ['Avature', 'avature.net'],
]

const PALETTE = [
  '#0A66C2', '#2557A7', '#0CAA41', '#111111', '#FF6B00', '#0F9D58', '#D32F2F',
  '#1B2A4A', '#00A19A', '#4285F4', '#6E3FF3', '#111827', '#00563F', '#7C3AED',
  '#0B5FFF', '#F97316', '#EF4444', '#0EA5E9', '#8B5CF6', '#059669',
]

function colorFor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  return PALETTE[hash % PALETTE.length]
}

function faviconUrl(domain: string) {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
}

function PlatformPill({ name, domain }: { name: string; domain: string }) {
  const [failed, setFailed] = useState(false)
  const color = colorFor(name)
  const letters = name
    .split(' ')
    .filter((w) => !['the', 'of', 'fyi'].includes(w.toLowerCase()))
    .slice(0, 1)[0]?.slice(0, 2) || name.slice(0, 2)

  return (
    <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-light-accent bg-white px-5 py-3.5 shadow-[0_4px_15px_rgba(0,0,0,0.03)] mx-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-light-accent/20 ring-1 ring-black/5">
        {!failed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={faviconUrl(domain)}
            alt=""
            width={20}
            height={20}
            loading="lazy"
            decoding="async"
            className="h-5 w-5 object-contain"
            onError={() => setFailed(true)}
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center text-[11px] font-extrabold text-white"
            style={{ backgroundColor: color }}
          >
            {letters}
          </div>
        )}
      </div>
      <span className="whitespace-nowrap text-sm font-bold text-black/80">{name}</span>
    </div>
  )
}

function MarqueeRow({ items, reverse = false }: { items: [string, string][]; reverse?: boolean }) {
  const doubled = [...items, ...items]
  return (
    <div
      className="relative flex overflow-hidden"
      style={{
        maskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)',
      }}
    >
      <div
        className={`flex w-max py-2 ${reverse ? 'animate-marquee-reverse' : 'animate-marquee'} hover:[animation-play-state:paused]`}
      >
        {doubled.map(([name, domain], i) => (
          <PlatformPill key={`${name}-${i}`} name={name} domain={domain} />
        ))}
      </div>
    </div>
  )
}

export default function PlatformsCarousel() {
  return (
    <section className="relative w-full overflow-hidden py-24">
      <div className="mx-auto mb-14 w-full max-w-[1440px] px-4 text-center sm:px-6 lg:px-8">
        <span className="mb-5 inline-block rounded-full border border-light-accent bg-light-accent/40 px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-widest text-primary">
          Apply once. Move forward.
        </span>
        <h2 className="mb-4 text-3xl font-extrabold tracking-tight text-black sm:text-4xl md:text-[2.75rem]">
          Works on <span className="text-primary">50+ Platforms</span>
        </h2>
        <p className="mx-auto max-w-3xl text-sm font-bold leading-relaxed text-black/50 sm:text-base">
          ApplyOnce autofills applications across major job boards and ATS platforms — saving you time and effort.
        </p>
      </div>

      <div className="space-y-4">
        <MarqueeRow items={ROW_1} />
        <MarqueeRow items={ROW_2} reverse />
      </div>

      <div className="mx-auto mt-12 w-full max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 rounded-2xl border border-light-accent bg-light-accent/10 px-6 py-5 relative overflow-hidden">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck size={22} strokeWidth={2.5} />
          </div>
          <p className="text-sm font-bold text-black/70 leading-relaxed">
            <span className="text-black">More platforms supported regularly. Can&apos;t find your platform?</span>{' '}
            ApplyOnce works on most standard job application forms automatically.
          </p>
        </div>
      </div>
    </section>
  )
}

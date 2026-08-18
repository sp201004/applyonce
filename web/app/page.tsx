import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import LoginCard from '@/components/LoginCard'
import Footer from '@/components/Footer'
import GeometricBackground from '@/components/GeometricBackground'
import PlatformsCarousel from '@/components/PlatformsCarousel'

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const params = await searchParams
  const showLogin = params.login === 'true'

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-[#f8fafc] text-[#111827]">
      <GeometricBackground />
      <header className="relative z-40 mx-auto flex w-full max-w-[1440px] items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3 font-extrabold tracking-tight">
          <img src="/applyonce_logo.svg" alt="ApplyOnce" className="h-10 w-10" />
          <span className="text-xl">Apply<span className="text-[#2563eb]">Once</span></span>
        </Link>
        <nav className="flex items-center gap-3 text-sm font-bold">
          <Link href="/privacy" className="hidden rounded-lg px-3 py-2 text-slate-600 hover:text-[#2563eb] sm:block">Privacy</Link>
          <Link href={user ? '/dashboard' : '?login=true'} scroll={false} className="rounded-xl bg-[#2563eb] px-5 py-2.5 text-white shadow-sm hover:bg-[#1d4ed8]">
            {user ? 'Dashboard' : 'Sign in'}
          </Link>
        </nav>
      </header>

      <main className="relative z-10 mx-auto grid min-h-[680px] w-full max-w-[1440px] flex-1 items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:gap-16 lg:px-8 xl:gap-20">
        <section>
          <p className="mb-4 inline-flex rounded-full border border-blue-200 bg-white px-4 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-[#2563eb] shadow-sm">Apply smarter, not longer</p>
          <h1 className="max-w-2xl text-5xl font-black leading-[1.05] tracking-tight sm:text-6xl">Your profile, ready for every <span className="text-[#2563eb]">application.</span></h1>
          <p className="mt-6 max-w-xl text-lg font-medium leading-relaxed text-slate-600">ApplyOnce securely syncs your profile and helps fill job applications while you stay in control of every answer.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={user ? '/dashboard' : '?login=true'} scroll={false} className="rounded-xl bg-[#2563eb] px-6 py-3 font-extrabold text-white shadow-[0_8px_24px_rgba(37,99,235,0.22)] hover:bg-[#1d4ed8]">{user ? 'Open dashboard' : 'Get started'}</Link>
            <span className="rounded-xl border border-slate-200 bg-white px-6 py-3 font-bold text-slate-600 shadow-sm">Never auto-submits</span>
          </div>
        </section>

        <section className="relative flex min-h-[460px] items-center justify-center">
          <div className="absolute inset-8 rounded-[40px] border border-blue-100 bg-white/80 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur" />
          <img src="/detective.png" alt="Application assistant artwork" className="relative z-10 max-h-[420px] max-w-full object-contain drop-shadow-xl" />
          {showLogin && <LoginCard />}
        </section>
      </main>
      <PlatformsCarousel />
      <Footer />
    </div>
  )
}

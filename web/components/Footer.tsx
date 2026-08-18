import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="relative z-10 w-full border-t border-blue-100 bg-white">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <img src="/applyonce_logo.svg" alt="ApplyOnce" className="h-10 w-10" />
          <div>
            <p className="font-extrabold text-[#111827]">ApplyOnce</p>
            <p className="text-xs font-medium text-slate-500">Privacy-first job application autofill.</p>
          </div>
        </div>
        <nav className="flex flex-wrap items-center gap-5 text-sm font-semibold text-slate-600" aria-label="Footer navigation">
          <Link href="/dashboard" className="hover:text-[#2563eb]">Dashboard</Link>
          <Link href="/privacy" className="hover:text-[#2563eb]">Privacy</Link>
          <Link href="/terms" className="hover:text-[#2563eb]">Terms</Link>
        </nav>
      </div>
      <div className="border-t border-blue-50 px-6 py-4 text-center text-xs text-slate-500">
        © 2025 ApplyOnce. Made by Surya Pratap Singh.
      </div>
    </footer>
  )
}

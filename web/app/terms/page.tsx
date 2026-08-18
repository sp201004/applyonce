import Link from 'next/link'
import Footer from '@/components/Footer'
import GeometricBackground from '@/components/GeometricBackground'

export default function TermsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white overflow-x-hidden relative">
      <GeometricBackground />
      
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-light-accent bg-white/60 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-12">
            <Link href="/" className="flex items-center gap-3 text-xl font-extrabold tracking-tight text-[#111827] hover:opacity-80 transition-opacity">
              <img src="/applyonce_logo.svg" alt="ApplyOnce" className="h-9 w-9" />
              <span>Apply<span className="text-[#2563eb]">Once</span></span>
            </Link>
            <div className="hidden md:block text-[11px] font-bold uppercase tracking-widest text-black/80 leading-relaxed">
              Terms of Service
            </div>
          </div>
          
          <Link 
            href="/" 
            className="rounded-xl border border-primary bg-white px-5 py-2 text-xs font-extrabold text-primary hover:bg-light-accent/10 hover:shadow-[0_0_15px_var(--soft-glow)] transition-all active:scale-95"
          >
            BACK TO HOME
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 mx-auto w-full max-w-[1440px] flex-1 px-4 py-12 sm:px-6 md:py-16 lg:px-8">
        <div className="mx-auto max-w-4xl bg-white/80 backdrop-blur-sm rounded-3xl border border-light-accent p-8 md:p-12 shadow-[0_8px_30px_rgba(0,0,0,0.02)]">
          <h1 className="text-3xl md:text-4xl font-extrabold text-black mb-2">
            Terms of <span className="text-primary">Service</span>
          </h1>
          <p className="text-xs text-black/40 font-bold uppercase tracking-wider mb-8">
            Last Updated: July 2026
          </p>

          <div className="space-y-8 text-sm text-black/80 font-medium leading-relaxed">
            <section>
              <h2 className="text-lg font-extrabold text-primary mb-3">1. Acceptance of Terms</h2>
              <p>
                By creating an account or using the ApplyOnce website or Chrome extension, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this service.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-extrabold text-primary mb-3">2. Description of Service</h2>
              <p>
                ApplyOnce is an AI-powered job application autofill assistant. The service includes a web dashboard to store your professional profile data and resume, and a browser extension designed to match and populate form fields on third-party job application portals.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-extrabold text-primary mb-3">3. User Accounts & Security</h2>
              <p>
                To utilize the services, you must register for an account. You are solely responsible for:
              </p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                <li>Maintaining the confidentiality of your account credentials.</li>
                <li>All activities that occur under your account.</li>
                <li>Providing accurate and truthful profile information.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-extrabold text-primary mb-3">4. Intellectual Property</h2>
              <p>
                All original code, designs, graphics, branding, and documentation of ApplyOnce are the exclusive intellectual property of the project creators. You are granted a limited, non-exclusive, non-transferable license to use the website and extension for personal job application purposes.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-extrabold text-primary mb-3">5. Third-Party Job Portals & API Keys</h2>
              <p>
                ApplyOnce works in conjunction with third-party websites. We have no control over, and assume no responsibility for, the content, privacy policies, or practices of any third-party websites or services. If you choose to configure your own API keys (such as Gemini or Groq), they reside entirely in your browser's local storage and you are responsible for any usage charges incurred.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-extrabold text-primary mb-3">6. Disclaimer of Warranties</h2>
              <p className="italic">
                The service is provided "as is" and "as available". We make no warranties, expressed or implied, regarding the accuracy, completeness, or reliability of the autofill functionalities, or the guaranteed success of any job applications submitted using the tool.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-extrabold text-primary mb-3">7. Limitation of Liability</h2>
              <p>
                In no event shall ApplyOnce or its creators be liable for any direct, indirect, incidental, special, or consequential damages (including, without limitation, damages for loss of data, missed opportunities, or service interruptions) arising out of the use or inability to use the service.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-extrabold text-primary mb-3">8. Changes to Terms</h2>
              <p>
                We reserve the right, at our sole discretion, to modify or replace these Terms of Service at any time. Your continued use of the website or extension following the posting of any changes constitutes acceptance of those changes.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

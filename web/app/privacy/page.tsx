import Link from 'next/link'
import Footer from '@/components/Footer'
import GeometricBackground from '@/components/GeometricBackground'

export default function PrivacyPage() {
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
              Privacy Policy
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
            Privacy <span className="text-primary">Policy</span>
          </h1>
          <p className="text-xs text-black/40 font-bold uppercase tracking-wider mb-8">
            Last Updated: July 2026
          </p>

          <div className="space-y-8 text-sm text-black/80 font-medium leading-relaxed">
            <section>
              <h2 className="text-lg font-extrabold text-primary mb-3">1. Introduction</h2>
              <p>
                At ApplyOnce, we take your privacy extremely seriously. This Privacy Policy describes how we collect, store, process, and protect your personal information when you use our website or Chrome browser extension.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-extrabold text-primary mb-3">2. Information We Collect</h2>
              <p>
                To provide the autofill functionalities, we collect and process the following types of information:
              </p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-2">
                <li>
                  <strong className="text-black">Profile Information:</strong> Contact details (name, email, phone number, address), education background, work experiences, social media profiles (LinkedIn, GitHub), and demographic information (e.g. gender, race, veteran status) that you voluntarily submit to the web dashboard.
                </li>
                <li>
                  <strong className="text-black">Resume Content:</strong> Uploaded resume files (PDFs) are parsed, and their text contents are stored securely on our servers to enable smart matching.
                </li>
                <li>
                  <strong className="text-black">Local Storage (API Keys):</strong> Your personal API keys (such as Gemini or Groq keys) are stored <strong>exclusively in your browser's local storage</strong>. They are never uploaded, sent, or saved to our databases or servers.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-extrabold text-primary mb-3">3. How We Use Your Information</h2>
              <p>
                We use the information we collect solely for the purpose of:
              </p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                <li>Providing and operating the job application autofill utilities.</li>
                <li>Parsing resumes and matching relevant fields to application forms.</li>
                <li>Improving extension accuracy and user dashboard experiences.</li>
              </ul>
              <p className="mt-3 font-bold text-black">
                We do not sell, rent, or trade your personal information to third parties for marketing or any other commercial purposes.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-extrabold text-primary mb-3">4. Security of Data</h2>
              <p>
                All your profile details and resume texts are saved in a secure database hosted by Supabase. We implement standard security practices to protect against unauthorized access, alteration, disclosure, or destruction of your personal data. However, please be aware that no transmission over the Internet is 100% secure.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-extrabold text-primary mb-3">5. User Control & Data Retention</h2>
              <p>
                You maintain full ownership and control of your data:
              </p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                <li>You can update, replace, or delete your profile information at any time directly through the dashboard.</li>
                <li>You can delete your uploaded resumes or clear your local API keys at any time.</li>
                <li>If you choose to delete your account, all associated profile data and resume content will be permanently removed from our databases.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-extrabold text-primary mb-3">6. Chrome Extension Permissions</h2>
              <p>
                Our Chrome extension requests permissions such as <code className="text-xs bg-light-accent px-1 rounded text-primary">activeTab</code> and <code className="text-xs bg-light-accent px-1 rounded text-primary">storage</code>. These are used solely to read form structure on the active job board page you choose to autofill and to sync your login session securely. The extension does not track your general browsing history or personal data outside of job boards.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-extrabold text-primary mb-3">7. Contact Information</h2>
              <p>
                If you have any questions or concerns regarding this Privacy Policy or how your personal information is handled, you may reach out directly to <strong>Surya Pratap Singh</strong>.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import GeometricBackground from '@/components/GeometricBackground'

export default function ResetPasswordClient({ email }: { email: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim()) {
      setMsg('Please enter a new password.')
      return
    }
    if (password.trim().length < 6) {
      setMsg('Password must be at least 6 characters.')
      return
    }
    setLoading(true)
    setMsg('')

    const { error } = await supabase.auth.updateUser({
      password: password.trim()
    })

    if (error) {
      setMsg(error.message)
      setLoading(false)
    } else {
      setMsg('Password updated successfully! Redirecting...')
      setTimeout(() => {
        router.push('/dashboard')
        router.refresh()
      }, 1500)
    }
  }

  const handleCancel = async () => {
    await supabase.auth.signOut()
    router.push('/?login=true')
    router.refresh()
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-white px-4 py-8 font-sans sm:px-6 lg:px-8">
      <GeometricBackground />
      <div className="max-w-[420px] w-full bg-white border border-[#e2e8f0] p-8 sm:p-10 rounded-[32px] shadow-[0_20px_60px_rgba(0,0,0,0.08)] relative z-10 text-center flex flex-col items-center">
        <div className="mb-6 flex flex-col items-center w-full">
          <div className="mb-4 flex justify-center text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
          <h2 className="text-3xl font-extrabold text-black">Reset <span className="text-primary">Password</span></h2>
          <p className="text-sm font-bold text-black/60 mt-2">
            Choose a new secure password for your account.
          </p>
        </div>

        <form className="w-full space-y-5" onSubmit={handleResetPassword}>
          <div className="text-left">
            <label className="block text-[11px] font-extrabold text-black mb-2">Email Address</label>
            <input 
              type="text" 
              value={email}
              disabled
              className="block w-full rounded-xl border border-light-accent bg-gray-50 px-4 py-3 text-sm font-bold text-black/50 outline-none cursor-not-allowed"
            />
          </div>

          <div className="text-left">
            <label className="block text-[11px] font-extrabold text-black mb-2">New Password</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter new password"
              className="block w-full rounded-xl border border-light-accent bg-white px-4 py-3 text-sm font-bold text-black placeholder:text-black/30 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              required
            />
          </div>

          <div className="pt-2">
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-b from-[#2563eb] to-primary text-white py-3.5 rounded-xl font-extrabold shadow-[0_4px_15px_rgba(37, 99, 235,0.15)] transition-all hover:-translate-y-0.5 disabled:opacity-50"
            >
              {loading ? "Updating..." : "Save Password & Login"}
            </button>
          </div>

          <button 
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="w-full text-xs font-bold text-gray-400 hover:text-red-500 transition-colors"
          >
            Cancel & Go to Login
          </button>
        </form>

        {msg && (
          <p className={`text-center text-sm font-bold mt-4 ${msg.includes('successfully') ? 'text-green-600' : 'text-red-500'}`}>
            {msg}
          </p>
        )}
      </div>
    </div>
  )
}

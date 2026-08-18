'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'

export default function LoginCard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/dashboard'
  const supabase = createClient()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMsg('')
    
    let error
    if (!isSignUp) {
      const res = await supabase.auth.signInWithPassword({ email, password })
      error = res.error
    } else {
      if (!agreed) {
        setMsg('You must agree to the terms and privacy policy before signing up.')
        setLoading(false)
        return
      }
      const res = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
        }
      })
      error = res.error
    }
    
    if (error) {
      setMsg(error.message)
    } else {
      if (isSignUp) {
        setMsg('Check your email for a confirmation link, or log in if auto-confirm is enabled.')
      } else {
        router.push(next)
        router.refresh()
      }
    }
    setLoading(false)
  }

  const handleMagicLink = async () => {
    setLoading(true)
    setMsg('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
      }
    })
    if (error) setMsg(error.message)
    else setMsg('Magic link sent!')
    setLoading(false)
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    setMsg('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
    if (error) {
      setMsg(error.message)
      setLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      setMsg('Please enter your email address first.')
      return
    }
    setLoading(true)
    setMsg('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/reset-password')}`
    })
    if (error) {
      setMsg(error.message)
    } else {
      setMsg('Password reset link sent! Check your email.')
    }
    setLoading(false)
  }

  return (
    <div 
      className="absolute left-1/2 top-1/2 z-[60] w-[calc(100%-2rem)] max-w-[420px] -translate-x-1/2 -translate-y-1/2 animate-fade-in-up rounded-3xl border border-light-accent bg-white p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)] sm:p-10"
    >
      <div className="mb-6 flex flex-col items-center relative mt-2">
        <button 
          type="button" 
          onClick={() => router.push('/', { scroll: false })}
          className="absolute -top-6 -right-6 sm:-right-4 p-2 text-black/40 hover:text-black transition-colors bg-white hover:bg-black/5 rounded-full"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
        <h2 className="text-3xl font-extrabold text-center text-black flex items-center gap-2">
          {isForgotPassword ? "Reset" : (isSignUp ? "Create" : "Welcome")} <span className="text-primary">{isForgotPassword ? "password" : (isSignUp ? "account" : "back!")}</span>
        </h2>
        <p className="text-sm font-bold text-black/60 mt-2 text-center">
          {isForgotPassword ? "Enter your email to receive a reset link." : (isSignUp ? "Sign up to start your journey." : "Login to continue your journey.")}
        </p>
      </div>
      
      <form className="space-y-5" onSubmit={isForgotPassword ? handleResetPassword : handleEmailAuth}>
        <div>
          <label className="block text-[11px] font-extrabold text-black mb-2">Email</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-primary">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
            </div>
            <input 
              type="email" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="block w-full rounded-xl border border-light-accent bg-white px-4 py-3 pl-12 text-sm font-bold text-black placeholder:text-black/30 outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10 hover:border-accent"
              required
            />
          </div>
        </div>

        {!isForgotPassword && (
          <div>
            <label className="block text-[11px] font-extrabold text-black mb-2">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </div>
              <input 
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="block w-full rounded-xl border border-light-accent bg-white px-4 py-3 pl-12 pr-12 text-sm font-bold text-black placeholder:text-black/30 outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10 hover:border-accent"
                required
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-black/40 hover:text-primary transition-colors focus:outline-none"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>
            {!isSignUp && (
              <div className="flex justify-end mt-2">
                <button 
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(true)
                    setMsg('')
                  }}
                  className="text-[11px] font-extrabold text-primary hover:text-[#2563eb] transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            )}
          </div>
        )}
        
        {isSignUp && (
          <div className="flex items-start gap-3 mt-2 mb-4">
            <input 
              id="signup-consent"
              type="checkbox" 
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-light-accent text-primary focus:ring-primary cursor-pointer"
              required
            />
            <label htmlFor="signup-consent" className="text-[11px] text-black/70 font-semibold select-none leading-snug cursor-pointer">
              I agree to the <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-extrabold">Terms of Service</a> and <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-extrabold">Privacy Policy</a>, and consent to the secure storage of my profile details and resume.
            </label>
          </div>
        )}
        
        <div className="pt-2">
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-b from-[#2563eb] to-primary text-white py-3.5 rounded-xl font-extrabold shadow-[0_4px_15px_var(--soft-glow)] hover:shadow-[0_6px_20px_var(--glow)] transition-all hover:-translate-y-0.5 active:translate-y-0 border border-primary/50 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isForgotPassword ? "Send Reset Link" : (isSignUp ? "Sign Up" : "Login")}
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-100">
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </button>
        </div>
        
        {!isForgotPassword && (
          <>
            <div className="relative flex items-center py-1">
              <div className="flex-grow border-t border-light-accent"></div>
              <span className="flex-shrink-0 mx-4 text-[10px] font-bold text-black/40 lowercase">or</span>
              <div className="flex-grow border-t border-light-accent"></div>
            </div>

            <button 
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full bg-white border border-light-accent text-black py-3 rounded-xl font-extrabold hover:border-primary/50 hover:bg-light-accent/10 hover:shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-3"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Continue with Google
            </button>
          </>
        )}
      </form>
      
      {msg && (
        <p className={`text-center text-sm font-bold mt-4 ${msg.includes('sent') ? 'text-green-600' : 'text-red-500'}`}>
          {msg}
        </p>
      )}

      <p className="text-center text-xs font-bold text-black/60 mt-4 pt-2">
        {isForgotPassword ? (
          <button 
            type="button"
            onClick={() => {
              setIsForgotPassword(false)
              setMsg('')
            }}
            className="text-primary font-extrabold hover:text-[#2563eb] transition-colors"
          >
            Back to Login
          </button>
        ) : (
          <>
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button 
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp)
                setAgreed(false)
                setMsg('')
              }} 
              className="text-primary font-extrabold hover:text-[#2563eb] transition-colors"
            >
              {isSignUp ? "Log in" : "Sign up"}
            </button>
          </>
        )}
      </p>
    </div>
  )
}
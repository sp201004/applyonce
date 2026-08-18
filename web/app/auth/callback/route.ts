import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const redirectUrl = new URL(next, origin)
      const safeRedirectUrl = redirectUrl.origin === origin
        ? redirectUrl
        : new URL('/dashboard', origin)

      return NextResponse.redirect(safeRedirectUrl)
    }
  }

  return NextResponse.redirect(`${origin}/?login=true&error=auth-failed`)
}

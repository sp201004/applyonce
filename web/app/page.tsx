import { createClient } from '@/lib/supabase/server'
import LandingPage from '@/components/LandingPage'

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const params = await searchParams
  const showLogin = params.login === 'true'

  return <LandingPage isLoggedIn={!!user} showLogin={showLogin} />
}

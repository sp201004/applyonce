import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function Dashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/?login=true&next=/dashboard')
  }

  let { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    console.error('Failed to load the authenticated user profile:', profileError)
  } else if (!profile) {
    const profileSeed = { id: user.id, email: user.email }
    const { data: insertedProfile, error: insertError } = await supabase
      .from('profiles')
      .upsert(profileSeed, { onConflict: 'id', ignoreDuplicates: true })
      .select('*')
      .maybeSingle()

    if (insertError) {
      console.error('Failed to ensure the authenticated user profile exists:', insertError)
    } else if (insertedProfile) {
      profile = insertedProfile
    } else {
      const { data: concurrentProfile, error: concurrentReadError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (concurrentReadError) {
        console.error('Failed to load the concurrently created profile:', concurrentReadError)
      } else {
        profile = concurrentProfile
      }
    }
  }

  return (
    <DashboardClient 
      userId={user.id} 
      email={user.email ?? ''} 
      initialProfile={profile || {}} 
      extensionId={process.env.NEXT_PUBLIC_EXTENSION_ID!}
    />
  )
}

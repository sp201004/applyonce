import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ConnectClient from './ConnectClient'

export default async function Connect() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/?login=true&next=/connect')
  }

  return (
    <div className="min-h-screen bg-background">
      <ConnectClient 
        email={user.email!} 
        extensionId={process.env.NEXT_PUBLIC_EXTENSION_ID!} 
      />
    </div>
  )
}

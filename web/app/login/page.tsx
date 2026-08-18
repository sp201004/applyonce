import { redirect } from 'next/navigation'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const resolvedParams = await searchParams
  const next = resolvedParams.next || '/dashboard'
  redirect(`/?login=true&next=${encodeURIComponent(next)}`)
}

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/sign-in')

  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/auth/sign-in')
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <p className="text-sm text-gray-500 mb-6">{user.email}</p>
        <form action={signOut}>
          <button type="submit" className="text-sm text-gray-400 underline hover:text-gray-600">
            Sign out
          </button>
        </form>
      </div>
    </main>
  )
}

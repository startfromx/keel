import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'bg-emerald-400',
  drafted: 'bg-blue-400',
  vague: 'bg-amber-400',
  missing: 'bg-red-400',
  rejected: 'bg-gray-300',
  needs_review: 'bg-orange-400',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/sign-in')

  // Get briefs via workspace
  const { data: workspaces } = await supabase
    .from('workspaces')
    .select('id')
    .eq('owner_id', user.id)

  const workspaceIds = (workspaces ?? []).map(w => w.id)

  const { data: briefs } = workspaceIds.length
    ? await supabase
        .from('briefs')
        .select('id, title, brand, brief_type, status, created_at')
        .in('workspace_id', workspaceIds)
        .order('created_at', { ascending: false })
    : { data: [] }

  // For each brief, get a quick node health summary
  const briefIds = (briefs ?? []).map(b => b.id)
  const { data: nodeSummary } = briefIds.length
    ? await supabase
        .from('nodes')
        .select('brief_id, status')
        .in('brief_id', briefIds)
    : { data: [] }

  const healthByBrief: Record<string, Record<string, number>> = {}
  ;(nodeSummary ?? []).forEach(n => {
    if (!healthByBrief[n.brief_id]) healthByBrief[n.brief_id] = {}
    healthByBrief[n.brief_id][n.status] = (healthByBrief[n.brief_id][n.status] ?? 0) + 1
  })

  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/auth/sign-in')
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-900">Keel</span>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-400">{user.email}</span>
          <form action={signOut}>
            <button type="submit" className="text-xs text-gray-400 underline hover:text-gray-600">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-lg font-semibold text-gray-900 mb-6">Briefs</h1>

        {!briefs?.length ? (
          <p className="text-sm text-gray-400">No briefs yet.</p>
        ) : (
          <div className="grid gap-3">
            {briefs.map(brief => {
              const health = healthByBrief[brief.id] ?? {}
              const total = Object.values(health).reduce((a, b) => a + b, 0)
              return (
                <a
                  key={brief.id}
                  href={`/dashboard/briefs/${brief.id}`}
                  className="bg-white rounded-lg border border-gray-200 px-5 py-4 hover:border-gray-400 hover:shadow-sm transition-all block"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{brief.title}</p>
                      {brief.brand && (
                        <p className="text-xs text-gray-400 mt-0.5">{brief.brand}</p>
                      )}
                    </div>
                    {total > 0 && (
                      <div className="flex gap-1 mt-1">
                        {Object.entries(STATUS_COLORS).map(([status, color]) =>
                          health[status] ? (
                            <span key={status} title={`${health[status]} ${status}`}
                              className={`${color} text-white text-[10px] px-1.5 py-0.5 rounded`}>
                              {health[status]}
                            </span>
                          ) : null
                        )}
                      </div>
                    )}
                  </div>
                </a>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}

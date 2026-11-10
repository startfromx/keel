import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { WorkspaceSidebar, type WorkspaceBrief } from '@/components/navigation/WorkspaceSidebar'
import { NewProjectComposer } from '@/components/dashboard/NewProjectComposer'
import { NewProjectTrigger } from '@/components/dashboard/NewProjectTrigger'

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'bg-emerald-400',
  drafted: 'bg-blue-400',
  vague: 'bg-amber-400',
  missing: 'bg-red-400',
  rejected: 'bg-gray-300',
  needs_review: 'bg-orange-400',
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>
}) {
  const { new: newProject } = await searchParams
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

  async function deleteBrief(formData: FormData) {
    'use server'
    const id = formData.get('id') as string
    if (!id) return
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/sign-in')
    await supabase.from('briefs').delete().eq('id', id)
    revalidatePath('/dashboard')
  }

  const sidebarBriefs = (briefs ?? []) as WorkspaceBrief[]

  return (
    <main className="flex min-h-screen bg-[#fbfbfa]">
      <WorkspaceSidebar briefs={sidebarBriefs} email={user.email} />
      <section className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-gray-200 bg-[#fbfbfa] px-10 py-7">
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-[0.16em] text-gray-400">Workspace</p>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-950">All projects</h1>
          </div>
          <div className="flex items-center gap-4">
            <form action={signOut}>
              <button type="submit" className="text-xs text-gray-400 hover:text-gray-700">Sign out</button>
            </form>
            <NewProjectTrigger className="rounded-lg bg-gray-950 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-gray-700">New project</NewProjectTrigger>
          </div>
        </header>

        <div className="mx-auto max-w-5xl px-10 py-10">
          <NewProjectComposer initialOpen={newProject === '1'} />
          <div className="mb-5 flex items-end justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Recent work</h2>
              <p className="mt-1 text-sm text-gray-500">Projects grouped by account, with every brief close at hand.</p>
            </div>
            <span className="text-xs text-gray-400">{briefs?.length ?? 0} {briefs?.length === 1 ? 'project' : 'projects'}</span>
          </div>

        {!briefs?.length ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
            <p className="text-sm font-medium text-gray-800">No projects yet</p>
            <p className="mt-1 text-sm text-gray-400">Start with a client account and a project brief.</p>
            <NewProjectTrigger className="mt-5 inline-flex rounded-lg bg-gray-950 px-4 py-2 text-sm font-medium text-white">Create a project</NewProjectTrigger>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {briefs.map(brief => {
              const health = healthByBrief[brief.id] ?? {}
              const total = Object.values(health).reduce((a, b) => a + b, 0)
              return (
                <div
                  key={brief.id}
                  className="group flex items-stretch rounded-xl border border-gray-200 bg-white transition-all hover:border-gray-400 hover:shadow-sm"
                >
                  <a
                    href={`/dashboard/briefs/${brief.id}`}
                    className="block flex-1 px-5 py-5"
                  >
                    <div className="mb-7 flex items-start justify-between">
                      <div>
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">{brief.brand ?? 'Unassigned'}</p>
                        <p className="text-base font-medium text-gray-950">{brief.title.replace(`${brief.brand} · `, '')}</p>
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
                    <div className="flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-400">
                      <span>{brief.brief_type ? brief.brief_type.replace(/_/g, ' ') : 'Working brief'}</span>
                      <span className="text-gray-300 transition-colors group-hover:text-gray-600">Open project →</span>
                    </div>
                  </a>
                  <div className="flex items-center pr-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <form action={deleteBrief}>
                      <input type="hidden" name="id" value={brief.id} />
                      <button
                        type="submit"
                        title="Delete brief"
                        className="text-gray-300 hover:text-red-500 transition-colors p-1 text-lg leading-none"
                      >
                        ×
                      </button>
                    </form>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        </div>
      </section>
    </main>
  )
}

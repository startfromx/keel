'use client'

import { useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

export interface WorkspaceBrief {
  id: string
  title: string
  brand: string | null
  brief_type: string | null
  goal?: string | null
}

interface WorkspaceSidebarProps {
  briefs: WorkspaceBrief[]
  email?: string | null
}

const TYPE_LABELS: Record<string, string> = {
  brief: 'Campaign brief',
  strategy_paper: 'Strategy paper',
  research_readout: 'Research readout',
  competitive_review: 'Competitive review',
}

function projectName(brief: WorkspaceBrief) {
  const prefix = brief.brand ? `${brief.brand} · ` : ''
  if (brief.title.startsWith(prefix)) {
    return brief.title.slice(prefix.length) || 'Untitled project'
  }
  return brief.title || 'Untitled project'
}

function briefName(brief: WorkspaceBrief) {
  return TYPE_LABELS[brief.brief_type ?? ''] ?? 'Working brief'
}

export function WorkspaceSidebar({ briefs, email }: WorkspaceSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [openAccounts, setOpenAccounts] = useState<Record<string, boolean>>({})

  const accounts = useMemo(() => {
    const grouped = new Map<string, WorkspaceBrief[]>()
    for (const brief of briefs) {
      const brand = brief.brand?.trim() || 'Unassigned'
      grouped.set(brand, [...(grouped.get(brand) ?? []), brief])
    }
    return [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [briefs])

  function isOpen(brand: string) {
    return openAccounts[brand] ?? true
  }

  function openNewProject() {
    if (pathname === '/dashboard') {
      window.dispatchEvent(new Event('keel:new-project'))
      return
    }
    router.push('/dashboard?new=1')
  }

  return (
    <aside className="workspace-sidebar flex h-screen w-[264px] shrink-0 flex-col border-r border-gray-200 bg-[#f7f7f5] text-gray-900">
      <div className="flex h-[68px] items-center justify-between border-b border-gray-200 px-5">
        <a href="/dashboard" className="text-base font-semibold tracking-tight">Keel</a>
        <span className="rounded-md border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-gray-400">Workspace</span>
      </div>

      <div className="px-3 pt-4">
        <button type="button" onClick={openNewProject} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-white hover:text-gray-950">
          <span className="flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 text-base leading-none">+</span>
          New project
        </button>
        <a href="/dashboard" className={`mt-1 flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors ${pathname === '/dashboard' ? 'bg-white font-medium text-gray-950 shadow-sm' : 'text-gray-600 hover:bg-white'}`}>
          <span className="text-[15px] text-gray-400">⌂</span>
          All projects
        </a>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-6">
        <div className="mb-2 px-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">Accounts</div>
        {accounts.length === 0 ? (
          <div className="px-2.5 py-3 text-xs leading-relaxed text-gray-400">Your projects will appear here.</div>
        ) : (
          <div className="space-y-1">
            {accounts.map(([brand, accountBriefs]) => {
              const expanded = isOpen(brand)
              return (
                <div key={brand}>
                  <button
                    type="button"
                    onClick={() => setOpenAccounts(prev => ({ ...prev, [brand]: !expanded }))}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-gray-800 hover:bg-white"
                  >
                    <span className={`text-[10px] text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`}>›</span>
                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-gray-900 text-[10px] font-semibold text-white">{brand.slice(0, 1).toUpperCase()}</span>
                    <span className="min-w-0 flex-1 truncate">{brand}</span>
                    <span className="text-[10px] font-normal text-gray-400">{accountBriefs.length}</span>
                  </button>

                  {expanded && (
                    <div className="ml-4 border-l border-gray-200 pl-2">
                      {accountBriefs.map(brief => {
                        const active = pathname === `/dashboard/briefs/${brief.id}`
                        return (
                          <a
                            key={brief.id}
                            href={`/dashboard/briefs/${brief.id}`}
                            className={`group mb-0.5 block rounded-md px-2.5 py-2 transition-colors ${active ? 'bg-white shadow-sm' : 'hover:bg-white/80'}`}
                          >
                            <div className={`truncate text-sm ${active ? 'font-medium text-gray-950' : 'text-gray-700'}`}>{projectName(brief)}</div>
                            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-gray-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                              <span className="truncate">{briefName(brief)}</span>
                            </div>
                          </a>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 p-3">
        <a href="/dashboard/recipes" className="mb-2 flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-gray-600 hover:bg-white hover:text-gray-900">
          <span className="text-gray-400">⚙</span>
          Recipe Studio
        </a>
        <div className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-gray-500">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 font-medium text-gray-600">{email?.slice(0, 1).toUpperCase() ?? 'K'}</span>
          <span className="min-w-0 flex-1 truncate">{email ?? 'Workspace owner'}</span>
        </div>
      </div>
    </aside>
  )
}

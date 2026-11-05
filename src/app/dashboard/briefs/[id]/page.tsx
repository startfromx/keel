import { redirect } from 'next/navigation'
import { type Node, type Edge } from '@xyflow/react'
import { createClient } from '@/lib/supabase/server'
import { computeLayout } from '@/lib/canvas/layout'
import { BriefCanvas } from '@/components/canvas/BriefCanvas'
import type { BriefNodeData } from '@/components/canvas/BriefNode'

const DOOR_LABELS: Record<string, string> = {
  research: 'Research Interpreter',
  objective: 'Objective Finder',
  brief: 'Brief Decoder',
  outputs: 'Outputs',
}

export default async function CanvasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/sign-in')

  const [{ data: brief }, { data: dbNodes }, { data: dbEdges }] = await Promise.all([
    supabase.from('briefs').select('*').eq('id', id).single(),
    supabase.from('nodes').select('*').eq('brief_id', id).order('created_at'),
    supabase.from('edges').select('*').eq('brief_id', id),
  ])

  if (!brief) redirect('/dashboard')

  const positions = computeLayout((dbNodes ?? []).map(n => ({ id: n.id, door: n.door })))
  const posMap = new Map(positions.map(p => [p.id, p]))

  // Recipe label map (key → human label) — read from recipe or use type_key as fallback
  const LABEL_MAP: Record<string, string> = {
    market_facts: 'Market facts',
    competitor_moves: 'Competitor moves',
    own_data: 'Own data',
    research_readout: 'Research readout',
    business_problem: 'Business problem',
    objective: 'Objective',
    rejected_option: 'Rejected option',
    audience: 'Audience',
    reason_to_believe: 'Reason to believe',
    single_message: 'Single message',
    mandatories: 'Mandatories',
    deliverables: 'Deliverables',
    timing: 'Timing',
    budget: 'Budget',
    approver: 'Approver',
    success_measure: 'Success measure',
    red_flags: 'Red flags',
    client_questions: 'Questions for the client',
    reverse_brief: 'Reverse brief',
    boss_summary: 'Boss view',
    team_briefing: 'Creative team briefing',
    private_notes: 'Private notes',
  }

  const flowNodes: Node[] = (dbNodes ?? []).map(n => {
    const pos = posMap.get(n.id) ?? { x: 0, y: 0 }
    return {
      id: n.id,
      type: 'briefNode',
      position: { x: pos.x, y: pos.y },
      data: {
        label: LABEL_MAP[n.type_key] ?? n.type_key,
        status: n.status,
        content: n.content ?? {},
        assumption: n.assumption ?? undefined,
        door: n.door,
        type_key: n.type_key,
      } satisfies BriefNodeData,
    }
  })

  const flowEdges: Edge[] = (dbEdges ?? []).map(e => ({
    id: e.id,
    source: e.from_node,
    target: e.to_node,
    type: 'smoothstep',
    style: { stroke: e.required ? '#94a3b8' : '#cbd5e1', strokeDasharray: e.required ? undefined : '4 4' },
    animated: false,
  }))

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="flex items-center gap-3 px-5 py-3 bg-white border-b border-gray-200 shrink-0">
        <a href="/dashboard" className="text-sm text-gray-400 hover:text-gray-600">← Briefs</a>
        <span className="text-gray-200">|</span>
        <div>
          <span className="text-sm font-semibold text-gray-900">{brief.title}</span>
          {brief.brand && (
            <span className="ml-2 text-xs text-gray-400">{brief.brand}</span>
          )}
        </div>
        <div className="ml-auto flex gap-3 text-xs text-gray-400">
          {Object.entries(DOOR_LABELS).map(([key, label]) => (
            <span key={key} className="hidden sm:inline">{label}</span>
          ))}
        </div>
      </header>

      <div className="flex-1 relative">
        <BriefCanvas initialNodes={flowNodes} initialEdges={flowEdges} />
      </div>
    </div>
  )
}

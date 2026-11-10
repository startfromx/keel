import { redirect } from 'next/navigation'
import { type Node, type Edge } from '@xyflow/react'
import { createClient } from '@/lib/supabase/server'
import { computeLayout, BRIEF_POSITION, GOAL_POSITION } from '@/lib/canvas/layout'
import { loadRecipeFromFile, getNodeDef } from '@/lib/recipe/loader'
import { BriefCanvas } from '@/components/canvas/BriefCanvas'
import { BuildingOverlay } from '@/components/canvas/BuildingOverlay'
import type { BriefNodeData } from '@/components/canvas/BriefNode'

export default async function CanvasPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ building?: string }>
}) {
  const { id } = await params
  const { building } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/sign-in')

  const [{ data: brief }, { data: dbNodes }] = await Promise.all([
    supabase.from('briefs').select('*').eq('id', id).single(),
    supabase.from('nodes').select('*').eq('brief_id', id).order('created_at'),
  ])

  if (!brief) redirect('/dashboard')

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
    boss_summary: 'Boss summary',
    team_briefing: 'Creative team briefing',
    private_notes: 'Private notes',
  }

  const positions = computeLayout((dbNodes ?? []).map(n => ({ id: n.id })))
  const posMap = new Map(positions.map(p => [p.id, p]))
  const recipe = loadRecipeFromFile()
  const canvasState = (brief.canvas_state && typeof brief.canvas_state === 'object' && !Array.isArray(brief.canvas_state))
    ? brief.canvas_state as { nodes?: Record<string, { x?: number; y?: number }>; briefPosition?: { x?: number; y?: number }; goalPosition?: { x?: number; y?: number }; chainIds?: string[]; goalOutput?: string }
    : {}

  const paletteNodes: Node[] = (dbNodes ?? []).map(n => {
    const savedPosition = canvasState.nodes?.[n.id]
    const pos = savedPosition?.x !== undefined && savedPosition.y !== undefined
      ? { x: savedPosition.x, y: savedPosition.y }
      : posMap.get(n.id) ?? { x: 0, y: 0 }
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
        prompt: getNodeDef(recipe, n.type_key)?.prompt,
        active: canvasState.chainIds?.includes(n.id) ?? false,
      } satisfies BriefNodeData,
    }
  })

  const briefInputNode: Node = {
    id: 'brief-input',
    type: 'briefInput',
    position: canvasState.briefPosition?.x !== undefined && canvasState.briefPosition.y !== undefined
      ? { x: canvasState.briefPosition.x, y: canvasState.briefPosition.y }
      : BRIEF_POSITION,
    data: { brand: brief.brand, briefType: brief.brief_type, raw: brief.brief_raw },
    draggable: true,
  }

  const goalNode: Node = {
    id: 'goal-output',
    type: 'goalNode',
    position: canvasState.goalPosition?.x !== undefined && canvasState.goalPosition.y !== undefined
      ? { x: canvasState.goalPosition.x, y: canvasState.goalPosition.y }
      : GOAL_POSITION,
    data: { goal: (brief as Record<string, unknown>).goal ?? 'Campaign Brief', output: canvasState.goalOutput },
    draggable: true,
  }

  const flowNodes = [briefInputNode, ...paletteNodes, goalNode]
  const flowEdges: Edge[] = []

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
      </header>

      <div className="flex-1 relative">
        <BriefCanvas
          briefId={id}
          initialNodes={flowNodes}
          initialEdges={flowEdges}
          initialChainIds={canvasState.chainIds ?? []}
          initialGoalOutput={canvasState.goalOutput}
          title={brief.title}
          brand={brief.brand}
        />
        {building === 'true' && <BuildingOverlay briefId={id} />}
      </div>
    </div>
  )
}

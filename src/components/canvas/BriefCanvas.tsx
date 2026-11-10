'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  SelectionMode,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeMouseHandler,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { BriefNode, type BriefNodeData } from './BriefNode'
import { NodePanel } from './NodePanel'
import { GoalPanel } from './GoalPanel'
import { BriefInput, GoalNode } from './CanvasDecorations'
import { NODE_HEIGHT, NODE_WIDTH } from '@/lib/canvas/layout'

const nodeTypes = { briefNode: BriefNode, briefInput: BriefInput, goalNode: GoalNode }

// Keep the insertion target deliberately narrow so moving a floating node near
// the chain does not unexpectedly wire it in.
const CHAIN_TOLERANCE = 64
const CHAIN_STYLE = { stroke: '#38bdf8', strokeWidth: 2 }
const SPINE_STYLE = { stroke: '#334155', strokeWidth: 1.5, strokeDasharray: '8 4' }
const GOAL_OPTIONS = ['Strategy paper', 'Creative brief', 'Marketing brief', 'Campaign brief']

interface Point { x: number; y: number }

function getSpine(nodes: Node[]) {
  const brief = nodes.find(node => node.id === 'brief-input')
  const goal = nodes.find(node => node.id === 'goal-output')
  if (!brief || !goal) return null
  return {
    start: { x: brief.position.x + 280, y: brief.position.y + 110 },
    end: { x: goal.position.x, y: goal.position.y + 110 },
  }
}

function computeChainPositions(ids: string[], nodes: Node[]) {
  const positions = new Map<string, { x: number; y: number }>()
  const spine = getSpine(nodes)
  if (!spine) return positions
  ids.forEach((id, i) => {
    const pct = (i + 1) / (ids.length + 1)
    positions.set(id, {
      x: spine.start.x + pct * (spine.end.x - spine.start.x) - NODE_WIDTH / 2,
      y: spine.start.y + pct * (spine.end.y - spine.start.y) - NODE_HEIGHT / 2,
    })
  })
  return positions
}

function distanceToSpine(point: Point, spine: { start: Point; end: Point }) {
  const dx = spine.end.x - spine.start.x
  const dy = spine.end.y - spine.start.y
  const lengthSquared = dx * dx + dy * dy
  if (!lengthSquared) return { distance: Infinity, progress: 0 }
  const progress = Math.max(0, Math.min(1, ((point.x - spine.start.x) * dx + (point.y - spine.start.y) * dy) / lengthSquared))
  const closest = { x: spine.start.x + progress * dx, y: spine.start.y + progress * dy }
  return { distance: Math.hypot(point.x - closest.x, point.y - closest.y), progress }
}

function buildChainEdges(chainIds: string[]): Edge[] {
  if (chainIds.length === 0) {
    return [{ id: 'spine', source: 'brief-input', target: 'goal-output', style: SPINE_STYLE, animated: false }]
  }
  return [
    { id: 'e-brief-0', source: 'brief-input', target: chainIds[0], style: CHAIN_STYLE, animated: false },
    ...chainIds.slice(0, -1).map((id, i) => ({
      id: `e-chain-${i}`,
      source: id,
      target: chainIds[i + 1],
      style: CHAIN_STYLE,
      animated: false,
    })),
    { id: 'e-last-goal', source: chainIds[chainIds.length - 1], target: 'goal-output', style: CHAIN_STYLE, animated: false },
  ]
}

function sameChain(a: string[] | null, b: string[]) {
  return a !== null && a.length === b.length && a.every((id, index) => id === b[index])
}

interface BriefCanvasProps {
  initialNodes: Node[]
  initialEdges: Edge[]
  initialChainIds?: string[]
  initialGoalOutput?: string
  briefId: string
  title: string
  brand?: string | null
}

interface PaletteNode {
  key: string
  label: string
  door: string
  description: string
}

export function BriefCanvas({ initialNodes, initialEdges, initialChainIds = [], initialGoalOutput, briefId }: BriefCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [chainIds, setChainIds] = useState<string[]>(initialChainIds)
  const [selectedData, setSelectedData] = useState<BriefNodeData | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([])
  const [showGoalPanel, setShowGoalPanel] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [palette, setPalette] = useState<PaletteNode[]>([])
  const [showPalette, setShowPalette] = useState(false)
  const [adding, setAdding] = useState(false)
  const [buildingGoal, setBuildingGoal] = useState(false)
  const [goalOutput, setGoalOutput] = useState<string | undefined>(initialGoalOutput)
  const [goalChanges, setGoalChanges] = useState<{ added: string[]; removed: string[]; reordered: boolean; goalChanged: boolean } | undefined>()
  const initialGoal = String(initialNodes.find(node => node.id === 'goal-output')?.data?.goal ?? 'Campaign Brief')
  const [builtGoal, setBuiltGoal] = useState(initialGoal)
  const [builtChainIds, setBuiltChainIds] = useState<string[] | null>(
    initialGoalOutput ? [...initialChainIds] : null,
  )
  const [builtChainLabels, setBuiltChainLabels] = useState<Record<string, string>>(() => Object.fromEntries(initialNodes.map(node => [node.id, String(node.data?.label ?? node.data?.type_key ?? node.id)])))
  const [goalError, setGoalError] = useState<string | null>(null)
  const currentGoal = String(nodes.find(node => node.id === 'goal-output')?.data?.goal ?? initialGoal)
  const goalDirty = !sameChain(builtChainIds, chainIds) || currentGoal !== builtGoal
  const paletteRef = useRef<HTMLDivElement>(null)
  const hasMounted = useRef(false)

  useEffect(() => {
    if (!showPalette) return
    function closeOnOutside(event: MouseEvent) {
      if (paletteRef.current && !paletteRef.current.contains(event.target as globalThis.Node)) setShowPalette(false)
    }
    document.addEventListener('mousedown', closeOnOutside)
    return () => document.removeEventListener('mousedown', closeOnOutside)
  }, [showPalette])

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true
      return
    }
    const timer = window.setTimeout(() => {
      const nodePositions: Record<string, { x: number; y: number }> = {}
      nodes.filter(node => node.type === 'briefNode').forEach(node => { nodePositions[node.id] = node.position })
      const briefInput = nodes.find(node => node.id === 'brief-input')
      const goal = nodes.find(node => node.id === 'goal-output')
      fetch(`/api/briefs/${briefId}/canvas`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canvas_state: {
          nodes: nodePositions,
          briefPosition: briefInput?.position,
          goalPosition: goal?.position,
          chainIds,
          goalOutput,
        } }),
      }).catch(() => {})
    }, 450)
    return () => window.clearTimeout(timer)
  }, [briefId, nodes, chainIds, goalOutput])

  useEffect(() => {
    fetch(`/api/briefs/${briefId}/nodes`)
      .then(response => response.json())
      .then(json => setPalette(json.nodes ?? []))
      .catch(() => setError('Could not load the node library.'))
  }, [briefId])

  // Reposition all nodes and rebuild edges whenever the chain changes
  useEffect(() => {
    const chainPos = computeChainPositions(chainIds, nodes)

    setNodes(nds => {
      return nds.map(node => {
        if (node.type !== 'briefNode') return node
        const inChain = chainIds.includes(node.id)
        const pos = inChain ? chainPos.get(node.id) : undefined
        return { ...node, ...(pos ? { position: pos } : {}), data: { ...node.data, active: inChain } }
      })
    })

    setEdges(buildChainEdges(chainIds))
  }, [chainIds]) // eslint-disable-line react-hooks/exhaustive-deps

  const onNodeDragStop = useCallback((_: unknown, node: Node) => {
    if (node.type !== 'briefNode') {
      if (chainIds.length && (node.id === 'brief-input' || node.id === 'goal-output')) {
        setNodes(current => {
          const moved = current.map(item => item.id === node.id ? { ...item, position: node.position } : item)
          const chainPos = computeChainPositions(chainIds, moved)
          return moved.map(item => {
            const position = chainPos.get(item.id)
            return position ? { ...item, position } : item
          })
        })
      }
      return
    }
    const wasInChain = chainIds.includes(node.id)
    const spine = getSpine(nodes)
    const center = { x: node.position.x + NODE_WIDTH / 2, y: node.position.y + NODE_HEIGHT / 2 }
    const drop = spine ? distanceToSpine(center, spine) : { distance: Infinity, progress: 0 }

    if (drop.distance < CHAIN_TOLERANCE) {
      const without = chainIds.filter(id => id !== node.id)
      const idx = Math.round(drop.progress * without.length)
      const newChain = [...without]
      newChain.splice(idx, 0, node.id)
      setChainIds(newChain)
    } else if (wasInChain) {
      setChainIds(chainIds.filter(id => id !== node.id))
    }
  }, [chainIds, nodes])

  const onNodeClick: NodeMouseHandler = useCallback((_, node) => {
    if (node.type === 'goalNode') {
      setSelectedData(null)
      setSelectedNodeId(null)
      setShowGoalPanel(true)
      return
    }
    if (node.type !== 'briefNode') return
    setShowGoalPanel(false)
    setSelectedNodeId(node.id)
    setSelectedNodeIds([node.id])
    setSelectedData(node.data as BriefNodeData)
  }, [])

  const onSelectionChange = useCallback(({ nodes: selected }: { nodes: Node[] }) => {
    setSelectedNodeIds(selected.filter(node => node.type === 'briefNode').map(node => node.id))
  }, [])

  const onPaneClick = useCallback(() => {
    setSelectedData(null)
    setSelectedNodeId(null)
    setSelectedNodeIds([])
    setShowGoalPanel(false)
  }, [])

  async function removeNode(nodeId: string) {
    if (!window.confirm('Remove this node and its connections?')) return
    setError(null)
    try {
      const response = await fetch(`/api/nodes/${nodeId}`, { method: 'DELETE' })
      const json = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(json.error ?? 'Could not remove node')
      setChainIds(chain => chain.filter(id => id !== nodeId))
      setNodes(current => current.filter(node => node.id !== nodeId))
      setSelectedNodeId(null)
      setSelectedNodeIds(ids => ids.filter(id => id !== nodeId))
      setSelectedData(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove node')
    }
  }

  async function addNodeFromPalette(item: PaletteNode) {
    if (adding) return
    setAdding(true)
    setError(null)
    try {
      const floatingCount = nodes.filter(item => item.type === 'briefNode' && !chainIds.includes(item.id)).length
      const position = {
        x: 520 + (floatingCount % 3) * 270,
        y: 70 + Math.floor(floatingCount / 3) * 170,
      }
      const pendingId = `pending-${item.key}`
      setNodes(current => [...current, {
        id: pendingId,
        type: 'briefNode',
        position,
        data: {
          label: item.label,
          status: 'missing',
          content: {},
          door: item.door,
          type_key: item.key,
          prompt: item.description,
          loading: true,
          active: false,
        },
      }])
      setShowPalette(false)

      // The request can take a while while the node is contextualized. Replace
      // the lightweight reading state when the generated node comes back.
      const response = await fetch(`/api/briefs/${briefId}/nodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type_key: item.key, door: item.door }),
      })
      const json = await response.json()
      if (!response.ok) throw new Error(json.error ?? 'Could not add node')
      setNodes(current => current.map(node => node.id === pendingId
        ? { ...json.node, position, data: { ...json.node.data, active: false, loading: false } }
        : node))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add node')
      setNodes(current => current.map(node => node.id === `pending-${item.key}`
        ? { ...node, data: { ...node.data, loading: false, content: { question: 'Could not finish reading the brief. Try again.' } } }
        : node))
    } finally {
      setAdding(false)
    }
  }

  async function buildGoal() {
    const previousChainIds = builtChainIds ?? []
    const previousGoal = builtGoal
    const nextChainIds = [...chainIds]
    const labels = new Map(nodes.map(node => [node.id, String(node.data?.label ?? node.data?.type_key ?? node.id)]))
    const added = nextChainIds.filter(id => !previousChainIds.includes(id)).map(id => labels.get(id) ?? id)
    const removed = previousChainIds.filter(id => !nextChainIds.includes(id)).map(id => builtChainLabels[id] ?? id)
    const reordered = added.length === 0 && removed.length === 0 && previousChainIds.join('|') !== nextChainIds.join('|')
    const goalChanged = currentGoal !== previousGoal
    setBuildingGoal(true)
    setGoalError(null)
    setShowGoalPanel(true)
    setGoalOutput('')
    // Let React paint the open progress panel before starting the request.
    await new Promise<void>(resolve => window.requestAnimationFrame(() => resolve()))
    try {
      const canvasNodeIds = nodes.filter(node => node.type === 'briefNode').map(node => node.id)
      const response = await fetch(`/api/briefs/${briefId}/goal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ node_ids: canvasNodeIds, chain_ids: chainIds }),
      })
      if (!response.ok) {
        const json = await response.json().catch(() => ({}))
        throw new Error(json.error ?? 'Could not build Goal')
      }
      if (!response.body) throw new Error('Goal build returned no stream')
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let output = ''
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        output += decoder.decode(value, { stream: true })
        setGoalOutput(output)
      }
      output += decoder.decode()
      if (output) setGoalOutput(output)
      if (!output.trim()) throw new Error('Goal build returned no text')
      setBuiltChainIds([...chainIds])
      setBuiltChainLabels(Object.fromEntries(nodes.map(node => [node.id, String(node.data?.label ?? node.data?.type_key ?? node.id)])))
      setBuiltGoal(currentGoal)
      setGoalChanges({ added, removed, reordered, goalChanged })
    } catch (err) {
      setGoalError(err instanceof Error ? err.message : 'Could not build Goal')
    } finally {
      setBuildingGoal(false)
    }
  }

  async function changeGoal(goal: string) {
    const nextGoal = goal.trim()
    if (!nextGoal || nextGoal === currentGoal) return
    if (goalOutput && !window.confirm('Change the Goal and replace the current recommendation? Your nodes will remain.')) return
    setError(null)
    try {
      const response = await fetch(`/api/briefs/${briefId}/goal-config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: nextGoal }),
      })
      const json = await response.json()
      if (!response.ok) throw new Error(json.error ?? 'Could not change Goal')
      setNodes(current => current.map(node => node.id === 'goal-output' ? { ...node, data: { ...node.data, goal: json.goal } } : node))
      setGoalOutput(undefined)
      setGoalError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change Goal')
    }
  }

  const existingKeys = new Set(nodes.filter(node => node.type === 'briefNode').map(node => (node.data as BriefNodeData).type_key))
  const flowNodes = nodes.map(node => node.id === 'goal-output'
    ? { ...node, data: { ...node.data, onBuild: buildGoal, building: buildingGoal, output: goalOutput, error: goalError, dirty: goalDirty, goalOptions: GOAL_OPTIONS, onChangeGoal: changeGoal } }
    : node.type === 'briefNode'
      ? { ...node, data: { ...node.data, onRemove: () => removeNode(node.id) } }
      : node)

  return (
    <div className="relative w-full h-full">
      {/* The canvas starts immediately below the page header. Pull the toolbar
          into that existing white header, using the same 20px side / 12px
          vertical spacing as the header content. */}
      <div className="absolute -top-11 right-5 z-30 flex items-center gap-2">
        {error && <p className="max-w-xs rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 shadow">{error}</p>}
        <div ref={paletteRef} className="relative">
          <button onClick={() => setShowPalette(value => !value)} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-lg hover:bg-slate-800">
            {adding ? 'Adding…' : '+ Add node'}
          </button>
          {showPalette && (
            <div className="absolute right-0 top-12 max-h-[min(70vh,520px)] w-[360px] overflow-y-auto rounded-xl border border-slate-300 bg-white p-4 shadow-xl">
              <p className="pb-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">Node library</p>
              {palette.map(item => (
                <button
                  key={item.key}
                  disabled={adding || existingKeys.has(item.key)}
                  onClick={() => addNodeFromPalette(item)}
                  className="mb-2 w-full rounded-lg border border-slate-200 bg-white p-4 text-left text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <span className="flex items-center justify-between gap-2 text-xs font-semibold">
                    <span>{item.label}</span>
                    <span className="text-[10px] font-medium text-slate-400">{existingKeys.has(item.key) ? 'Added' : 'Add'}</span>
                  </span>
                  <span className="mt-1 block text-[11px] leading-relaxed text-slate-500">{item.description}</span>
                </button>
              ))}
              {!palette.length && <p className="px-2 py-3 text-xs text-slate-400">Loading node library…</p>}
              <p className="pt-2 text-[10px] leading-relaxed text-slate-400">Add any available node, then drag it onto the Brief → Goal line when you want it in the chain.</p>
            </div>
          )}
        </div>
      </div>

      <ReactFlow
        nodes={flowNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onSelectionChange={onSelectionChange}
        onNodeDragStop={onNodeDragStop}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        minZoom={0.1}
        maxZoom={2}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
        selectionOnDrag={true}
        selectionMode={SelectionMode.Partial}
        panOnDrag={[1, 2]}
        panOnScroll={true}
        zoomOnScroll={false}
        zoomOnPinch={true}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#303642" gap={20} />
        <Controls showInteractive={false} />
          <MiniMap nodeColor={miniMapColor} maskColor="rgba(255,255,255,0.7)" className="!rounded-md !border !border-slate-300 !bg-white !shadow-sm" />
      </ReactFlow>

      {selectedData && selectedNodeId && (
        <NodePanel
          nodeId={selectedNodeId}
          data={selectedData}
          onClose={() => { setSelectedData(null); setSelectedNodeId(null) }}
          onApplied={() => window.location.reload()}
        />
      )}
      {showGoalPanel && (
        <GoalPanel
          goal={String(nodes.find(node => node.id === 'goal-output')?.data?.goal ?? 'Campaign Brief')}
          output={goalOutput}
          building={buildingGoal}
          error={goalError}
          changes={goalChanges}
          onClose={() => setShowGoalPanel(false)}
        />
      )}
    </div>
  )
}

function miniMapColor(node: Node) {
  if (node.type !== 'briefNode') return '#64748b'
  const status = (node.data as BriefNodeData)?.status
  const map: Record<string, string> = {
    confirmed: '#6ee7b7',
    drafted: '#93c5fd',
    vague: '#fcd34d',
    missing: '#fca5a5',
    rejected: '#d1d5db',
    needs_review: '#fdba74',
    changed: '#c4b5fd',
  }
  return map[status] ?? '#e5e7eb'
}

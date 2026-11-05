export type NodeStatus =
  | 'confirmed'
  | 'drafted'
  | 'vague'
  | 'missing'
  | 'rejected'
  | 'needs_review'
  | 'changed'

export interface GraphNode {
  id: string
  type_key: string
  door: string
  status: NodeStatus
  content: Record<string, unknown>
  assumption?: string
  version: number
  built_from: Record<string, number>
}

export interface GraphEdge {
  id: string
  from_node: string
  to_node: string
  port_key: string
  required: boolean
}

export interface CapResult {
  capped: boolean
  note?: string
  missing_inputs: string[]
}

export interface PropagationResult {
  affected_node_ids: string[]
  affected_edge_ids: string[]
}

export interface HealthResult {
  confirmed: number
  drafted: number
  vague: number
  missing: number
  needs_review: number
  rejected: number
  total: number
  score: number
}

/**
 * A node cannot be 'confirmed' while any required input is 'missing'.
 * Returns a cap note listing those inputs if violated.
 */
export function checkCap(
  node: GraphNode,
  edges: GraphEdge[],
  allNodes: GraphNode[]
): CapResult {
  if (node.status !== 'confirmed') {
    return { capped: false, missing_inputs: [] }
  }

  const nodeMap = new Map(allNodes.map(n => [n.id, n]))
  const requiredInputEdges = edges.filter(e => e.to_node === node.id && e.required)

  const missingInputs = requiredInputEdges
    .map(e => nodeMap.get(e.from_node))
    .filter(n => n?.status === 'missing')
    .map(n => n!.type_key)

  if (missingInputs.length > 0) {
    return {
      capped: true,
      note: `Can't be confirmed yet. Waiting on: ${missingInputs.join(', ')}.`,
      missing_inputs: missingInputs,
    }
  }

  return { capped: false, missing_inputs: [] }
}

/**
 * BFS from changedNodeId. Every reachable downstream node becomes 'needs_review',
 * unless it is already 'missing' or 'rejected' (those are skipped and not traversed further).
 * Returns all affected node and edge ids for UI highlighting.
 */
export function propagate(
  changedNodeId: string,
  edges: GraphEdge[],
  allNodes: GraphNode[]
): PropagationResult {
  const affectedNodeIds: string[] = []
  const affectedEdgeIds: string[] = []
  const visited = new Set<string>([changedNodeId])
  const queue = [changedNodeId]

  while (queue.length > 0) {
    const currentId = queue.shift()!
    const outgoing = edges.filter(e => e.from_node === currentId)

    for (const edge of outgoing) {
      const target = allNodes.find(n => n.id === edge.to_node)
      if (!target) continue

      affectedEdgeIds.push(edge.id)

      if (visited.has(target.id)) continue
      visited.add(target.id)

      if (target.status === 'missing' || target.status === 'rejected') continue

      affectedNodeIds.push(target.id)
      queue.push(target.id)
    }
  }

  return { affected_node_ids: affectedNodeIds, affected_edge_ids: affectedEdgeIds }
}

/**
 * Counts nodes by status and returns a health score (0–100).
 * Score = % of nodes that are confirmed or drafted.
 */
export function computeHealth(nodes: GraphNode[]): HealthResult {
  const counts = {
    confirmed: 0,
    drafted: 0,
    vague: 0,
    missing: 0,
    needs_review: 0,
    rejected: 0,
  }

  for (const node of nodes) {
    if (node.status in counts) {
      counts[node.status as keyof typeof counts]++
    }
  }

  const total = nodes.length
  const score =
    total > 0
      ? Math.round(((counts.confirmed + counts.drafted) / total) * 100)
      : 0

  return { ...counts, total, score }
}

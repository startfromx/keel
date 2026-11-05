import { describe, it, expect } from 'vitest'
import { checkCap, propagate, computeHealth, GraphNode, GraphEdge } from './rules'

function node(overrides: Partial<GraphNode> & { id: string }): GraphNode {
  return {
    type_key: overrides.id,
    door: 'research',
    status: 'drafted',
    content: {},
    version: 1,
    built_from: {},
    ...overrides,
  }
}

function edge(overrides: Partial<GraphEdge> & { id: string; from_node: string; to_node: string }): GraphEdge {
  return {
    port_key: 'default',
    required: true,
    ...overrides,
  }
}

// ── checkCap ──────────────────────────────────────────────────────────────────

describe('checkCap', () => {
  it('does not cap when status is not confirmed', () => {
    const n = node({ id: 'a', status: 'drafted' })
    const result = checkCap(n, [], [n])
    expect(result.capped).toBe(false)
  })

  it('does not cap when no required inputs are missing', () => {
    const a = node({ id: 'a', status: 'confirmed' })
    const b = node({ id: 'b', status: 'confirmed' })
    const e = edge({ id: 'e1', from_node: 'b', to_node: 'a', required: true })
    expect(checkCap(a, [e], [a, b]).capped).toBe(false)
  })

  it('caps and returns a note when a required input is missing', () => {
    const a = node({ id: 'a', status: 'confirmed' })
    const b = node({ id: 'b', status: 'missing', type_key: 'market_facts' })
    const e = edge({ id: 'e1', from_node: 'b', to_node: 'a', required: true })
    const result = checkCap(a, [e], [a, b])
    expect(result.capped).toBe(true)
    expect(result.missing_inputs).toContain('market_facts')
    expect(result.note).toMatch(/market_facts/)
  })

  it('does not cap for optional missing inputs', () => {
    const a = node({ id: 'a', status: 'confirmed' })
    const b = node({ id: 'b', status: 'missing' })
    const e = edge({ id: 'e1', from_node: 'b', to_node: 'a', required: false })
    expect(checkCap(a, [e], [a, b]).capped).toBe(false)
  })

  it('caps only on required missing inputs when mixed', () => {
    const a = node({ id: 'a', status: 'confirmed' })
    const req = node({ id: 'req', status: 'missing', type_key: 'budget' })
    const opt = node({ id: 'opt', status: 'missing', type_key: 'market_facts' })
    const e1 = edge({ id: 'e1', from_node: 'req', to_node: 'a', required: true })
    const e2 = edge({ id: 'e2', from_node: 'opt', to_node: 'a', required: false })
    const result = checkCap(a, [e1, e2], [a, req, opt])
    expect(result.capped).toBe(true)
    expect(result.missing_inputs).toEqual(['budget'])
  })
})

// ── propagate ─────────────────────────────────────────────────────────────────

describe('propagate', () => {
  it('marks direct downstream nodes as affected', () => {
    const a = node({ id: 'a' })
    const b = node({ id: 'b' })
    const e = edge({ id: 'e1', from_node: 'a', to_node: 'b' })
    const result = propagate('a', [e], [a, b])
    expect(result.affected_node_ids).toContain('b')
    expect(result.affected_edge_ids).toContain('e1')
  })

  it('traverses multiple levels (BFS)', () => {
    const a = node({ id: 'a' })
    const b = node({ id: 'b' })
    const c = node({ id: 'c' })
    const edges = [
      edge({ id: 'e1', from_node: 'a', to_node: 'b' }),
      edge({ id: 'e2', from_node: 'b', to_node: 'c' }),
    ]
    const result = propagate('a', edges, [a, b, c])
    expect(result.affected_node_ids).toContain('b')
    expect(result.affected_node_ids).toContain('c')
  })

  it('skips missing nodes and does not traverse through them', () => {
    const a = node({ id: 'a' })
    const b = node({ id: 'b', status: 'missing' })
    const c = node({ id: 'c' })
    const edges = [
      edge({ id: 'e1', from_node: 'a', to_node: 'b' }),
      edge({ id: 'e2', from_node: 'b', to_node: 'c' }),
    ]
    const result = propagate('a', edges, [a, b, c])
    expect(result.affected_node_ids).not.toContain('b')
    expect(result.affected_node_ids).not.toContain('c')
    expect(result.affected_edge_ids).toContain('e1')
  })

  it('skips rejected nodes and does not traverse through them', () => {
    const a = node({ id: 'a' })
    const b = node({ id: 'b', status: 'rejected' })
    const edges = [edge({ id: 'e1', from_node: 'a', to_node: 'b' })]
    const result = propagate('a', edges, [a, b])
    expect(result.affected_node_ids).not.toContain('b')
    expect(result.affected_edge_ids).toContain('e1')
  })

  it('handles diamond graphs without visiting nodes twice', () => {
    // a -> b -> d
    // a -> c -> d
    const a = node({ id: 'a' })
    const b = node({ id: 'b' })
    const c = node({ id: 'c' })
    const d = node({ id: 'd' })
    const edges = [
      edge({ id: 'e1', from_node: 'a', to_node: 'b' }),
      edge({ id: 'e2', from_node: 'a', to_node: 'c' }),
      edge({ id: 'e3', from_node: 'b', to_node: 'd' }),
      edge({ id: 'e4', from_node: 'c', to_node: 'd' }),
    ]
    const result = propagate('a', edges, [a, b, c, d])
    const count = result.affected_node_ids.filter(id => id === 'd').length
    expect(count).toBe(1)
  })

  it('returns empty arrays when no downstream nodes exist', () => {
    const a = node({ id: 'a' })
    const result = propagate('a', [], [a])
    expect(result.affected_node_ids).toHaveLength(0)
    expect(result.affected_edge_ids).toHaveLength(0)
  })
})

// ── computeHealth ─────────────────────────────────────────────────────────────

describe('computeHealth', () => {
  it('counts nodes by status', () => {
    const nodes = [
      node({ id: '1', status: 'confirmed' }),
      node({ id: '2', status: 'confirmed' }),
      node({ id: '3', status: 'drafted' }),
      node({ id: '4', status: 'missing' }),
      node({ id: '5', status: 'vague' }),
    ]
    const result = computeHealth(nodes)
    expect(result.confirmed).toBe(2)
    expect(result.drafted).toBe(1)
    expect(result.missing).toBe(1)
    expect(result.vague).toBe(1)
    expect(result.total).toBe(5)
  })

  it('calculates score as % of confirmed + drafted', () => {
    const nodes = [
      node({ id: '1', status: 'confirmed' }),
      node({ id: '2', status: 'drafted' }),
      node({ id: '3', status: 'missing' }),
      node({ id: '4', status: 'missing' }),
    ]
    const result = computeHealth(nodes)
    expect(result.score).toBe(50)
  })

  it('returns 0 score for empty node list', () => {
    expect(computeHealth([]).score).toBe(0)
    expect(computeHealth([]).total).toBe(0)
  })

  it('returns 100 score when all nodes are confirmed', () => {
    const nodes = [
      node({ id: '1', status: 'confirmed' }),
      node({ id: '2', status: 'confirmed' }),
    ]
    expect(computeHealth(nodes).score).toBe(100)
  })
})

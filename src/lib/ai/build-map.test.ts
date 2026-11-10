import { describe, expect, it } from 'vitest'
import { buildEdgeRecords } from './build-map'
import type { RecipeNodeDef } from '@/lib/recipe/loader'

function def(key: string, provides: string, extra: Partial<RecipeNodeDef> = {}): RecipeNodeDef {
  return { key, label: key, door: 'research', provides, schema: {}, status_rules: {}, prompt: '', ...extra }
}

describe('buildEdgeRecords', () => {
  it('wires required and optional recipe ports with the correct flags', () => {
    const defs = [
      def('research', 'research_facts'),
      def('objective', 'objective', { requires: ['research_facts'], optional: ['market_context'] }),
      def('market', 'market_context'),
    ]
    const ids = { research: 'n1', objective: 'n2', market: 'n3' }
    const edges = buildEdgeRecords(defs, ids, new Set(Object.values(ids)))
    expect(edges).toHaveLength(2)
    expect(edges.map(edge => ({ from: edge.from_node, to: edge.to_node, port: edge.port_key, required: edge.required }))).toEqual([
      { from: 'n1', to: 'n2', port: 'research_facts', required: true },
      { from: 'n3', to: 'n2', port: 'market_context', required: false },
    ])
  })

  it('skips intake ports, wildcard ports, and sources not persisted', () => {
    const defs = [
      def('input', 'input'),
      def('target', 'target', { requires: ['brief_raw', 'missing_source'], optional: ['*'] }),
    ]
    const edges = buildEdgeRecords(defs, { input: 'n1', target: 'n2' }, new Set(['n1', 'n2']))
    expect(edges).toEqual([])
  })
})

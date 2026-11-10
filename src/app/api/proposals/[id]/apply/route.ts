import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { propagate, type GraphEdge, type GraphNode, type NodeStatus } from '@/lib/engine/rules'

function setAtPath(value: unknown, path: string, replacement: unknown): Record<string, unknown> {
  const root = structuredClone((value ?? {}) as Record<string, unknown>)
  const parts = path.split('.')
  let cursor: Record<string, unknown> | unknown[] = root
  parts.forEach((part, index) => {
    const last = index === parts.length - 1
    const container = cursor as Record<string, unknown> | unknown[]
    if (last) {
      if (Array.isArray(container)) container[Number(part)] = replacement
      else container[part] = replacement
      return
    }
    const nextPart = parts[index + 1]
    const next = Array.isArray(container) ? container[Number(part)] : container[part]
    if (Array.isArray(container)) {
      if (next === undefined || next === null) container[Number(part)] = /^\d+$/.test(nextPart) ? [] : {}
      cursor = container[Number(part)] as Record<string, unknown> | unknown[]
    } else {
      if (next === undefined || next === null) container[part] = /^\d+$/.test(nextPart) ? [] : {}
      cursor = container[part] as Record<string, unknown> | unknown[]
    }
  })
  return root
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const body = await request.json().catch(() => ({})) as { action?: 'apply' | 'dismiss' }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: proposal } = await supabase.from('proposals').select('*').eq('id', id).single()
  if (!proposal) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (proposal.state !== 'pending') return NextResponse.json({ error: 'Proposal is no longer pending' }, { status: 409 })

  if (body.action !== 'apply' && body.action !== 'dismiss') {
    return NextResponse.json({ error: 'Action must be apply or dismiss' }, { status: 400 })
  }

  if (body.action === 'dismiss') {
    const { error } = await supabase.from('proposals').update({ state: 'dismissed' }).eq('id', id).eq('state', 'pending')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, state: 'dismissed' })
  }

  const { data: node } = await supabase.from('nodes').select('*').eq('id', proposal.node_id).single()
  if (!node) return NextResponse.json({ error: 'Node not found' }, { status: 404 })
  const [{ data: allNodeRows }, { data: edgeRows }] = await Promise.all([
    supabase.from('nodes').select('*').eq('brief_id', node.brief_id),
    supabase.from('edges').select('*').eq('brief_id', node.brief_id),
  ])
  const allNodes = (allNodeRows ?? []) as GraphNode[]
  const edges = (edgeRows ?? []) as GraphEdge[]
  const before = { content: node.content, status: node.status, version: node.version }
  const proposedStatus = (proposal.proposed_status ?? node.status) as NodeStatus
  const nextVersion = Number(node.version ?? 1) + 1
  const proposalContent = proposal.proposed_content as Record<string, unknown>
  const targetSection = typeof proposalContent.__keel_target_section === 'string' ? proposalContent.__keel_target_section : null
  const nextContent = targetSection
    ? setAtPath(node.content, targetSection, proposalContent.__keel_proposed_value)
    : proposalContent

  const { error: updateError } = await supabase.from('nodes').update({
    content: nextContent,
    status: proposedStatus,
    version: nextVersion,
    built_from: {},
  }).eq('id', node.id)
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  const changedNode = { ...allNodes.find(n => n.id === node.id)!, content: nextContent, status: proposedStatus, version: nextVersion }
  const propagation = propagate(node.id, edges, allNodes)
  if (propagation.affected_node_ids.length > 0) {
    const { error } = await supabase.from('nodes').update({ status: 'needs_review' }).in('id', propagation.affected_node_ids)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }
  const { error: proposalUpdateError } = await supabase.from('proposals').update({ state: 'applied' }).eq('id', id).eq('state', 'pending')
  if (proposalUpdateError) return NextResponse.json({ error: proposalUpdateError.message }, { status: 500 })
  const { error: eventError } = await supabase.from('events').insert({
    brief_id: node.brief_id,
    node_id: node.id,
    actor: 'user',
    action: 'proposal_applied',
    before,
    after: { content: changedNode.content, status: changedNode.status, version: changedNode.version, propagation },
  })
  if (eventError) return NextResponse.json({ error: eventError.message }, { status: 500 })
  return NextResponse.json({ ok: true, propagation })
}

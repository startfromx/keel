import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { propagate, type GraphEdge, type GraphNode, type NodeStatus } from '@/lib/engine/rules'

const PROPOSAL_TOOL: Anthropic.Tool = {
  name: 'propose_node_update',
  description: 'Propose a revised node after considering the user question or client answer.',
  input_schema: {
    type: 'object' as const,
    properties: {
      proposed_content: { type: 'object' },
      proposed_status: {
        type: 'string',
        enum: ['confirmed', 'drafted', 'vague', 'missing', 'rejected', 'needs_review', 'changed'],
      },
      rationale: { type: 'string' },
    },
    required: ['proposed_content', 'proposed_status', 'rationale'],
  },
}

function asGraphNode(row: Record<string, unknown>): GraphNode {
  return {
    id: String(row.id),
    type_key: String(row.type_key),
    door: String(row.door),
    status: row.status as NodeStatus,
    content: (row.content ?? {}) as Record<string, unknown>,
    assumption: row.assumption ? String(row.assumption) : undefined,
    version: Number(row.version ?? 1),
    built_from: (row.built_from ?? {}) as Record<string, number>,
  }
}

function getAtPath(value: unknown, path: string) {
  return path.split('.').reduce<unknown>((current, part) => {
    if (Array.isArray(current)) return current[Number(part)]
    if (current && typeof current === 'object') return (current as Record<string, unknown>)[part]
    return undefined
  }, value)
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: node } = await supabase.from('nodes').select('id').eq('id', id).single()
  if (!node) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const [{ data: threads }, { data: proposals }] = await Promise.all([
    supabase.from('threads').select('id, role, text, created_at').eq('node_id', id).order('created_at'),
    supabase.from('proposals').select('id, proposed_content, proposed_status, affects, state, created_at').eq('node_id', id).order('created_at', { ascending: false }),
  ])
  return NextResponse.json({ threads: threads ?? [], proposals: proposals ?? [] })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const body = await request.json() as { text?: string; target_section?: string; current_value?: unknown; mode?: 'proposal' | 'client_question' }
  const text = body.text?.trim()
  if (!text) return NextResponse.json({ error: 'Message is required' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: node } = await supabase.from('nodes').select('*').eq('id', id).single()
  if (!node) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const currentTargetValue = body.target_section ? getAtPath(node.content, body.target_section) : undefined

  const { error: userThreadError } = await supabase.from('threads').insert({ node_id: id, role: 'user', text })
  if (userThreadError) return NextResponse.json({ error: userThreadError.message }, { status: 500 })

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'AI is not configured for this workspace' }, { status: 503 })
  }

  const [{ data: siblingNodes }, { data: edges }] = await Promise.all([
    supabase.from('nodes').select('*').eq('brief_id', node.brief_id),
    supabase.from('edges').select('*').eq('brief_id', node.brief_id),
  ])
  const currentNodes = (siblingNodes ?? []).map(asGraphNode)
  const currentEdges = (edges ?? []) as GraphEdge[]
  const context = currentNodes
    .filter(n => n.id === id || currentEdges.some(e => e.to_node === id && e.from_node === n.id))
    .map(n => ({ key: n.type_key, status: n.status, content: n.content }))

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    if (body.mode === 'client_question') {
      const questionResponse = await client.messages.create({
        model: process.env.THREAD_MODEL ?? 'claude-sonnet-4-6',
        max_tokens: 500,
        system: 'Turn the user request into one concise, client-facing question. Do not answer it, do not revise the node, and do not add commentary. Return only the question.',
        messages: [{
          role: 'user',
          content: [
            `Node: ${node.type_key}`,
            `Current paragraph or section: ${JSON.stringify(currentTargetValue ?? node.content)}`,
            `What the client needs to confirm: ${text}`,
          ].join('\n\n'),
        }],
      })
      const question = questionResponse.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map(block => block.text.trim())
        .join(' ')
      if (!question) throw new Error('AI returned no client question')
      await supabase.from('threads').insert({ node_id: id, role: 'ai', text: `[CLIENT QUESTION] ${question}` })
      return NextResponse.json({ client_question: question })
    }

    const response = await client.messages.create({
      model: process.env.THREAD_MODEL ?? 'claude-sonnet-4-6',
      max_tokens: 2500,
      system: 'You help revise one brief-map node. Never invent facts. Keep unknowns as [CONFIRM]. Return a proposal, never apply changes directly.',
      messages: [{
        role: 'user',
        content: [
          `Node: ${node.type_key}`,
          `Current status: ${node.status}`,
          `Current content: ${JSON.stringify(node.content)}`,
          `Relevant upstream context: ${JSON.stringify(context)}`,
          `User message: ${text}`,
          body.target_section
            ? `Target section: ${body.target_section}\nCurrent target value: ${JSON.stringify(body.current_value ?? currentTargetValue)}\nThis is a targeted inline request. Return proposed_content with only one key, exactly "${body.target_section}", whose value is the replacement for that section. Do not rewrite unrelated sections.`
            : '',
          'Propose the smallest defensible update and explain the rationale.',
        ].join('\n\n'),
      }],
      tools: [PROPOSAL_TOOL],
      tool_choice: { type: 'tool', name: 'propose_node_update' },
    })
    const toolUse = response.content.find((block): block is Anthropic.ToolUseBlock => block.type === 'tool_use')
    if (!toolUse) throw new Error('AI returned no proposal')
    const result = toolUse.input as { proposed_content: Record<string, unknown>; proposed_status: NodeStatus; rationale: string }
    const propagation = propagate(id, currentEdges, currentNodes)
    const proposedContent = body.target_section
      ? {
          __keel_target_section: body.target_section,
          __keel_current_value: body.current_value ?? currentTargetValue ?? null,
          __keel_proposed_value: result.proposed_content[body.target_section] ?? getAtPath(result.proposed_content, body.target_section) ?? result.proposed_content,
        }
      : result.proposed_content
    const { data: proposal, error: proposalError } = await supabase.from('proposals').insert({
      node_id: id,
      proposed_content: proposedContent,
      proposed_status: result.proposed_status,
      affects: propagation,
    }).select('id, proposed_content, proposed_status, affects, state, created_at').single()
    if (proposalError) throw new Error(proposalError.message)
    await supabase.from('threads').insert({ node_id: id, role: 'ai', text: result.rationale })
    return NextResponse.json({ proposal, rationale: result.rationale })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Proposal failed' }, { status: 500 })
  }
}

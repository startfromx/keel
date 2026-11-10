import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getNodeDef, getNodePalette, loadRecipeFromFile } from '@/lib/recipe/loader'

const DOORS = new Set(['research', 'objective', 'brief', 'outputs'])

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: brief } = await supabase.from('briefs').select('id').eq('id', id).single()
  if (!brief) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const recipe = loadRecipeFromFile()
  return NextResponse.json({ nodes: getNodePalette(recipe).map(node => ({
    key: node.key,
    label: node.label,
    door: node.door,
    description: node.prompt.replace(/\s+/g, ' ').trim().split(' ').slice(0, 14).join(' '),
  })) })
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as { type_key?: string; door?: string }
  const typeKey = body.type_key?.trim()
  const door = body.door?.trim()
  if (!typeKey || !door || !DOORS.has(door)) return NextResponse.json({ error: 'A valid node type and door are required' }, { status: 400 })

  const { data: brief } = await supabase.from('briefs').select('id, brand, goal, brief_type, brief_raw, role').eq('id', id).single()
  if (!brief) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { data: existing } = await supabase.from('nodes').select('id').eq('brief_id', id).eq('type_key', typeKey).maybeSingle()
  if (existing) return NextResponse.json({ error: 'That node is already on the map' }, { status: 409 })

  const recipe = loadRecipeFromFile()
  const nodeDef = getNodeDef(recipe, typeKey)
  if (!nodeDef) return NextResponse.json({ error: 'That node type is not in the recipe library' }, { status: 400 })

  let status = 'missing'
  let content: Record<string, unknown> = {
    question: `[CONFIRM] Add context for ${nodeDef.label} in this ${brief.goal ?? brief.brief_type ?? 'brief'}.`,
  }
  let assumption = 'This node was added after the initial build and needs contextual evidence.'

  if (process.env.ANTHROPIC_API_KEY) {
    const { data: existingNodes } = await supabase
      .from('nodes')
      .select('type_key, status, content, assumption')
      .eq('brief_id', id)
      .order('created_at')

    try {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      const response = await client.messages.create({
        model: process.env.BUILD_MODEL ?? 'claude-sonnet-4-6',
        max_tokens: 1600,
        system: 'You fill one newly added brief node using only the provided brief and existing node context. Never invent facts, numbers, approvals, or evidence. If the brief does not support a claim, use [CONFIRM] and mark the node missing or vague. Return the smallest useful structured object for the node.',
        messages: [{ role: 'user', content: [
          `Goal: ${brief.goal ?? brief.brief_type ?? 'Campaign Brief'}`,
          `Brand: ${brief.brand ?? ''}`,
          `Role: ${brief.role ?? ''}`,
          `Brief:\n${brief.brief_raw ?? ''}`,
          `Existing canvas nodes:\n${JSON.stringify(existingNodes ?? [], null, 2)}`,
          `Node to fill: ${nodeDef.label} (${nodeDef.key})`,
          `Node purpose: ${nodeDef.prompt}`,
          `Node schema: ${JSON.stringify(nodeDef.schema)}`,
        ].join('\n\n') }],
        tools: [{
          name: 'fill_added_node',
          description: 'Fill the newly added node with contextual content without inventing unsupported facts.',
          input_schema: {
            type: 'object' as const,
            properties: {
              content: { type: 'object' },
              status: { type: 'string', enum: ['drafted', 'vague', 'missing'] },
              assumption: { type: 'string' },
            },
            required: ['content', 'status'],
          },
        }],
        tool_choice: { type: 'tool', name: 'fill_added_node' },
      })
      const toolUse = response.content.find((block): block is Anthropic.ToolUseBlock => block.type === 'tool_use')
      if (toolUse) {
        const result = toolUse.input as { content?: Record<string, unknown>; status?: string; assumption?: string }
        if (result.content && typeof result.content === 'object') content = result.content
        if (result.status && ['drafted', 'vague', 'missing'].includes(result.status)) status = result.status
        if (result.assumption) assumption = result.assumption
      }
    } catch {
      // Keep the node usable as a contextual client question if the fill call fails.
    }
  }

  const { data: node, error } = await supabase.from('nodes').insert({
    brief_id: id, type_key: typeKey, door, status, content, assumption,
  }).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const labels: Record<string, string> = {
    market_facts: 'Market facts', business_problem: 'Business problem', audience: 'Audience', deliverables: 'Deliverables', timing: 'Timing',
  }
  return NextResponse.json({ node: {
    id: node.id, type: 'briefNode', position: { x: 0, y: 0 },
    data: { label: labels[typeKey] ?? typeKey.replace(/_/g, ' '), status: node.status, content: node.content ?? {}, assumption: node.assumption ?? undefined, prompt: nodeDef.prompt, door: node.door, type_key: node.type_key },
  } }, { status: 201 })
}

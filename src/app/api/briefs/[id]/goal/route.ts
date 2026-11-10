import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getNodeDef, loadRecipeFromFile } from '@/lib/recipe/loader'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json().catch(() => ({})) as { node_ids?: string[]; chain_ids?: string[] }
  const nodeIds = Array.isArray(body.node_ids) ? [...new Set(body.node_ids.filter(Boolean))] : []
  const chainIds = new Set(Array.isArray(body.chain_ids) ? body.chain_ids : [])
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: 'AI is not configured for this workspace' }, { status: 503 })

  const [{ data: brief }, { data: nodes }] = await Promise.all([
    supabase.from('briefs').select('brand, goal, brief_type, brief_raw, role').eq('id', id).single(),
    nodeIds.length ? supabase.from('nodes').select('id, type_key, status, content, assumption').eq('brief_id', id).in('id', nodeIds) : Promise.resolve({ data: [] as never[] }),
  ])
  if (!brief) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const recipe = loadRecipeFromFile()
  const context = (nodes ?? []).map(node => {
    const def = getNodeDef(recipe, node.type_key)
    return {
      node: def?.label ?? node.type_key,
      in_chain: chainIds.has(node.id),
      purpose: def?.prompt ?? 'Use this node to add relevant context to the goal.',
      status: node.status,
      assumption: node.assumption,
      content: node.content,
    }
  })

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  let stream
  try {
    stream = client.messages.stream({
      model: process.env.BUILD_MODEL ?? 'claude-sonnet-4-6',
      max_tokens: 2200,
    system: 'You are the Goal Node in a brief-building canvas. Use every node on the canvas as context, including floating nodes that are not on the Brief-to-Goal spine. Nodes marked in_chain are the user-selected working order and should receive extra weight, but floating nodes can still add evidence, constraints, questions, or alternative angles. Never invent facts, numbers, approvals, or evidence. Mark unknowns as [CONFIRM]. Write a useful draft that makes the effect of the canvas context clear. Return plain text with exactly these sections: RECOMMENDATION, WHY THIS FITS, OPEN QUESTIONS.',
      messages: [{ role: 'user', content: [
        `Goal: ${brief.goal ?? brief.brief_type ?? 'Campaign Brief'}`,
        `Brand: ${brief.brand ?? ''}`,
        `Role: ${brief.role ?? ''}`,
        `Brief:\n${brief.brief_raw ?? ''}`,
        `Active nodes wired into this Goal:\n${JSON.stringify(context, null, 2)}`,
      ].join('\n\n') }],
    })
  } catch (error) {
    const status = typeof error === 'object' && error && 'status' in error ? Number(error.status) : 0
    if (status === 401) return NextResponse.json({ error: 'Anthropic rejected this credential. Use an Anthropic Console API key, not a Claude.ai subscription/session credential.' }, { status: 502 })
    if (status === 402 || status === 403) return NextResponse.json({ error: 'Anthropic API access is not enabled for this credential or its Console workspace has no API credits.' }, { status: 502 })
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Anthropic Goal build failed' }, { status: 502 })
  }

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(event.delta.text))
          }
        }
        controller.close()
      } catch {
        controller.enqueue(encoder.encode('\n\n[The Goal build stopped before completion.]'))
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  })
}

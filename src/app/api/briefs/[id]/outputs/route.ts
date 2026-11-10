import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildOutputs, type OutputNode } from '@/lib/outputs/build-output'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: outputs, error } = await supabase.from('outputs').select('*').eq('brief_id', id).order('updated_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ outputs: outputs ?? [] })
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ data: brief }, { data: nodes }] = await Promise.all([
    supabase.from('briefs').select('id, title, brand').eq('id', id).single(),
    supabase.from('nodes').select('type_key, status, content, assumption').eq('brief_id', id),
  ])
  if (!brief) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const labels: Record<string, string> = {
    business_problem: 'The problem', audience: 'Who this is for', deliverables: 'What we need to deliver', timing: 'Timing',
  }
  const outputs = buildOutputs(brief, (nodes ?? []).map(node => ({ ...node, label: labels[node.type_key] ?? node.type_key })) as OutputNode[])
  await supabase.from('outputs').delete().eq('brief_id', id)
  const { data: saved, error } = await supabase.from('outputs').insert(outputs.map(output => ({ brief_id: id, kind: output.kind, content: output, built_from: {} }))).select('*')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ outputs: saved ?? [] })
}

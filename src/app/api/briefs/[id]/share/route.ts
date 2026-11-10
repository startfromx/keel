import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: output } = await supabase.from('outputs').select('id').eq('brief_id', id).eq('kind', 'boss_summary').limit(1).single()
  if (!output) return NextResponse.json({ error: 'Generate the Boss view output first' }, { status: 400 })
  const { data: link, error } = await supabase.from('share_links').insert({ brief_id: id, output_kind: 'boss_summary' }).select('token').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ url: `/share/${link.token}` })
}

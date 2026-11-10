import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as { canvas_state?: unknown }
  if (!body.canvas_state || typeof body.canvas_state !== 'object' || Array.isArray(body.canvas_state)) {
    return NextResponse.json({ error: 'canvas_state must be an object' }, { status: 400 })
  }
  const { data: brief } = await supabase.from('briefs').select('id').eq('id', id).single()
  if (!brief) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { error } = await supabase.from('briefs').update({ canvas_state: body.canvas_state }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

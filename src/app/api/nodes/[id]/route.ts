import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: node } = await supabase.from('nodes').select('id').eq('id', id).single()
  if (!node) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { error } = await supabase.from('nodes').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

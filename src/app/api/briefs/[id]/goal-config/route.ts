import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as { goal?: string }
  const goal = body.goal?.trim()
  if (!goal) return NextResponse.json({ error: 'Goal is required' }, { status: 400 })

  const { data, error } = await supabase.from('briefs').update({ goal }).eq('id', id).select('goal').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ goal: data.goal })
}

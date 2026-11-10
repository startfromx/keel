import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as {
    title?: string
    brand: string
    brief_type?: string
    role: string
    brief_raw: string
    goal?: string
    node_keys?: string[]
  }

  // Get or create workspace
  let { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('owner_id', user.id)
    .limit(1)
    .single()

  if (!workspace) {
    const { data: newWorkspace, error: wsErr } = await supabase
      .from('workspaces')
      .insert({ owner_id: user.id, name: 'My workspace' })
      .select('id')
      .single()
    if (wsErr) return NextResponse.json({ error: wsErr.message }, { status: 500 })
    workspace = newWorkspace
  }

  // Get published recipe
  const { data: recipe } = await supabase
    .from('recipes')
    .select('id, version')
    .eq('module', 'brief')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(1)
    .single()

  if (!recipe) return NextResponse.json({ error: 'No published recipe found' }, { status: 500 })

  const title = body.title?.trim() || `${body.brand} · ${body.goal ?? body.brief_type ?? 'Brief'}`

  const { data: brief, error } = await supabase
    .from('briefs')
    .insert({
      workspace_id: workspace.id,
      title,
      brand: body.brand,
      brief_type: body.brief_type ?? null,
      role: body.role,
      brief_raw: body.brief_raw,
      goal: body.goal ?? null,
      node_keys: body.node_keys ?? null,
      recipe_id: recipe.id,
      recipe_version: recipe.version,
      status: 'building',
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ id: brief.id }, { status: 201 })
}

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseRecipe, getStarterGraph, getNodePalette } from '@/lib/recipe/loader'
import { suggestComposition } from '@/lib/ai/suggestComposition'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as { goal?: string }
  if (!body.goal?.trim()) return NextResponse.json({ error: 'goal is required' }, { status: 400 })

  const { data: recipeRow } = await supabase
    .from('recipes')
    .select('source_yaml')
    .eq('module', 'brief')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(1)
    .single()

  if (!recipeRow?.source_yaml) return NextResponse.json({ error: 'No published recipe' }, { status: 500 })

  const recipe = parseRecipe(recipeRow.source_yaml)
  const palette = getNodePalette(recipe)

  // Preset goals resolve from starter_graphs immediately (no AI call).
  const preset = getStarterGraph(recipe, body.goal)
  let nodeKeys: string[]
  if (preset) {
    nodeKeys = preset.node_keys.filter(k => palette.some(n => n.key === k))
  } else {
    nodeKeys = await suggestComposition(body.goal, palette)
  }

  const nodes = nodeKeys
    .map(k => palette.find(n => n.key === k))
    .filter(Boolean)
    .map(n => ({ key: n!.key, label: n!.label, door: n!.door }))

  return NextResponse.json({ node_keys: nodeKeys, nodes })
}

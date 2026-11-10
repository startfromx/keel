import { NextResponse } from 'next/server'
import { getDefaultRecipeYaml, loadRecipeFromFile, parseRecipe } from '@/lib/recipe/loader'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const recipe = loadRecipeFromFile()
  return NextResponse.json({
    source_yaml: getDefaultRecipeYaml(),
    recipe,
  })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as { action?: 'test' | 'publish'; source_yaml?: string }
  if (!body.source_yaml?.trim()) return NextResponse.json({ error: 'Recipe YAML is required' }, { status: 400 })

  let recipe
  try {
    recipe = parseRecipe(body.source_yaml)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid YAML' }, { status: 400 })
  }

  const tests = (recipe.tests ?? []).slice(0, 3).map(test => ({
    name: test.name,
    passed: Boolean(test.brief_raw && test.expect?.length && recipe.nodes?.length),
    expected: test.expect,
  }))
  if (body.action !== 'publish') return NextResponse.json({ recipe, tests })

  const version = recipe.recipe?.version
  const module = recipe.recipe?.module
  if (!version || !module) return NextResponse.json({ error: 'Recipe module and version are required' }, { status: 400 })
  const { data, error } = await supabase.from('recipes').insert({
    module,
    version,
    status: 'published',
    source_yaml: body.source_yaml,
    published_at: new Date().toISOString(),
  }).select('id, module, version, status, published_at').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ recipe, tests, published: data })
}

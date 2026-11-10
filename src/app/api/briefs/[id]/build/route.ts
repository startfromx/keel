import { createClient } from '@/lib/supabase/server'
import { buildMap } from '@/lib/ai/build-map'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  console.log('[build route] GET called for brief:', id)
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  // Verify brief belongs to this user
  const { data: brief } = await supabase
    .from('briefs')
    .select('id, brand, brief_type, role, brief_raw, recipe_id, status, goal, node_keys')
    .eq('id', id)
    .single()

  if (!brief) return new Response('Not found', { status: 404 })

  // Only a brief explicitly marked built is considered complete. A failed or
  // interrupted build may have left partial nodes behind and must be retryable.
  const { count } = await supabase
    .from('nodes')
    .select('id', { count: 'exact', head: true })
    .eq('brief_id', id)

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        )
      }

      if (brief.status === 'built' && count && count > 0) {
        send('build_complete', { briefId: id })
        controller.close()
        return
      }

      try {
        if (count && count > 0 && brief.status !== 'built') {
          send('progress', { message: 'Cleaning up the previous partial build…' })
          const { error: edgeCleanupErr } = await supabase.from('edges').delete().eq('brief_id', id)
          if (edgeCleanupErr) throw new Error(`Partial edge cleanup failed: ${edgeCleanupErr.message}`)
          const { error: nodeCleanupErr } = await supabase.from('nodes').delete().eq('brief_id', id)
          if (nodeCleanupErr) throw new Error(`Partial node cleanup failed: ${nodeCleanupErr.message}`)
        }

        await supabase.from('briefs').update({ status: 'building' }).eq('id', id)
        send('progress', { message: 'Starting…' })

        // Load recipe YAML from DB
        const { data: recipe, error: recipeErr } = await supabase
          .from('recipes')
          .select('source_yaml')
          .eq('id', brief.recipe_id)
          .single()

        if (recipeErr) {
          console.error('[build] recipe fetch error:', recipeErr)
          throw new Error(`Recipe fetch failed: ${recipeErr.message}`)
        }

        if (!recipe?.source_yaml) {
          console.error('[build] recipe not found for id:', brief.recipe_id)
          throw new Error('Recipe not found')
        }

        console.log('[build] starting buildMap for brief:', id)
        await buildMap({
          briefId: id,
          brand: brief.brand ?? '',
          role: brief.role ?? 'agency',
          brief_type: brief.goal ?? brief.brief_type ?? '',
          brief_raw: brief.brief_raw ?? '',
          recipeYaml: recipe.source_yaml,
          nodeKeys: Array.isArray(brief.node_keys) ? brief.node_keys as string[] : undefined,
          supabase,
          onProgress: (msg) => {
            console.log('[build] progress:', msg)
            send('progress', { message: msg })
          },
        })

        console.log('[build] buildMap complete for brief:', id)
        // Mark brief as built
        await supabase.from('briefs').update({ status: 'built' }).eq('id', id)

        send('build_complete', { briefId: id })
      } catch (err) {
        console.error('[build] error:', err)
        await supabase.from('briefs').update({ status: 'failed' }).eq('id', id)
        send('build_error', { error: String(err) })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

import { redirect } from 'next/navigation'
import { readFileSync } from 'fs'
import { join } from 'path'
import { createClient } from '@/lib/supabase/server'
import { RecipeStudio } from '@/components/recipe/RecipeStudio'

export default async function RecipeStudioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/sign-in')
  const source = readFileSync(join(process.cwd(), 'brief-recipe-v1.yaml'), 'utf8')
  return <RecipeStudio initialYaml={source} />
}

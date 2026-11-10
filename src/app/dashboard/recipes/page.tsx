import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RecipeStudio } from '@/components/recipe/RecipeStudio'
import { getDefaultRecipeYaml } from '@/lib/recipe/loader'

export default async function RecipeStudioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/sign-in')
  return <RecipeStudio initialYaml={getDefaultRecipeYaml()} />
}

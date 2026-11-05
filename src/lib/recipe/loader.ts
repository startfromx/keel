import { parse } from 'yaml'
import { readFileSync } from 'fs'
import { join } from 'path'

export interface RecipeStatus {
  label: string
  meaning: string
}

export interface RecipeDoor {
  key: string
  label: string
  order: number
  color: string
}

export interface RecipeNodeDef {
  key: string
  label: string
  door: string
  requires?: string[]
  optional?: string[]
  provides: string
  schema: Record<string, unknown>
  status_rules: Record<string, string>
  prompt: string
  research_allowed?: boolean
  repeatable?: boolean
  default_status?: string
  only_when?: string
  shareable?: boolean
  checks?: string[]
  rules?: string
}

export interface RecipeTest {
  name: string
  role: string
  brand: string
  brief_raw: string
  expect: string[]
}

export interface Recipe {
  recipe: {
    module: string
    version: string
    status: string
    title: string
    description: string
    depends_on: string[]
  }
  statuses: Record<string, RecipeStatus>
  rules: Record<string, string>
  voice: Record<string, string>
  doors: RecipeDoor[]
  intake: {
    provides: string[]
    build_prompt: string
  }
  nodes: RecipeNodeDef[]
  threads: {
    context: string
    prompt: string
    quick_actions: string[]
  }
  tests: RecipeTest[]
}

export function parseRecipe(yaml: string): Recipe {
  return parse(yaml) as Recipe
}

/** Load recipe from the filesystem. For tests and local dev only — not for Cloudflare Workers. */
export function loadRecipeFromFile(path?: string): Recipe {
  const filePath = path ?? join(process.cwd(), 'brief-recipe-v1.yaml')
  return parseRecipe(readFileSync(filePath, 'utf8'))
}

export function getNodeDef(recipe: Recipe, key: string): RecipeNodeDef | undefined {
  return recipe.nodes.find(n => n.key === key)
}

export function getNodesByDoor(recipe: Recipe, door: string): RecipeNodeDef[] {
  return recipe.nodes.filter(n => n.door === door)
}

export function getDoorOrder(recipe: Recipe): string[] {
  return [...recipe.doors].sort((a, b) => a.order - b.order).map(d => d.key)
}

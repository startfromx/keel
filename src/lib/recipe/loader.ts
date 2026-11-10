import { parse } from 'yaml'
import { readFileSync } from 'fs'
import { join } from 'path'
import { DEFAULT_RECIPE_YAML } from './defaultRecipe'

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

export interface StarterGraph {
  key: string
  label: string
  description: string
  node_keys: string[]
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
  starter_graphs: StarterGraph[]
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
  if (!path) return parseRecipe(DEFAULT_RECIPE_YAML)
  return parseRecipe(readFileSync(path, 'utf8'))
}

export function getDefaultRecipeYaml(): string {
  return DEFAULT_RECIPE_YAML
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

export function getStarterGraph(recipe: Recipe, key: string): StarterGraph | undefined {
  return recipe.starter_graphs?.find(g => g.key === key)
}

/** All non-output node types — the composable palette. */
export function getNodePalette(recipe: Recipe): RecipeNodeDef[] {
  return recipe.nodes.filter(n => n.door !== 'outputs')
}

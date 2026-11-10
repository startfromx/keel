import Anthropic from '@anthropic-ai/sdk'
import type { RecipeNodeDef } from '@/lib/recipe/loader'

const COMPOSE_MODEL = process.env.COMPOSE_MODEL ?? 'claude-haiku-4-5-20251001'

const SYSTEM_PROMPT = `You are a composition assistant for a brief-mapping tool used by marketers.

The tool has a library of node types — each node is a named analytical task (e.g. "Market facts", "Business problem", "Single message"). Nodes connect through what they provide and require.

Given the user's stated goal, select the minimal but sufficient set of nodes from the library that would help them reach that goal.

Rules:
- Include only nodes genuinely relevant to the stated goal
- Omit nodes that add no value for this particular goal type
- Order them: research/context first, then analysis, then synthesis
- Select between 4 and 10 nodes
- Never invent node keys — only use keys that appear in the provided library`

const SUGGEST_TOOL: Anthropic.Tool = {
  name: 'suggest_composition',
  description: 'Suggest an ordered list of node type keys suited to the stated goal',
  input_schema: {
    type: 'object' as const,
    properties: {
      node_keys: {
        type: 'array',
        items: { type: 'string' },
        description: 'Ordered list of node type keys from the library',
      },
    },
    required: ['node_keys'],
  },
}

export async function suggestComposition(
  goal: string,
  nodeLibrary: RecipeNodeDef[],
): Promise<string[]> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const libraryText = nodeLibrary
    .map(n => `- key: "${n.key}" | label: "${n.label}" | door: ${n.door}`)
    .join('\n')

  const response = await client.messages.create({
    model: COMPOSE_MODEL,
    max_tokens: 512,
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: `Goal: ${goal}\n\nAvailable nodes:\n${libraryText}` }],
    tools: [SUGGEST_TOOL],
    tool_choice: { type: 'tool', name: 'suggest_composition' },
  })

  const toolUse = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
  )
  if (!toolUse) throw new Error('No composition suggestion returned')

  const result = toolUse.input as { node_keys?: string[] }
  const keys = result.node_keys ?? []

  // Guard: only return keys that exist in the library
  const validKeys = new Set(nodeLibrary.map(n => n.key))
  return keys.filter(k => validKeys.has(k))
}
